// _shared/agents/tools/equipamento.ts
// 4 tools para o agent v5.image_inspector:
//   equipamento_lookup                  — fuzzy-match via fn_match_existing_equipamento
//   equipamento_create                  — INSERT novo equipamento
//   equipamento_update                  — UPDATE com merge dados_ia + histórico sessões
//   catalogo_search_servico_relevante   — busca serviços por texto livre
//
// CHECK constraints reais nas tabelas:
//   equipamentos.categoria (14 valores) — ver VALID_EQUIPAMENTO_CATEGORIAS
//   catalogo_servicos.categoria (8 val) — ver VALID_SERVICO_CATEGORIAS
// Validação feita no executor (defesa em profundidade além do enum no input_schema).

import type { AgentTool, AgentContext } from "../types.ts";

// ─── Constantes de validação ─────────────────────────────────────────────────

const VALID_EQUIPAMENTO_CATEGORIAS = new Set([
  "aquecimento", "climatizacao", "aguas_quentes", "canalizacao",
  "eletrica", "cobertura", "estrutura", "piscina", "solar",
  "elevador", "gerador", "eletrodomestico", "seguranca", "outros",
]);

const VALID_SERVICO_CATEGORIAS = new Set([
  "limpeza", "manutencao", "jardim", "piscina",
  "pintura", "eletrica", "canalizacao", "obra",
]);

const EQUIPAMENTO_CATS_LIST = [...VALID_EQUIPAMENTO_CATEGORIAS].join(" | ");
const SERVICO_CATS_LIST = [...VALID_SERVICO_CATEGORIAS].join(" | ");

function assertEquipamentoCategoria(cat: string): void {
  if (!VALID_EQUIPAMENTO_CATEGORIAS.has(cat)) {
    throw new Error(
      `Categoria de equipamento inválida: '${cat}'. Valores válidos: ${EQUIPAMENTO_CATS_LIST}`,
    );
  }
}

function assertServicoCategorias(cat: string): void {
  if (!VALID_SERVICO_CATEGORIAS.has(cat)) {
    throw new Error(
      `Categoria de serviço inválida: '${cat}'. Valores válidos: ${SERVICO_CATS_LIST}`,
    );
  }
}

function assertIdadeEstimada(dadosIA: Record<string, unknown>): void {
  if (
    dadosIA.data_instalacao_precisao === "estimated" &&
    dadosIA.idade_estimada_anos !== undefined
  ) {
    const v = Number(dadosIA.idade_estimada_anos);
    if (!Number.isInteger(v) || v < 0 || v > 50) {
      throw new Error(
        `idade_estimada_anos inválido: '${dadosIA.idade_estimada_anos}'. Deve ser inteiro entre 0 e 50. Se não consegues estimar, omite o campo.`,
      );
    }
  }
}

// ─── Definições das tools (enviadas à API Anthropic) ────────────────────────

