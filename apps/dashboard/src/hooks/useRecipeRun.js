// useRecipeRun — cria + acompanha execução de uma recipe.
// Inicia INSERT em system.recipe_runs + N steps em system.recipe_run_steps.
// Polling 2s para acompanhar status em tempo real.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Steps cujo handler vive em v2-quota-extra-step edge function
const EDGE_FN_STEPS = new Set([
  'parse-xlsx-carregadores',
  'diff-leituras-carregadores',
  'calcular-quota-extra-carregadores',
  'validar-cobertura-fracoes',
  'v2-ingest-carregadores',
  'emit-quota-extra',
  'auditar-conta-corrente-pos-emissao',
])

// Map step_number → skill_name (1ª skill da step) para a recipe carregadores
function getEdgeFnSkillForStep(step) {
  if (!step || step.step_type !== 'agent') return null
  if (!Array.isArray(step.skills) || step.skills.length === 0) return null
  const skill = step.skills[0]
  return EDGE_FN_STEPS.has(skill) ? skill : null
}

// Construir params para a edge function a partir do estado do run
function buildEdgeFnParams(skillName, run, allSteps) {
  const inputs = run?.inputs_jsonb || {}
  const step1 = allSteps.find((s) => s.step_number === 1)
  const step6 = allSteps.find((s) => s.step_number === 6)
  const step9 = allSteps.find((s) => s.step_number === 9)
  switch (skillName) {
    case 'parse-xlsx-carregadores': {
      // A edge function lê de Storage: precisa de bucket + object path (sem prefixo de bucket).
      // inputs.xlsx_carregadores_path vem como "condo-uploads/recipes/…". Separar.
      const raw = inputs.xlsx_carregadores_path || ''
      let bucket = 'condo-uploads', objectPath = raw
      const slash = raw.indexOf('/')
      if (slash > 0) { bucket = raw.slice(0, slash); objectPath = raw.slice(slash + 1) }
      return {
        xlsx_url: inputs.xlsx_url || undefined,
        xlsx_storage_bucket: bucket,
        xlsx_storage_path: objectPath,
      }
    }
    case 'diff-leituras-carregadores':
      // handleDiff espera { rows } — usa as linhas parseadas no Step 1
      return { rows: step1?.output_jsonb?.rows ?? inputs.ingest_rows ?? [] }
    case 'calcular-quota-extra-carregadores':
      return {
        data_anterior: inputs.data_anterior,
        data_actual: inputs.data_actual,
        preco_kwh: inputs.preco_kwh ?? 0.1861,
      }
    case 'validar-cobertura-fracoes':
      return {
        data_anterior: inputs.data_anterior,
        data_actual: inputs.data_actual,
        preview_avisos: step6?.output_jsonb?.preview_avisos ?? [],
      }
    case 'v2-ingest-carregadores': {
      // Ingere SÓ as datas novas detectadas no Step 2 (diff) — nunca força data_actual.
      const step2 = allSteps.find((s) => s.step_number === 2)
      const datasNovas = step2?.output_jsonb?.diff?.datas_novas_xlsx ?? null
      return {
        rows: inputs.ingest_rows ?? step1?.output_jsonb?.rows ?? [],
        so_datas: datasNovas,
      }
    }
    case 'emit-quota-extra':
      return {
        data_anterior: inputs.data_anterior,
        data_actual: inputs.data_actual,
        descricao: inputs.descricao || 'Eletricidade Carregadores',
        data_emissao: inputs.data_emissao,
      }
    case 'auditar-conta-corrente-pos-emissao':
      return {
        numeros_emitidos: step9?.output_jsonb?.numeros_emitidos ?? [],
      }
    default:
      return {}
  }
}

