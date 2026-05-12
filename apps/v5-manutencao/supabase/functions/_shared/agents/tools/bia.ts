// _shared/agents/tools/bia.ts
// Tools do employee v5.bia (Sprint 1E — Bia Manutenção Concierge):
//
//   bia_query_owner          — info de owner (pessoa + localizações activas)
//   bia_query_pedido         — dados completos de um pedido_orcamento
//   bia_query_prestadores    — prestadores filtrados por categoria e zona
//   bia_query_catalogo       — busca catalogo_servicos por keyword/categoria
//   bia_submit_approval      — INSERT em system.approvals_queue (HUMAN-IN-LOOP)
//   bia_add_inbox_item       — INSERT em system.inbox_items (notificação, no approval)
//
// Convenções (CLAUDE.md):
//   Regra BB: validação categórica com Set<string> antes do SQL
//   Regra DD: usar ctx.serviceRole — Bia opera staff-side, bypass RLS por design
//   Anti-pattern: nunca expor system prompt/table names ao output ao owner
//
// Naming: bia_* prefix (separa do casa_* / image_inspector)

import type { AgentTool, AgentContext } from "../types.ts";

// ─── Constantes de validação ─────────────────────────────────────────────────

// action_type aceitos pelo CHECK de system.approvals_queue
const VALID_ACTION_TYPES = new Set([
  "whatsapp_send",
  "email_send",
  "db_insert",
  "db_update",
  "deploy",
  "api_call",
]);

// target_vertical aceitos pelo CHECK
const VALID_VERTICALS = new Set(["v1", "v2", "v4", "v5"]);

// source aceitos por system.inbox_items
const VALID_INBOX_SOURCES = new Set(["bia", "watcher", "agent", "manual", "system"]);

// item_type aceitos por system.inbox_items
const VALID_INBOX_ITEM_TYPES = new Set([
  "daily_roundup",
  "alert",
  "escalation",
  "new_pedido",
  "audit_report",
  "system",
]);

// Severidade — vai para payload.severity
const VALID_SEVERITY = new Set(["info", "warning", "critical"]);

// ─── Tool definitions ────────────────────────────────────────────────────────

