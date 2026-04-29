// _shared/agents/tools/casa.ts
// Tools do agent v5.casa_advisor (Fase 1A):
//   casa_list_equipamentos — lista resumida dos equipamentos de uma localização
//
// Regra BB: validação categórica de inputs antes do SQL
// Regra DD: usa ctx.serviceRole (service_role), não supa (JWT user)
//
// NÃO incluir ai_resumo_markdown no output — é demasiado grande para context.
// Para detalhe de equipamento individual, usar futura tool casa_equipamento_detail.

import type { AgentTool, AgentContext } from "../types.ts";

// ─── Tool: casa_list_equipamentos ────────────────────────────────────────────

export const CASA_TOOLS: AgentTool[] = [
  {
    name: "casa_list_equipamentos",
    description:
      "Lista os equipamentos registados numa localização (imóvel) do utilizador. " +
      "Retorna resumo de cada equipamento: nome, marca, modelo, categoria, divisão, " +
      "idade estimada, issues detectados pela IA e se tem análise IA disponível. " +
      "Usar para responder a perguntas gerais sobre o estado da casa ou " +
      "para identificar equipamentos antes de recomendar manutenção. " +
      "NÃO retorna o texto completo da análise IA — use casa_equipamento_detail para isso.",
    input_schema: {
      type: "object",
      properties: {
        localizacao_id: {
          type: "string",
          description:
            "UUID da localização (imóvel) cujos equipamentos listar. " +
            "Obtém do contexto da sessão injectado pelo Edge Function.",
        },
      },
      required: ["localizacao_id"],
    },
  },
];

// ─── Executor ────────────────────────────────────────────────────────────────

async function casa_list_equipamentos(
  input: { localizacao_id: string },
  ctx: AgentContext,
): Promise<unknown> {
  // 1. Validar que a localização pertence à organização do utilizador
  const { data: loc, error: locErr } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("localizacoes")
    .select("id, organization_id, nome, tipo")
    .eq("id", input.localizacao_id)
    .maybeSingle();

  if (locErr) throw new Error(`Erro ao verificar localização: ${locErr.message}`);
  if (!loc) throw new Error(`Localização '${input.localizacao_id}' não encontrada.`);
  if (loc.organization_id !== ctx.organizationId) {
    throw new Error("Sem acesso a esta localização.");
  }

  // 2. Buscar equipamentos da localização
  // NOTE: equipamentos não têm soft delete. Lista todos da localização.
  // Se vier soft delete no futuro, adicionar coluna deleted_at e filtrar aqui.
  const { data: equipamentos, error: eqErr } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("equipamentos")
    .select(
      "id, nome, marca, modelo, categoria, estado, localizacao_imovel, " +
      "data_instalacao, data_proxima_revisao, health_score, dados_ia, ai_resumo_markdown",
    )
    .eq("localizacao_id", input.localizacao_id)
    .order("categoria");

  if (eqErr) throw new Error(`Erro ao listar equipamentos: ${eqErr.message}`);

  const hoje = new Date();

  const resumo = (equipamentos ?? []).map((eq: Record<string, unknown>) => {
    const dadosIA = (eq.dados_ia ?? {}) as Record<string, unknown>;
    const issues = Array.isArray(dadosIA.issues_detectados)
      ? (dadosIA.issues_detectados as string[])
      : [];

    // Calcular idade em anos a partir de data_instalacao
    let idadeAnos: number | null = null;
    if (typeof eq.data_instalacao === "string" && eq.data_instalacao) {
      const instalacao = new Date(eq.data_instalacao);
      if (!isNaN(instalacao.getTime())) {
        idadeAnos = Math.floor(
          (hoje.getTime() - instalacao.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
        );
      }
    }
    // Fallback: idade_estimada_anos dos dados_ia
    if (idadeAnos === null && typeof dadosIA.idade_estimada_anos === "number") {
      idadeAnos = dadosIA.idade_estimada_anos;
    }

    return {
      id: eq.id,
      nome: eq.nome,
      marca: eq.marca ?? null,
      modelo: eq.modelo ?? null,
      categoria: eq.categoria,
      estado: eq.estado ?? null,
      divisao: eq.localizacao_imovel ?? null,
      idade_anos: idadeAnos,
      data_proxima_revisao: eq.data_proxima_revisao ?? null,
      health_score: eq.health_score ?? null,
      confianca_ia: dadosIA.confianca_identificacao ?? null,
      issues_count: issues.length,
      issues: issues,
      tem_resumo_ia: typeof eq.ai_resumo_markdown === "string" && eq.ai_resumo_markdown.length > 0,
    };
  });

  return {
    localizacao: {
      id: loc.id,
      nome: loc.nome ?? null,
      tipo: loc.tipo ?? null,
    },
    total: resumo.length,
    equipamentos: resumo,
  };
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const casaExecutors: Record<
  string,
  (input: any, ctx: AgentContext) => Promise<unknown>
> = {
  casa_list_equipamentos,
};