export function useRecipeRun(runId) {
  const [run, setRun] = useState(null)
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(false)
  const invokedRef = useRef(new Set())  // step_numbers já invocados nesta sessão

  // Polling 2s + auto-executor
  useEffect(() => {
    if (!runId || !supabase) return
    let cancelled = false

    async function tick() {
      const [{ data: runRow }, { data: stepRows }] = await Promise.all([
        supabase.schema('system').from('recipe_runs').select('*').eq('id', runId).maybeSingle(),
        supabase.schema('system').from('recipe_run_steps').select('*').eq('recipe_run_id', runId).order('step_number'),
      ])
      if (cancelled) return
      setRun(runRow)
      setSteps(stepRows || [])

      // Auto-executor: detectar step agent running com skill edge-fn
      if (runRow?.status === 'running' || runRow?.status === 'awaiting_approval') {
        for (const step of stepRows || []) {
          if (step.status !== 'running') continue
          const skill = getEdgeFnSkillForStep(step)
          if (!skill) continue
          // parse-xlsx só auto-executa quando o ficheiro está em Storage (Upload & Run / Discord).
          // Para paths locais G:\ (worker) ou fluxo manual, não disparar — preserva comportamento antigo.
          if (skill === 'parse-xlsx-carregadores') {
            const p = runRow?.inputs_jsonb?.xlsx_carregadores_path || ''
            const hasStorage = !!runRow?.inputs_jsonb?.xlsx_url ||
              p.startsWith('condo-uploads/') || /^[\w-]+\/recipes\//.test(p)
            if (!hasStorage) continue
          }
          // diff só auto-executa depois do parse ter produzido linhas
          if (skill === 'diff-leituras-carregadores') {
            const s1 = (stepRows || []).find((s) => s.step_number === 1)
            if (!s1?.output_jsonb?.rows) continue
          }
          if (invokedRef.current.has(step.step_number)) continue

          // Evitar invocação se já tem output (já executou)
          if (step.output_jsonb && step.completed_at) continue

          invokedRef.current.add(step.step_number)
          const params = buildEdgeFnParams(skill, runRow, stepRows || [])
          console.log(`[auto-exec] Step ${step.step_number} (${skill}) →`, params)

          // Fire-and-forget; o resultado aparece no próximo polling
          supabase.functions.invoke('v2-quota-extra-step', {
            body: {
              recipe_run_id: runId,
              step_number: step.step_number,
              step_name: skill,
              params,
            },
          }).then(({ data, error }) => {
            if (error) {
              console.error(`[auto-exec] Step ${step.step_number} falhou:`, error)
              // Permitir retry: libertar lock
              invokedRef.current.delete(step.step_number)
            } else {
              console.log(`[auto-exec] Step ${step.step_number} concluído:`, data)
              // Activar próximo step (handler na edge function já marca completed)
              activateNextStep(runId, step.step_number).catch((e) =>
                console.error(`[auto-exec] activate next step falhou:`, e)
              )
            }
          })
        }
      }
    }

    tick()
    const t = setInterval(tick, 2000)
    return () => { cancelled = true; clearInterval(t) }
  }, [runId])

  return { run, steps, loading }
}

async function fetchRunSteps(recipeRunId) {
  const { data, error } = await supabase
    .schema('system').from('recipe_run_steps')
    .select('*')
    .eq('recipe_run_id', recipeRunId)
    .order('step_number')
  if (error) throw error
  return data || []
}

