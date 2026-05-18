/**
 * swarm-orchestrator — Truth Engine Swarm Orchestrator
 * ADR-V11-005 · Sprint B1.6
 *
 * Invocado via cron pg_cron a cada 5 minutos.
 * Lógica:
 *   1. Busca workers idle (máx 5 em paralelo no MVP)
 *   2. Para cada worker idle: chama RPC swarm_claim_next_niche
 *   3. Se niche devolvido: cria swarm_runs row + invoca swarm-worker-jina (fire-and-forget)
 *   4. Marca workers stuck (sem heartbeat >10min) como 'idle' para reutilização
 *
 * Auth: verify_jwt=false (chamado por pg_cron internamente)
 * CORS: não aplicável (server-to-server)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// MVP cap: máximo de workers em paralelo por workspace
const MAX_PARALLEL_WORKERS = 5;

// Timeout para considerar worker stuck
const STUCK_THRESHOLD_MINUTES = 10;

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      db: { schema: "system" },
    });

    const results: Record<string, unknown>[] = [];
    const errors: string[] = [];

    // --- Passo 1: Marcar workers stuck como idle ---
    const stuckCutoff = new Date(
      Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000
    ).toISOString();

    const { data: stuckWorkers, error: stuckErr } = await supabase
      .from("swarm_workers")
      .select("id")
      .eq("status", "running")
      .lt("last_heartbeat", stuckCutoff);

    if (stuckErr) {
      errors.push(`stuck_query: ${stuckErr.message}`);
    } else if (stuckWorkers && stuckWorkers.length > 0) {
      const stuckIds = stuckWorkers.map((w) => w.id);

      // Marcar runs destes workers como timeout
      await supabase
        .from("swarm_runs")
        .update({
          status: "timeout",
          ended_at: new Date().toISOString(),
          error: "worker_stuck_no_heartbeat",
        })
        .in("worker_id", stuckIds)
        .eq("status", "running");

      // Reset workers para idle
      const { error: resetErr } = await supabase
        .from("swarm_workers")
        .update({
          status: "idle",
          current_niche_id: null,
          current_run_id: null,
          current_tool: null,
          current_action: null,
          current_turn: 0,
        })
        .in("id", stuckIds);

      if (resetErr) {
        errors.push(`stuck_reset: ${resetErr.message}`);
      } else {
        results.push({ action: "reset_stuck", workers: stuckIds });
      }
    }

    // --- Passo 2: Buscar workers idle (cap MVP) ---
    const { data: idleWorkers, error: idleErr } = await supabase
      .from("swarm_workers")
      .select("id, kind, workspace_id")
      .eq("status", "idle")
      .limit(MAX_PARALLEL_WORKERS);

    if (idleErr) {
      return Response.json(
        { ok: false, error: `idle_workers_query: ${idleErr.message}`, results, errors },
        { status: 500 }
      );
    }

    if (!idleWorkers || idleWorkers.length === 0) {
      return Response.json({
        ok: true,
        data: { message: "no_idle_workers", results, errors },
      });
    }

    // --- Passo 3: Para cada worker idle, claim niche e spawn worker ---
    for (const worker of idleWorkers) {
      try {
        // Claim atómico (RPC com SELECT FOR UPDATE SKIP LOCKED)
        // A RPC está em system.* — supabase-js usa schema do cliente
        const { data: niche, error: claimErr } = await supabase
          .rpc("swarm_claim_next_niche", {
            p_worker_id: worker.id,
            p_worker_kind: worker.kind,
          });

        if (claimErr) {
          errors.push(`claim_${worker.id}: ${claimErr.message}`);
          continue;
        }

        // A RPC pode devolver null puro OU um objecto com todos os campos null
        // quando nenhum niche está elegível — verificar niche.id explicitamente
        if (!niche || !niche.id) {
          results.push({ worker: worker.id, action: "no_niche_available" });
          continue;
        }

        // Criar run antes de invocar o worker
        const { data: run, error: runErr } = await supabase
          .from("swarm_runs")
          .insert({
            worker_id: worker.id,
            niche_id: niche.id,
            workspace_id: niche.workspace_id,
            status: "running",
          })
          .select("id")
          .single();

        if (runErr || !run) {
          errors.push(`create_run_${worker.id}: ${runErr?.message ?? "no run returned"}`);
          // Reset worker para idle se falhou a criar run
          await supabase
            .from("swarm_workers")
            .update({ status: "idle", current_niche_id: null })
            .eq("id", worker.id);
          continue;
        }

        // Actualizar worker com run_id
        await supabase
          .from("swarm_workers")
          .update({ current_run_id: run.id })
          .eq("id", worker.id);

        // Invocar swarm-worker-jina de forma assíncrona (fire-and-forget)
        // Não aguardamos resposta — o worker actualiza a BD directamente
        // Nota: functions.invoke usa cliente base (sem schema override) — OK
        supabase.functions
          .invoke("swarm-worker-jina", {
            body: {
              worker_id: worker.id,
              niche_id: niche.id,
              run_id: run.id,
            },
          })
          .catch((err: Error) => {
            console.error(`invoke_worker_${worker.id}:`, err.message);
          });

        results.push({
          worker: worker.id,
          niche: niche.slug,
          run_id: run.id,
          action: "spawned",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`worker_loop_${worker.id}: ${msg}`);
      }
    }

    return Response.json({
      ok: true,
      data: {
        spawned: results.filter((r) => r.action === "spawned").length,
        reset_stuck: results.filter((r) => r.action === "reset_stuck").length,
        results,
        errors,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("swarm-orchestrator fatal:", msg);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
});