export const EQUIPAMENTO_TOOLS: AgentTool[] = [
  {
    name: "equipamento_lookup",
    description:
      "Verifica se já existe um equipamento registado nesta localização com categoria e nome semelhantes. " +
      "Usar SEMPRE antes de equipamento_create para evitar duplicados. " +
      "Retorna lista de matches com score [0,1]: " +
      "score ≥ 0.6 = match forte → usar equipamento_update; " +
      "score 0.3–0.59 = possível duplicado → perguntar ao utilizador; " +
      "score < 0.3 ou lista vazia = novo equipamento → usar equipamento_create.",
    input_schema: {
      type: "object",
      properties: {
        localizacao_id: {
          type: "string",
          description: "UUID da localização (imóvel) onde foi tirada a foto.",
        },
        categoria: {
          type: "string",
          enum: [
            "aquecimento", "climatizacao", "aguas_quentes", "canalizacao",
            "eletrica", "cobertura", "estrutura", "piscina", "solar",
            "elevador", "gerador", "eletrodomestico", "seguranca", "outros",
          ],
          description: "Categoria do equipamento identificado na foto.",
        },
        nome: {
          type: "string",
          description: "Nome do equipamento (ex: 'Caldeira a gás', 'Ar condicionado split').",
        },
      },
      required: ["localizacao_id", "categoria", "nome"],
    },
  },
  {
    name: "equipamento_create",
    description:
      "Cria um novo registo de equipamento. " +
      "Usar APENAS depois de equipamento_lookup confirmar que não existe duplicado (score < 0.3 ou lista vazia). " +
      "O campo dados_ia deve conter a struct completa com foto_principal_path, data_instalacao_precisao, issues_detectados, etc. " +
      "NÃO incluir agente_inspecao_session_id nem agente_inspecao_em — são preenchidos automaticamente.",
    input_schema: {
      type: "object",
      properties: {
        localizacao_id: {
          type: "string",
          description: "UUID da localização (imóvel).",
        },
        categoria: {
          type: "string",
          enum: [
            "aquecimento", "climatizacao", "aguas_quentes", "canalizacao",
            "eletrica", "cobertura", "estrutura", "piscina", "solar",
            "elevador", "gerador", "eletrodomestico", "seguranca", "outros",
          ],
          description: "Categoria do equipamento.",
        },
        nome: {
          type: "string",
          description: "Nome descritivo do equipamento.",
        },
        dados_ia: {
          type: "object",
          description: "Struct completa dos dados detectados pela IA nesta sessão. NÃO incluir agente_inspecao_session_id nem agente_inspecao_em.",
          properties: {
            foto_principal_path: {
              type: "string",
              description: "Path da foto no bucket (fornecido no prompt — copiar exactamente).",
            },
            data_instalacao_precisao: {
              type: "string",
              enum: ["exact", "year_only", "estimated"],
              description: "Nível de certeza sobre a data de instalação.",
            },
            confianca_identificacao: {
              type: "string",
              enum: ["alta", "media", "baixa"],
              description: "Grau de certeza na identificação do equipamento.",
            },
            idade_estimada_anos: {
              type: "integer",
              minimum: 0,
              maximum: 50,
              description: "Estimativa de anos desde instalação. Preencher apenas se data_instalacao_precisao='estimated'.",
            },
            issues_detectados: {
              type: "array",
              items: { type: "string" },
              description: "Issues visíveis. Valores válidos: oxidacao|fuga_agua|fuga_gas|fissura|ferrugem|manchas|ruido_anormal|etiqueta_ilegivel|instalacao_irregular|outros:<desc>",
            },
          },
          required: ["foto_principal_path", "data_instalacao_precisao", "confianca_identificacao"],
          additionalProperties: true,
        },
        marca: { type: "string", description: "Marca detectada na etiqueta." },
        modelo: { type: "string", description: "Modelo detectado na etiqueta." },
        numero_serie: { type: "string", description: "Número de série da etiqueta. NÃO inventar — omitir se não for claramente legível. Fazer trim de whitespace." },
        localizacao_imovel: {
          type: "string",
          description: "Local dentro do imóvel em snake_case. Valores comuns: cozinha, casa_de_banho, sala, quartos, lavandaria, garagem, sotao, cave, exterior, jardim, telhado, hall. Outros valores aceites — usa snake_case.",
        },
        data_instalacao: {
          type: "string",
          description:
            "Data YYYY-MM-DD. Usar YYYY-01-01 se só o ano é conhecido. Omitir se estimado (usar dados_ia.idade_estimada_anos).",
        },
      },
      required: ["localizacao_id", "categoria", "nome", "dados_ia"],
    },
  },
  {
    name: "equipamento_update",
    description:
      "Actualiza um equipamento existente com novos dados detectados. " +
      "Usar quando equipamento_lookup encontrou match com score ≥ 0.6. " +
      "O campo dados_ia é um PATCH — será merged com os dados_ia existentes (a sessão anterior é arquivada no histórico). " +
      "NÃO incluir agente_inspecao_session_id nem agente_inspecao_em.",
    input_schema: {
      type: "object",
      properties: {
        equipamento_id: {
          type: "string",
          description: "UUID do equipamento (do resultado de equipamento_lookup).",
        },
        dados_ia: {
          type: "object",
          description: "Patch de dados — merged com dados_ia existente (sessão anterior arquivada no histórico). NÃO incluir agente_inspecao_session_id nem agente_inspecao_em.",
          properties: {
            foto_principal_path: {
              type: "string",
              description: "Path da foto no bucket (fornecido no prompt — copiar exactamente).",
            },
            data_instalacao_precisao: {
              type: "string",
              enum: ["exact", "year_only", "estimated"],
              description: "Nível de certeza sobre a data de instalação.",
            },
            confianca_identificacao: {
              type: "string",
              enum: ["alta", "media", "baixa"],
              description: "Grau de certeza na identificação do equipamento.",
            },
            idade_estimada_anos: {
              type: "integer",
              minimum: 0,
              maximum: 50,
              description: "Estimativa de anos desde instalação. Preencher apenas se data_instalacao_precisao='estimated'.",
            },
            issues_detectados: {
              type: "array",
              items: { type: "string" },
              description: "Issues visíveis. Valores válidos: oxidacao|fuga_agua|fuga_gas|fissura|ferrugem|manchas|ruido_anormal|etiqueta_ilegivel|instalacao_irregular|outros:<desc>",
            },
          },
          required: ["foto_principal_path", "data_instalacao_precisao", "confianca_identificacao"],
          additionalProperties: true,
        },
        marca: { type: "string", description: "Marca (só se detectada — caso contrário omitir)." },
        modelo: { type: "string", description: "Modelo (só se detectado)." },
        numero_serie: { type: "string", description: "Número de série (só se detectado). NÃO inventar — omitir se não for claramente legível. Fazer trim de whitespace." },
        localizacao_imovel: { type: "string", description: "Local dentro do imóvel em snake_case (só se identificado). Valores comuns: cozinha, casa_de_banho, sala, quartos, lavandaria, garagem, sotao, cave, exterior, jardim, telhado, hall." },
        data_instalacao: {
          type: "string",
          description: "Data YYYY-MM-DD ou YYYY-01-01 se só o ano é conhecido. Omitir se estimado.",
        },
      },
      required: ["equipamento_id", "dados_ia"],
    },
  },
  {
    name: "catalogo_search_servico_relevante",
    description:
      "Pesquisa serviços do catálogo V5 relevantes para problemas detectados na inspeção. " +
      "Retorna até 5 serviços com preço base, ordenados por relevância. " +
      "Usar após identificar issues no equipamento para recomendar serviços ao utilizador.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Texto livre descrevendo o problema (ex: 'revisão caldeira', 'limpeza filtros ar condicionado', 'infiltração tecto').",
        },
        categoria: {
          type: "string",
          enum: ["limpeza", "manutencao", "jardim", "piscina", "pintura", "eletrica", "canalizacao", "obra"],
          description:
            "Filtro por categoria de SERVIÇO (opcional — diferente das categorias de equipamentos). " +
            "Sugestão: aquecimento/climatizacao→'manutencao'; eletrica→'eletrica'; canalizacao→'canalizacao'; cobertura/estrutura→'obra'; piscina→'piscina'. " +
            "Omitir para eletrodomestico/outros.",
        },
      },
      required: ["query"],
    },
  },
];