async function activateNextStep(recipeRunId, stepNumber) {
  const steps = await fetchRunSteps(recipeRunId)
  const current = steps.find((s) => s.step_number === stepNumber)
  const currentOutput = current?.output_jsonb || {}

  if (stepNumber === 1 && currentOutput.file_changed === false) {
    await supabase.schema('system').from('recipe_runs').update({
      status: 'completed',
      current_step: stepNumber,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', recipeRunId)
    return
  }

  const next = steps.find((s) => s.step_number === stepNumber + 1)

  if (!next) {
    await supabase.schema('system').from('recipe_runs').update({
      status: 'completed',
      current_step: stepNumber,
      completed_at: new Date().toISOString(),
    }).eq('id', recipeRunId)
    return
  }

  const nextStatus = next.step_type === 'human' ? 'awaiting_approval' : 'running'
  const now = new Date().toISOString()

  await supabase.schema('system').from('recipe_run_steps').update({
    status: nextStatus,
    started_at: now,
  }).eq('recipe_run_id', recipeRunId).eq('step_number', next.step_number)

  await supabase.schema('system').from('recipe_runs').update({
    status: nextStatus === 'awaiting_approval' ? 'awaiting_approval' : 'running',
    current_step: next.step_number,
  }).eq('id', recipeRunId)
}

// Cria run + N steps a partir de recipe + inputs
export async function createRecipeRun(recipe, inputs, triggered_by = 'mario') {
  if (!supabase) throw new Error('Supabase não configurado')
  if (!recipe?.id || !Array.isArray(recipe.steps)) throw new Error('Recipe inválida')

  // 1. Cria run
  const { data: runRow, error: e1 } = await supabase
    .schema('system').from('recipe_runs')
    .insert({
      recipe_id: recipe.id,
      recipe_slug: recipe.slug,
      condominio_id: inputs?.codigo || null,
      status: 'running',
      inputs_jsonb: inputs || {},
      triggered_by,
      current_step: 1,
    })
    .select('*')
    .single()
  if (e1) throw e1

  // 2. Cria 1 step row por step na recipe
  const stepRows = recipe.steps.map((s, i) => ({
    recipe_run_id: runRow.id,
    step_number:   i + 1,
    step_name:     s.name,
    step_type:     s.type || 'agent',
    agent:         s.employee_id || recipe.employee_id || null,
    skills:        Array.isArray(s.skills) ? s.skills : (s.skill_tag ? [s.skill_tag] : []),
    status:        i === 0 ? 'running' : 'pending',
    started_at:    i === 0 ? new Date().toISOString() : null,
  }))

  const { error: e2 } = await supabase
    .schema('system').from('recipe_run_steps')
    .insert(stepRows)
  if (e2) throw e2

  return runRow
}

// Concluir step manualmente durante testes acompanhados
export async function completeStep(recipeRunId, stepNumber, completedBy = 'mario') {
  if (!supabase) return
  const now = new Date()
  const steps = await fetchRunSteps(recipeRunId)
  const current = steps.find((s) => s.step_number === stepNumber)
  const startedAt = current?.started_at ? new Date(current.started_at) : null
  const durationMs = startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null

  const patch = {
    status: 'completed',
    completed_at: now.toISOString(),
    output_jsonb: {
      ...(current?.output_jsonb || {}),
      manual_review: true,
      completed_by: completedBy,
      completed_at: now.toISOString(),
      note: 'Step marcado como concluido manualmente no dashboard.',
    },
  }
  if (durationMs != null) patch.duration_ms = durationMs

  await supabase.schema('system').from('recipe_run_steps').update(patch)
    .eq('recipe_run_id', recipeRunId).eq('step_number', stepNumber)

  await activateNextStep(recipeRunId, stepNumber)
}

// Falhar step manualmente durante testes acompanhados
export async function failStep(recipeRunId, stepNumber, reason = '') {
  if (!supabase) return
  const now = new Date()
  const steps = await fetchRunSteps(recipeRunId)
  const current = steps.find((s) => s.step_number === stepNumber)
  const startedAt = current?.started_at ? new Date(current.started_at) : null
  const durationMs = startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null

  const patch = {
    status: 'failed',
    completed_at: now.toISOString(),
    output_jsonb: {
      ...(current?.output_jsonb || {}),
      manual_review: true,
      failed_at: now.toISOString(),
      error: reason || 'Step marcado como falhado manualmente no dashboard.',
    },
  }
  if (durationMs != null) patch.duration_ms = durationMs

  await supabase.schema('system').from('recipe_run_steps').update(patch)
    .eq('recipe_run_id', recipeRunId).eq('step_number', stepNumber)

  await supabase.schema('system').from('recipe_runs').update({
    status: 'failed',
    completed_at: now.toISOString(),
    error_message: `Step ${stepNumber} falhou: ${reason || 'sem motivo indicado'}`,
  }).eq('id', recipeRunId)
}

// Aprovar step humano
export async function approveStep(recipeRunId, stepNumber, approvedBy = 'mario') {
  if (!supabase) return
  const steps = await fetchRunSteps(recipeRunId)
  const current = steps.find((s) => s.step_number === stepNumber)
  const approvalSummary = current?.output_jsonb?.approval_summary || {}
  const ifApproved = current?.output_jsonb?.if_approved || {}
  const shouldStopAfterApproval =
    current?.step_type === 'human' &&
    ifApproved.writes_expected === 0

  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'completed',
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }).eq('recipe_run_id', recipeRunId).eq('step_number', stepNumber)

  if (shouldStopAfterApproval) {
    await supabase.schema('system').from('recipe_run_steps').update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
      output_jsonb: {
        skipped_reason: 'Sem movimentos novos/sem writes esperados apos aprovacao humana.',
      },
    }).eq('recipe_run_id', recipeRunId).gt('step_number', stepNumber).eq('status', 'pending')

    await supabase.schema('system').from('recipe_runs').update({
      status: 'completed',
      current_step: stepNumber,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', recipeRunId)
    return
  }

  await activateNextStep(recipeRunId, stepNumber)
}