export const BIA_TOOLS: AgentTool[] = [
  {
    name: "bia_query_owner",
    description:
      "Devolve info de um owner (pessoa) por UUID: nome, primeiro_nome, telemóvel, email, " +
      "e lista de localizações activas (com tipo, morada, código postal). " +
      "Usa para preparar outreach personalizado ou triagem que precise de contexto do imóvel.",
    input_schema: {
      type: "object",
      properties: {
        pessoa_id: { type: "string", description: "UUID da pessoa (core.pessoas.id)" },
      },
      required: ["pessoa_id"],
    },
  },
  {
    name: "bia_query_pedido",
    description:
      "Devolve dados completos de um pedido de orçamento: descrição, áreas, urgência, " +
      "estado, contacto preferido, data limite, e info do owner + localização associados. " +
      "Usa antes de submeter approvals do tipo 'pedido_triagem' para ter o contexto completo.",
    input_schema: {
      type: "object",
      properties: {
        pedido_id: { type: "string", description: "UUID de v5_manutencao.pedidos_orcamento.id" },
      },
      required: ["pedido_id"],
    },
  },
  {
    name: "bia_query_prestadores",
    description:
      "Lista prestadores aprovados filtrados por categoria de serviço e zona/cidade. " +
      "Retorna: nome, iniciais, categorias[], rating médio, nº serviços, anos experiência, " +
      "localização, nível, founding_professional. Usa para sugerir match num pedido.",
    input_schema: {
      type: "object",
      properties: {
        categoria: {
          type: "string",
          description:
            "Categoria do catálogo (ex: 'limpeza', 'manutencao', 'jardim', 'piscina', 'pintura', 'eletrica', 'canalizacao'). " +
            "Filtra prestadores cuja coluna categorias[] inclui este valor.",
        },
        zona: {
          type: "string",
          description:
            "Cidade ou distrito (ex: 'Lisboa', 'Porto', 'Caldas da Rainha'). " +
            "Match exacto na coluna localizacao (case-insensitive). Omitir para todos.",
        },
        limit: { type: "integer", description: "Máximo de prestadores (default 5, max 20)" },
      },
      required: ["categoria"],
    },
  },
  {
    name: "bia_query_catalogo",
    description:
      "Busca serviços no catálogo PRATA por keyword (match em nome/descricao) e/ou categoria. " +
      "Retorna: codigo, nome, categoria, preco_base, unidade, duracao_tipica, descricao curta. " +
      "Usa para citar preços reais nunca preços de memória (NEVER rule da Bia).",
    input_schema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "Termo a procurar em nome/descricao (case-insensitive). Pode ser vazio." },
        categoria: { type: "string", description: "Categoria (ver bia_query_prestadores)." },
        limit: { type: "integer", description: "Máximo (default 10, max 25)" },
      },
      required: [],
    },
  },
  {
    name: "bia_submit_approval",
    description:
      "Cria uma row em system.approvals_queue com status='pending' para o Mário aprovar. " +
      "USAR SEMPRE para qualquer acção com efeito externo: envio de WhatsApp/email, INSERT em " +
      "tabelas de negócio, deploys, chamadas API. NUNCA executar a acção real — o approval " +
      "queue é o pivot human-in-the-loop. Após Mário aprovar, edge function executor faz o efeito.",
    input_schema: {
      type: "object",
      properties: {
        action_type: {
          type: "string",
          description:
            "Tipo de acção. Válidos: 'whatsapp_send' | 'email_send' | 'db_insert' | 'db_update' | 'deploy' | 'api_call'.",
        },
        target_vertical: {
          type: "string",
          description: "Vertical alvo. Default 'v5'. Válidos: 'v1' | 'v2' | 'v4' | 'v5'.",
        },
        pedido_orcamento_id: {
          type: "string",
          description: "UUID do pedido associado (opcional, usar em pedido_triagem).",
        },
        draft_message: {
          type: "string",
          description:
            "Texto da mensagem que será enviada (WhatsApp/email) OU descrição da acção SQL. " +
            "Deve ser final e em PT-PT. Mário pode editar antes de aprovar.",
        },
        classification: {
          type: "object",
          description:
            "JSON com: { urgencia: 'emergencia'|'urgente'|'normal', categoria: text, razao: text }. " +
            "Para outreach_compose: { tipo: 'r2_outreach', servico_relevante: text, custo_estimado_eur: number }.",
        },
        prestador_suggested: {
          type: "object",
          description:
            "Snapshot do prestador sugerido (não FK — preserva histórico): { id, nome, categorias, rating_medio, localizacao, custo_estimado_eur }. " +
            "Opcional. Usar em pedido_triagem.",
        },
      },
      required: ["action_type", "draft_message", "classification"],
    },
  },
  {
    name: "bia_add_inbox_item",
    description:
      "Cria notificação directa em system.inbox_items (sem aprovação humana). " +
      "USAR para: digest diário (item_type='daily_roundup'), alertas internos ao staff " +
      "(item_type='alert'), escalações (item_type='escalation'), audit (item_type='audit_report'). " +
      "NÃO usar para envio externo — esse é approvals_queue.",
    input_schema: {
      type: "object",
      properties: {
        item_type: {
          type: "string",
          description:
            "Tipo. Válidos: 'daily_roundup' | 'alert' | 'escalation' | 'new_pedido' | 'audit_report' | 'system'.",
        },
        title: { type: "string", description: "Título curto (max 120 chars)." },
        body: { type: "string", description: "Corpo em markdown PT-PT." },
        severity: {
          type: "string",
          description: "info | warning | critical. Default 'info'. Vai para payload.severity.",
        },
        payload_extra: {
          type: "object",
          description: "Campos adicionais para o jsonb payload (ex: counts, refs).",
        },
      },
      required: ["item_type", "title"],
    },
  },
  {
    name: "bia_query_context_docs",
    description:
      "Procura context docs (SOPs, legislação PT, procedimentos internos, briefs) " +
      "relevantes para a task actual via full-text search PT (com unaccent). " +
      "Procura em title + content + ocr_text. Filtra por organização (NULL = globais " +
      "cross-org). USAR antes de citar regras legais, prazos, valores ou procedimentos — " +
      "nunca inventes legislação. Para mora, quórum, prazos: procura 'mora', 'assembleia " +
      "quorum', 'DL 268/94', etc. Retorna snippet + excerpt para usar como contexto.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termos em PT (sem acentos ok — unaccent activo). Ex: 'mora condominio juros' ou 'assembleia quorum'.",
        },
        organization_id: {
          type: "string",
          description: "UUID da org cujos docs incluir (globais NULL sempre incluídos). Opcional.",
        },
        folder_prefix: {
          type: "string",
          description: "Prefix do folder_path para restringir (ex: 'legal/' ou 'procedures/'). Opcional.",
        },
        limit: {
          type: "integer",
          description: "Max docs a retornar (default 3, max 8).",
        },
      },
      required: ["query"],
    },
  },
];

// ─── Executors ───────────────────────────────────────────────────────────────