// ─── Executors ───────────────────────────────────────────────────────────────

async function equipamento_lookup(
  input: { localizacao_id: string; categoria: string; nome: string },
  ctx: AgentContext,
): Promise<unknown> {
  assertEquipamentoCategoria(input.categoria);

  const { data, error } = await ctx.serviceRole
    .schema("v5_manutencao")
    .rpc("fn_match_existing_equipamento", {
      p_localizacao_id: input.localizacao_id,
      p_categoria: input.categoria,
      p_nome: input.nome,
    });
  if (error) throw new Error(error.message);
  return { matches: data ?? [] };
}

async function equipamento_create(
  input: {
    localizacao_id: string;
    categoria: string;
    nome: string;
    dados_ia: Record<string, unknown>;
    marca?: string;
    modelo?: string;
    numero_serie?: string;
    localizacao_imovel?: string;
    data_instalacao?: string;
  },
  ctx: AgentContext,
): Promise<unknown> {
  assertEquipamentoCategoria(input.categoria);
  assertIdadeEstimada(input.dados_ia);

  const dadosIA: Record<string, unknown> = {
    ...input.dados_ia,
    agente_inspecao_session_id: ctx.sessionId,
    agente_inspecao_em: new Date().toISOString(),
  };

  const { data, error } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("equipamentos")
    .insert({
      localizacao_id: input.localizacao_id,
      organization_id: ctx.organizationId,
      categoria: input.categoria,
      nome: input.nome,
      marca: input.marca ?? null,
      modelo: input.modelo ?? null,
      numero_serie: input.numero_serie ?? null,
      localizacao_imovel: input.localizacao_imovel ?? null,
      data_instalacao: input.data_instalacao ?? null,
      dados_ia: dadosIA,
    })
    .select("id, nome, categoria")
    .single();
  if (error) throw new Error(error.message);
  return { created: data };
}