// CHAIN síncrona: Step 5 submit → invoke Step 6 calcular → invoke Step 7 validar → Step 8 awaiting
// Robusto contra Vite HMR issues do auto-executor — chama edge function directamente.
export async function submitStep5AndChain(recipeRunId, configParams, submittedBy = 'mario') {
  if (!supabase) throw new Error('Supabase não configurado')
  const now = new Date().toISOString()

  // 1. Guardar inputs + marcar Step 5 completed + activar Step 6
  await submitStep5Config(recipeRunId, configParams, submittedBy)

  // 2. Invocar edge function para Step 6 (calcular)
  console.log('[chain] invocar Step 6 calcular…')
  const { data: r6, error: e6 } = await supabase.functions.invoke('v2-quota-extra-step', {
    body: {
      recipe_run_id: recipeRunId, step_number: 6,
      step_name: 'calcular-quota-extra-carregadores',
      params: {
        data_anterior: configParams.data_anterior,
        data_actual: configParams.data_actual,
        preco_kwh: Number(configParams.preco_kwh ?? 0.1861),
      },
    },
  })
  if (e6 || r6?.error) throw new Error(`Step 6 calcular: ${e6?.message || r6?.error}`)
  const previewAvisos = r6.output?.preview_avisos ?? []
  console.log(`[chain] Step 6 OK: ${previewAvisos.length} preview, total €${r6.output?.total_emitir}`)

  // 3. Activar Step 7 + invocar (validar)
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'running', started_at: new Date().toISOString(),
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 7)

  console.log('[chain] invocar Step 7 validar…')
  const { data: r7, error: e7 } = await supabase.functions.invoke('v2-quota-extra-step', {
    body: {
      recipe_run_id: recipeRunId, step_number: 7,
      step_name: 'validar-cobertura-fracoes',
      params: {
        data_anterior: configParams.data_anterior,
        data_actual: configParams.data_actual,
        preview_avisos: previewAvisos,
      },
    },
  })
  if (e7 || r7?.error) throw new Error(`Step 7 validar: ${e7?.message || r7?.error}`)
  console.log(`[chain] Step 7 OK:`, r7.output?.resumo)

  // 4. Activar Step 8 (Gate 2 humano awaiting)
  const t = new Date().toISOString()
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'awaiting_approval', started_at: t,
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 8)
  await supabase.schema('system').from('recipe_runs').update({
    status: 'awaiting_approval', current_step: 8,
  }).eq('id', recipeRunId)

  return { step6_output: r6.output, step7_output: r7.output }
}

// CHAIN síncrona: Step 8 approve → invoke Step 9 emit → skip Step 10 → invoke Step 11 audit → completed
// onProgress: callback opcional que recebe { phase, label, status, data? } para UI de progresso live
export async function emitStep8AndChain(recipeRunId, approvedBy = 'mario', onProgress) {
  if (!supabase) throw new Error('Supabase não configurado')
  const emit = (phase, label, status, data) => {
    try { onProgress?.({ phase, label, status, data, ts: Date.now() }) } catch {}
  }

  const { data: runRow } = await supabase.schema('system').from('recipe_runs').select('inputs_jsonb').eq('id', recipeRunId).maybeSingle()
  const inputs = runRow?.inputs_jsonb || {}

  // 1. Aprovar Step 8
  emit('step8', 'Gate 2 — Aprovar emissão', 'running')
  const now = new Date().toISOString()
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'completed', approved_by: approvedBy, approved_at: now, completed_at: now,
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 8)
  emit('step8', 'Gate 2 — Aprovado por Mário', 'done')

  // 2. Step 9 emit
  emit('step9', 'Step 9 — Invocar RPC portal_admin_emitir_quota_extra', 'running')
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'running', started_at: new Date().toISOString(),
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 9)

  const { data: r9, error: e9 } = await supabase.functions.invoke('v2-quota-extra-step', {
    body: {
      recipe_run_id: recipeRunId, step_number: 9, step_name: 'emit-quota-extra',
      params: {
        data_anterior: inputs.data_anterior, data_actual: inputs.data_actual,
        descricao: inputs.descricao || 'Eletricidade Carregadores',
        data_emissao: inputs.data_emissao,
      },
    },
  })
  if (e9 || r9?.error) {
    emit('step9', `Step 9 — Falhou: ${e9?.message || r9?.error}`, 'failed', { error: e9?.message || r9?.error })
    throw new Error(`Step 9 emit: ${e9?.message || r9?.error}`)
  }
  const nEmitidos = r9.output?.n_documentos ?? 0
  const numerosEmitidos = r9.output?.numeros_emitidos ?? []
  emit('step9', `Step 9 — ${nEmitidos} documentos emitidos em V2`, 'done', { n: nEmitidos, periodo: r9.output?.periodo })

  // 3. Skip Step 10
  emit('step10', 'Step 10 — Envio emails (skipped, próximo sprint)', 'skipped')
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'skipped', completed_at: new Date().toISOString(),
    output_jsonb: { skipped_reason: 'Envio email não implementado. Avisos emitidos em V2; emails podem ser enviados via portal V2.' },
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 10)

  // 4. Step 11 audit
  emit('step11', 'Step 11 — Conferir conta_corrente_2026', 'running')
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'running', started_at: new Date().toISOString(),
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 11)

  const { data: r11, error: e11 } = await supabase.functions.invoke('v2-quota-extra-step', {
    body: {
      recipe_run_id: recipeRunId, step_number: 11, step_name: 'auditar-conta-corrente-pos-emissao',
      params: {
        numeros_emitidos: numerosEmitidos,
        data_anterior: inputs.data_anterior,
        data_actual: inputs.data_actual,
      },
    },
  })
  if (e11 || r11?.error) {
    emit('step11', `Step 11 — Falhou: ${e11?.message || r11?.error}`, 'failed', { error: e11?.message || r11?.error })
    throw new Error(`Step 11 audit: ${e11?.message || r11?.error}`)
  }
  emit('step11', `Step 11 — ${r11.output?.ok ? 'Auditoria OK' : 'Divergências detectadas'}`, 'done', {
    n_validados: r11.output?.n_emitidos_hoje ?? r11.output?.n_validados,
    total: r11.output?.total_emitido,
  })

  // 5. Mark run completed
  await supabase.schema('system').from('recipe_runs').update({
    status: 'completed', completed_at: new Date().toISOString(), current_step: 11,
  }).eq('id', recipeRunId)
  emit('complete', 'Recipe concluída com sucesso', 'done', { n: nEmitidos })

  return { step9_output: r9.output, step11_output: r11.output }
}

