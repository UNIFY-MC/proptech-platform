-- =============================================================================
-- Migration: 202605240300_hermes_activity_source_6.sql
-- ADR-018 Phase 2A — Source 6 Hermes em core.activity_unified
--
-- Adiciona Source 6 = core.agent_audit_log WHERE agent_name LIKE 'hermes%'
-- à materialized view core.activity_unified para que interacções Hermes
-- apareçam no timeline cross-vertical (visível em CRM record detail page).
--
-- Sources actuais antes desta migration:
--   1. iam.activity_logs
--   2. system.tasks
--   3. v4_energia.facturas_uploaded
--   4. core.crm_interacoes
--   5. system.swarm_discoveries
--
-- Sources após esta migration:
--   1-5. (acima)
--   6. core.agent_audit_log WHERE agent_name ILIKE 'hermes%' [NOVO]
--
-- Adiciona também seed em system.agent_channels para Hermes (placeholder com
-- webhook_url=null — Mário preenche após setup Hermes server Hetzner).
--
-- Cron refresh-activity-unified (* * * * *) já existe e continua a refresh 1min.
--
-- REVERSÃO:
--   1. DROP MATERIALIZED VIEW core.activity_unified;
--   2. Recriar com definição original (5 sources)
--   3. Recriar 4 indexes
--   4. DELETE FROM system.agent_channels WHERE agent_id='hermes_executor';
--
-- Refs: ADR-018 D7 padrão 1+2 (Hermes orquestra/notifica), ADR-V11-005 Source 7 placeholder
-- =============================================================================

BEGIN;

-- =============================================================================
-- PARTE 1 — Recriar core.activity_unified com Source 6 (Hermes)
-- =============================================================================
-- PostgreSQL não suporta CREATE OR REPLACE MATERIALIZED VIEW.
-- Strategy: DROP + CREATE + recriar 4 indexes.

DROP MATERIALIZED VIEW IF EXISTS core.activity_unified;

CREATE MATERIALIZED VIEW core.activity_unified AS
-- Source 1: iam.activity_logs (login, permission grant/revoke)
SELECT gen_random_uuid() AS id,
    '00000000-0000-0000-0000-000000000001'::uuid AS workspace_id,
    ial.ts AS event_at,
    'iam.activity_logs'::text AS source,
    COALESCE(ial.vertical, 'system'::text) AS record_type,
    NULL::uuid AS record_id,
    ial.tipo AS event_type,
    'human'::text AS actor_type,
    NULL::uuid AS actor_id,
    NULL::text AS agent_slug,
    COALESCE(ial.extra_data, '{}'::jsonb) AS metadata,
    ial.detalhe AS subject,
    ial.resultado AS body_excerpt
FROM iam.activity_logs ial

UNION ALL

-- Source 2: system.tasks (missions/runtime)
SELECT st.id,
    '00000000-0000-0000-0000-000000000001'::uuid AS workspace_id,
    st.created_at AS event_at,
    'system.tasks'::text AS source,
    COALESCE(st.source_kind, 'system'::text) AS record_type,
    st.source_id AS record_id,
    ('task_'::text || st.status) AS event_type,
    CASE
        WHEN (st.owner_agent_id IS NOT NULL) THEN 'agent'::text
        ELSE 'human'::text
    END AS actor_type,
    st.owner_user_id AS actor_id,
    st.owner_agent_id AS agent_slug,
    jsonb_build_object('title', st.title, 'status', st.status, 'kind', st.kind, 'priority', st.priority, 'due_at', st.due_at) AS metadata,
    st.title AS subject,
    st.description_md AS body_excerpt
FROM system.tasks st

UNION ALL

-- Source 3: v4_energia.facturas_uploaded (OCR upload, simulador)
SELECT fu.id,
    '00000000-0000-0000-0000-000000000001'::uuid AS workspace_id,
    fu.created_at AS event_at,
    'v4_energia.facturas_uploaded'::text AS source,
    'pessoa'::text AS record_type,
    fu.pessoa_id AS record_id,
    ('factura_ocr_'::text || fu.ocr_status) AS event_type,
    'system'::text AS actor_type,
    fu.uploaded_by AS actor_id,
    NULL::text AS agent_slug,
    jsonb_build_object('file_path', fu.file_path, 'ocr_status', fu.ocr_status, 'ocr_confidence', fu.ocr_confidence) AS metadata,
    ('Fatura energia: '::text || fu.ocr_status) AS subject,
    NULL::text AS body_excerpt