async function equipamento_update(
  input: {
    equipamento_id: string;
    dados_ia: Record<string, unknown>;
    marca?: string;
    modelo?: string;
    numero_serie?: string;
    localizacao_imovel?: string;
    data_instalacao?: string;
  },
  ctx: AgentContext,
): Promise<unknown> {
  assertIdadeEstimada(input.dados_ia);

  // 1. Buscar row (inclui dados_ia para merge)
  const { data: eq } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("equipamentos")
    .select("id, localizacao_id, organization_id, dados_ia")
    .eq("id", input.equipamento_id)
    .maybeSingle();
  if (!eq) throw new Error("Equipamento não encontrado");

  // 2. Validar via localizacao_id → localizacoes (ground truth multi-tenancy)
  const { data: loc } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("localizacoes")
    .select("organization_id")
    .eq("id", eq.localizacao_id)
    .maybeSingle();
  if (!loc) throw new Error("Localização do equipamento não encontrada");

  // 3. Validar membership activa
  const { data: membership, error: memErr } = await ctx.serviceRole
    .schema("core")
    .from("memberships")
    .select("id")
    .eq("pessoa_id", ctx.pessoaId)
    .eq("organization_id", loc.organization_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (memErr) throw new Error(`Erro ao verificar acesso (${memErr.code}): ${memErr.message}`);
  if (!membership) throw new Error("Pessoa sem acesso a este equipamento");

  // 4. Defense in depth: inconsistência silenciosa
  if (eq.organization_id && eq.organization_id !== loc.organization_id) {
    throw new Error("Inconsistência: equipamento.organization_id ≠ localizacao.organization_id");
  }

  // 5. Merge dados_ia com histórico das últimas 10 sessões
  const existing = (eq.dados_ia ?? {}) as Record<string, unknown>;
  const history = Array.isArray(existing.agente_inspecao_history)
    ? (existing.agente_inspecao_history as Record<string, unknown>[])
    : [];

  const prevEntry: Record<string, unknown> = {};
  if (existing.agente_inspecao_session_id) {
    prevEntry.session_id = existing.agente_inspecao_session_id;
    prevEntry.em = existing.agente_inspecao_em;
    if (existing.foto_principal_path) prevEntry.foto_principal_path = existing.foto_principal_path;
  }
  const newHistory = Object.keys(prevEntry).length > 0
    ? [...history, prevEntry].slice(-10)
    : history;

  const mergedDadosIA: Record<string, unknown> = {
    ...existing,
    ...input.dados_ia,
    agente_inspecao_session_id: ctx.sessionId,
    agente_inspecao_em: new Date().toISOString(),
    agente_inspecao_history: newHistory,
  };

  // 6. Update parcial (só campos explicitamente passados)
  const updates: Record<string, unknown> = {
    dados_ia: mergedDadosIA,
    updated_at: new Date().toISOString(),
  };
  if (input.marca !== undefined) updates.marca = input.marca;
  if (input.modelo !== undefined) updates.modelo = input.modelo;
  if (input.numero_serie !== undefined) updates.numero_serie = input.numero_serie;
  if (input.localizacao_imovel !== undefined) updates.localizacao_imovel = input.localizacao_imovel;
  if (input.data_instalacao !== undefined) updates.data_instalacao = input.data_instalacao;

  // 7. UPDATE
  const { data: updated, error: updErr } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("equipamentos")
    .update(updates)
    .eq("id", input.equipamento_id)
    .select("id, nome, categoria")
    .single();
  if (updErr) throw new Error(updErr.message);
  return { updated };
}

async function catalogo_search_servico_relevante(
  input: { query: string; categoria?: string },
  ctx: AgentContext,
): Promise<unknown> {
  if (input.categoria) assertServicoCategorias(input.categoria);

  // Sanitize: remover chars especiais do PostgREST .or() filter
  const safeQuery = input.query.replace(/[%_,()]/g, " ").trim();

  let q = ctx.serviceRole
    .schema("v5_manutencao")
    .from("catalogo_servicos")
    .select("id, codigo, nome, categoria, descricao, preco_base")
    .eq("ativo", true);

  // eq() antes de .or() → WHERE categoria = X AND (nome ILIKE % OR descricao ILIKE %)
  if (input.categoria) {
    q = q.eq("categoria", input.categoria);
  }

  const { data, error } = await q
    .or(`nome.ilike.%${safeQuery}%,descricao.ilike.%${safeQuery}%`)
    .limit(10);
  if (error) throw new Error(error.message);

  // Ranking: matches no nome têm prioridade
  const qLower = safeQuery.toLowerCase();
  const sorted = (data ?? []).sort(
    (a: Record<string, string>, b: Record<string, string>) => {
      const aScore = a.nome.toLowerCase().includes(qLower) ? 0 : 1;
      const bScore = b.nome.toLowerCase().includes(qLower) ? 0 : 1;
      return aScore - bScore;
    },
  );

  return { servicos: sorted.slice(0, 5) };
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const equipamentoExecutors: Record<
  string,
  (input: any, ctx: AgentContext) => Promise<unknown>
> = {
  equipamento_lookup,
  equipamento_create,
  equipamento_update,
  catalogo_search_servico_relevante,
};