// Guardar inputs de configuração (Step 5) e avançar para Step 6 (calcular)
// configParams: { data_anterior, data_actual, data_emissao, preco_kwh, descricao, periodo_referencia }
export async function submitStep5Config(recipeRunId, configParams, submittedBy = 'mario') {
  if (!supabase) throw new Error('Supabase não configurado')

  // 1. Obter inputs_jsonb actual e fazer merge
  const { data: runRow } = await supabase
    .schema('system').from('recipe_runs')
    .select('inputs_jsonb')
    .eq('id', recipeRunId)
    .maybeSingle()
  const merged = { ...(runRow?.inputs_jsonb || {}), ...configParams }

  // 2. UPDATE recipe_runs.inputs_jsonb + current_step
  await supabase.schema('system').from('recipe_runs').update({
    inputs_jsonb: merged,
    current_step: 6,
    status: 'running',
  }).eq('id', recipeRunId)

  // 3. Marcar Step 5 completed
  const now = new Date().toISOString()
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'completed',
    completed_at: now,
    approved_by: submittedBy,
    approved_at: now,
    output_jsonb: {
      configurado_em: now,
      configurado_por: submittedBy,
      inputs_seleccionados: configParams,
    },
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 5)

  // 4. Activar Step 6 (calcular — agent) → auto-executor vai chamar edge function
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'running',
    started_at: now,
  }).eq('recipe_run_id', recipeRunId).eq('step_number', 6)

  return merged
}

// Invocar edge function v2-quota-extra-step (server-side handler)
export async function invokeRecipeStep({ recipeRunId, stepNumber, stepName, params }) {
  if (!supabase) throw new Error('Supabase não configurado')

  const { data, error } = await supabase.functions.invoke('v2-quota-extra-step', {
    body: { recipe_run_id: recipeRunId, step_number: stepNumber, step_name: stepName, params },
  })
  if (error) throw new Error(`Edge function v2-quota-extra-step: ${error.message}`)
  if (data?.error) throw new Error(`Handler ${stepName}: ${data.error}`)
  return data
}

// Rejeitar step humano
export async function rejectStep(recipeRunId, stepNumber, reason = '') {
  if (!supabase) return
  await supabase.schema('system').from('recipe_run_steps').update({
    status: 'rejected',
    rejected_reason: reason,
    completed_at: new Date().toISOString(),
  }).eq('recipe_run_id', recipeRunId).eq('step_number', stepNumber)

  await supabase.schema('system').from('recipe_runs').update({
    status: 'rejected',
    completed_at: new Date().toISOString(),
    error_message: `Step ${stepNumber} rejeitado: ${reason}`,
  }).eq('id', recipeRunId)
}