FROM v4_energia.facturas_uploaded fu
WHERE ((fu.pessoa_id IS NOT NULL) AND (fu.apagado_em IS NULL))

UNION ALL

-- Source 4: core.crm_interacoes (call/email/note manual)
SELECT ci.id,
    '00000000-0000-0000-0000-000000000001'::uuid AS workspace_id,
    ci.created_at AS event_at,
    'core.crm_interacoes'::text AS source,
    'pessoa'::text AS record_type,
    ci.pessoa_id AS record_id,
    ('interacao_'::text || ci.tipo) AS event_type,
    'human'::text AS actor_type,
    NULL::uuid AS actor_id,
    NULL::text AS agent_slug,
    jsonb_build_object('tipo', ci.tipo, 'resultado', ci.resultado, 'data', ci.data_interacao, 'descricao', ci.descricao) AS metadata,
    ((ci.tipo || ': '::text) || COALESCE(ci.descricao, ''::text)) AS subject,
    ci.resultado AS body_excerpt
FROM core.crm_interacoes ci
WHERE (ci.pessoa_id IS NOT NULL)

UNION ALL

-- Source 5: system.swarm_discoveries (Truth Engine matched a records)
SELECT sd.id,
    sd.workspace_id,
    sd.created_at AS event_at,
    'system.swarm_discoveries'::text AS source,
    CASE
        WHEN (sd.empresa_id IS NOT NULL) THEN 'empresa'::text
        WHEN (sd.pessoa_id IS NOT NULL) THEN 'pessoa'::text
        WHEN (sd.imovel_id IS NOT NULL) THEN 'imovel'::text
        ELSE NULL::text
    END AS record_type,
    COALESCE(sd.empresa_id, sd.pessoa_id, sd.imovel_id) AS record_id,
    ('swarm_'::text || sd.kind) AS event_type,
    'agent'::text AS actor_type,
    NULL::uuid AS actor_id,
    'truth-engine'::text AS agent_slug,
    jsonb_build_object('niche_id', sd.niche_id, 'kind', sd.kind, 'significance', sd.significance, 'source_url', sd.source_url) AS metadata,
    sd.title AS subject,
    "left"(sd.summary, 200) AS body_excerpt
FROM system.swarm_discoveries sd
WHERE ((sd.empresa_id IS NOT NULL) OR (sd.pessoa_id IS NOT NULL) OR (sd.imovel_id IS NOT NULL))

UNION ALL

-- Source 6: core.agent_audit_log WHERE agent_name LIKE 'hermes%' [NOVO ADR-018 Phase 2A]
-- Captura interacções Hermes Agent (Nous Research) → CookAI via hermes-invoke-recipe EF
-- pessoa_id é usado como record_id (Hermes pode actuar em nome de pessoa específica)
SELECT aal.id,
    '00000000-0000-0000-0000-000000000001'::uuid AS workspace_id,
    aal.created_at AS event_at,
    'core.agent_audit_log.hermes'::text AS source,
    CASE
        WHEN (aal.pessoa_id IS NOT NULL) THEN 'pessoa'::text
        WHEN (aal.organization_id IS NOT NULL) THEN 'empresa'::text
        ELSE 'system'::text
    END AS record_type,
    COALESCE(aal.pessoa_id, aal.organization_id) AS record_id,
    ('hermes_'::text || COALESCE(aal.tool_name, aal.stop_reason, 'invoke')) AS event_type,
    'agent'::text AS actor_type,
    NULL::uuid AS actor_id,
    aal.agent_name AS agent_slug,
    jsonb_build_object(
        'tool', aal.tool_name,
        'session_id', aal.session_id,
        'iteration', aal.iteration,
        'cost_eur', aal.cost_eur,
        'duration_ms', aal.duration_ms,
        'model', aal.model,
        'required_approval', aal.required_approval,
        'error', COALESCE(aal.tool_error, aal.error)
    ) AS metadata,
    COALESCE(LEFT(aal.objective, 120), aal.tool_name, 'Hermes invoke'::text) AS subject,
    LEFT(COALESCE(aal.tool_output::text, aal.error, ''::text), 200) AS body_excerpt