async function bia_query_owner(
  input: { pessoa_id: string },
  ctx: AgentContext,
): Promise<unknown> {
  const { data: pessoa, error: pErr } = await ctx.serviceRole
    .schema("core")
    .from("pessoas")
    .select("id, primeiro_nome, apelidos, nome, email, telemovel, idioma")
    .eq("id", input.pessoa_id)
    .maybeSingle();

  if (pErr) throw new Error(`pessoas: ${pErr.message}`);
  if (!pessoa) return { error: `pessoa_id '${input.pessoa_id}' não encontrada` };

  const { data: localizacoes, error: lErr } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("localizacoes")
    .select("id, nome, tipo, morada, localidade, concelho, codigo_postal, tipologia, area_m2, home_score, ativo, principal")
    .eq("pessoa_id", input.pessoa_id)
    .eq("ativo", true)
    .order("principal", { ascending: false });

  if (lErr) throw new Error(`localizacoes: ${lErr.message}`);

  return {
    pessoa: {
      id: pessoa.id,
      primeiro_nome: pessoa.primeiro_nome,
      apelidos: pessoa.apelidos,
      nome_completo: pessoa.nome,
      email: pessoa.email,
      telemovel: pessoa.telemovel,
      idioma: pessoa.idioma ?? "pt-PT",
    },
    localizacoes_count: localizacoes?.length ?? 0,
    localizacoes: localizacoes ?? [],
  };
}