FROM core.agent_audit_log aal
WHERE aal.agent_name ILIKE 'hermes%';


-- =============================================================================
-- PARTE 2 — Recriar 4 indexes (preservados da versão original)
-- =============================================================================

CREATE INDEX idx_activity_unified_workspace
    ON core.activity_unified USING btree (workspace_id, event_at DESC);

CREATE INDEX idx_activity_unified_record
    ON core.activity_unified USING btree (record_type, record_id, event_at DESC);

CREATE INDEX idx_activity_unified_source
    ON core.activity_unified USING btree (source, event_at DESC);

CREATE INDEX idx_activity_unified_event_type
    ON core.activity_unified USING btree (event_type, workspace_id);


-- =============================================================================
-- PARTE 3 — Refresh inicial (popular com dados existentes)
-- =============================================================================
-- Cron `refresh-activity-unified` (* * * * *) já existe e vai refresh automaticamente
-- a cada minuto. Refresh manual aqui acelera primeira disponibilidade.

REFRESH MATERIALIZED VIEW core.activity_unified;


-- =============================================================================
-- PARTE 4 — Seed system.agent_channels para Hermes (placeholder)
-- =============================================================================
-- Hermes Agent (Nous Research) usa channel #hermes no Discord PropTech server.
-- webhook_url = NULL → Mário preenche após criar Discord Webhook URL para #hermes
-- (Discord Developer Portal → Server Settings → Integrations → Webhooks → New)
-- A Edge Function hermes-notify falha gracefully se webhook_url IS NULL.

INSERT INTO system.agent_channels
    (agent_id, channel_type, channel_id, dm_user_ids, active, notes)
VALUES (
    'hermes_executor',
    'discord',
    NULL,  -- channel_id Discord (snowflake) — preencher após Mário copiar
    '{}',  -- DM user IDs — não usado por Hermes (channel-only)
    false, -- inactivo até Mário preencher webhook_url
    'ADR-018 Phase 2B — Hermes Discord channel placeholder. ' ||
    'Para activar: (1) Discord → Server Settings → Integrations → Webhooks → New Webhook em #hermes; ' ||
    '(2) UPDATE system.agent_channels SET webhook_url=''<URL>'', channel_id=''<snowflake>'', active=true WHERE agent_id=''hermes_executor'';'
)
ON CONFLICT (agent_id, channel_type) DO NOTHING;


COMMIT;

-- =============================================================================
-- VALIDATION (correr DEPOIS de apply)
-- =============================================================================
--
-- 1. Confirmar 6 sources em activity_unified (esperado: 6 row distintos source):
--    SELECT source, count(*) FROM core.activity_unified GROUP BY source ORDER BY source;
--
-- 2. Confirmar Source 6 vazia ou populada conforme Hermes activity:
--    SELECT count(*) FROM core.activity_unified WHERE source = 'core.agent_audit_log.hermes';
--    -- Esperado: 0 inicialmente (Hermes ainda não invocou nada)
--
-- 3. Confirmar 4 indexes recriados:
--    SELECT indexname FROM pg_indexes WHERE schemaname='core' AND tablename='activity_unified';
--    -- Esperado: 4 rows
--
-- 4. Confirmar cron refresh continua active:
--    SELECT jobname, schedule, active FROM cron.job WHERE jobname='refresh-activity-unified';
--    -- Esperado: 1 row, schedule='* * * * *', active=true
--
-- 5. Confirmar seed agent_channels Hermes:
--    SELECT agent_id, channel_type, webhook_url IS NOT NULL AS has_webhook, active, notes
--    FROM system.agent_channels WHERE agent_id='hermes_executor';
--    -- Esperado: 1 row, has_webhook=false, active=false (placeholder)
-- =============================================================================