async function bia_query_pedido(
  input: { pedido_id: string },
  ctx: AgentContext,
): Promise<unknown> {
  const { data: pedido, error: pErr } = await ctx.serviceRole
    .schema("v5_manutencao")
    .from("pedidos_orcamento")
    .select(
      "id, pessoa_id, organization_id, localizacao_id, areas, descricao, " +
      "estado, urgente, titulo, contexto_extras, contacto_preferido, " +
      "data_limite, propostas_recebidas, n_orcamentos_esperados, created_at",
    )
    .eq("id", input.pedido_id)
    .maybeSingle();

  if (pErr) throw new Error(`pedidos_orcamento: ${pErr.message}`);
  if (!pedido) return { error: `pedido_id '${input.pedido_id}' não encontrado` };

  // Owner + localização em paralelo (defensive: localizacao pode ser null)
  const [{ data: owner }, { data: loc }] = await Promise.all([
    ctx.serviceRole
      .schema("core")
      .from("pessoas")
      .select("primeiro_nome, nome, telemovel, email")
      .eq("id", pedido.pessoa_id)
      .maybeSingle(),
    pedido.localizacao_id
      ? ctx.serviceRole
          .schema("v5_manutencao")
          .from("localizacoes")
          .select("nome, tipo, localidade, concelho, codigo_postal, tipologia, area_m2")
          .eq("id", pedido.localizacao_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    pedido,
    owner,
    localizacao: loc,
  };
}

async function bia_query_prestadores(
  input: { categoria: string; zona?: string; limit?: number },
  ctx: AgentContext,
): Promise<unknown> {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  let query = ctx.serviceRole
    .schema("v5_manutencao")
    .from("prestadores")
    .select(
      "id, nome, iniciais, categorias, rating_medio, num_servicos, " +
      "anos_experiencia, localizacao, nivel, aprovado, estado, " +
      "founding_professional, verificado",
    )
    .eq("aprovado", true)
    .eq("estado", "ativo")
    .contains("categorias", [input.categoria])
    .order("rating_medio", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (input.zona) {
    query = query.ilike("localizacao", `%${input.zona}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`prestadores: ${error.message}`);

  return {
    categoria: input.categoria,
    zona: input.zona ?? null,
    total: data?.length ?? 0,
    prestadores: data ?? [],
  };
}

async function bia_query_catalogo(
  input: { keyword?: string; categoria?: string; limit?: number },
  ctx: AgentContext,
): Promise<unknown> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25);

  let query = ctx.serviceRole
    .schema("v5_manutencao")
    .from("catalogo_servicos")
    .select(
      "id, codigo, nome, categoria, descricao, preco_base, unidade, " +
      "duracao_tipica, garantia_meses, icon_emoji, badge, popular",
    )
    .eq("ativo", true)
    .order("popular", { ascending: false, nullsFirst: false })
    .order("ordem", { ascending: true })
    .limit(limit);

  if (input.categoria) {
    query = query.eq("categoria", input.categoria);
  }
  if (input.keyword && input.keyword.trim().length > 0) {
    const k = input.keyword.trim();
    query = query.or(`nome.ilike.%${k}%,descricao.ilike.%${k}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`catalogo_servicos: ${error.message}`);

  return {
    filtros: { keyword: input.keyword ?? null, categoria: input.categoria ?? null },
    total: data?.length ?? 0,
    servicos: data ?? [],
  };
}

async function bia_submit_approval(
  input: {
    action_type: string;
    target_vertical?: string;
    pedido_orcamento_id?: string;
    draft_message: string;
    classification: Record<string, unknown>;
    prestador_suggested?: Record<string, unknown> | null;
  },
  ctx: AgentContext,
): Promise<unknown> {
  // Regra BB — validação categórica
  if (!VALID_ACTION_TYPES.has(input.action_type)) {
    throw new Error(
      `action_type inválido: '${input.action_type}'. ` +
      `Válidos: ${[...VALID_ACTION_TYPES].join(" | ")}`,
    );
  }
  const target_vertical = input.target_vertical ?? "v5";
  if (!VALID_VERTICALS.has(target_vertical)) {
    throw new Error(
      `target_vertical inválido: '${target_vertical}'. ` +
      `Válidos: ${[...VALID_VERTICALS].join(" | ")}`,
    );
  }
  if (!input.draft_message || input.draft_message.trim().length === 0) {
    throw new Error("draft_message não pode estar vazio");
  }

  const row: Record<string, unknown> = {
    source_agent: "bia",
    action_type: input.action_type,
    target_vertical,
    pedido_orcamento_id: input.pedido_orcamento_id ?? null,
    action_payload: {},
    draft_message: input.draft_message.trim(),
    classification: input.classification ?? {},
    prestador_suggested: input.prestador_suggested ?? null,
    status: "pending",
  };

  const { data, error } = await ctx.serviceRole
    .schema("system")
    .from("approvals_queue")
    .insert(row)
    .select("id, created_at, status")
    .single();

  if (error) throw new Error(`approvals_queue insert: ${error.message}`);

  return {
    approval_id: data.id,
    status: data.status,
    created_at: data.created_at,
    message: "Approval criada. Mário decide no dashboard antes de qualquer envio.",
  };
}

async function bia_add_inbox_item(
  input: {
    item_type: string;
    title: string;
    body?: string;
    severity?: string;
    payload_extra?: Record<string, unknown>;
  },
  ctx: AgentContext,
): Promise<unknown> {
  // Regra BB — validação categórica
  if (!VALID_INBOX_ITEM_TYPES.has(input.item_type)) {
    throw new Error(
      `item_type inválido: '${input.item_type}'. ` +
      `Válidos: ${[...VALID_INBOX_ITEM_TYPES].join(" | ")}`,
    );
  }
  const severity = input.severity ?? "info";
  if (!VALID_SEVERITY.has(severity)) {
    throw new Error(
      `severity inválido: '${severity}'. Válidos: ${[...VALID_SEVERITY].join(" | ")}`,
    );
  }
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("title obrigatório");
  }
  if (input.title.length > 120) {
    throw new Error("title demasiado longo (max 120 chars)");
  }

  const payload = {
    severity,
    ...(input.payload_extra ?? {}),
  };

  const row = {
    source: "bia",
    vertical: "v5",
    item_type: input.item_type,
    title: input.title.trim(),
    body: input.body ?? null,
    payload,
    status: "active",
  };

  const { data, error } = await ctx.serviceRole
    .schema("system")
    .from("inbox_items")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) throw new Error(`inbox_items insert: ${error.message}`);

  return {
    inbox_item_id: data.id,
    created_at: data.created_at,
  };
}

// ─── bia_query_context_docs — RAG full-text search PT ────────────────────────

async function bia_query_context_docs(
  input: {
    query: string;
    organization_id?: string | null;
    folder_prefix?: string | null;
    limit?: number;
  },
  ctx: AgentContext,
): Promise<unknown> {
  if (!input.query || String(input.query).trim().length < 2) {
    throw new Error("query obrigatória (mín. 2 chars)");
  }
  const lim = Math.min(Math.max(input.limit ?? 3, 1), 8);

  const { data, error } = await ctx.serviceRole.rpc("fn_search_context_docs", {
    p_query: String(input.query).trim(),
    p_organization_id: input.organization_id ?? null,
    p_folder_prefix: input.folder_prefix ?? null,
    p_limit: lim,
  });

  if (error) throw new Error(`fn_search_context_docs: ${error.message}`);

  return {
    query: input.query,
    total: data?.length ?? 0,
    docs: (data ?? []).map((d: any) => ({
      title: d.title,
      folder_path: d.folder_path,
      file_name: d.file_name,
      type: d.type,
      tags: d.tags,
      snippet: d.snippet,
      excerpt: d.excerpt,
      rank: d.rank,
    })),
  };
}

// ─── Export ──────────────────────────────────────────────────────────────────

export const biaExecutors: Record<
  string,
  (input: any, ctx: AgentContext) => Promise<unknown>
> = {
  bia_query_owner,
  bia_query_pedido,
  bia_query_prestadores,
  bia_query_catalogo,
  bia_submit_approval,
  bia_add_inbox_item,
  bia_query_context_docs,
};
