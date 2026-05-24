-- =============================================================================
-- Migration: 202605240100_hermes_api_key.sql
-- Autor: supabase-designer (ADR-018 Phase 1)
-- Data: 2026-05-24
-- Propósito: Criar infraestrutura para Hermes Agent (Nous Research) invocar
--            CookAI via Supabase REST API com role scoped e audit trail.
--
-- PARTES:
--   A — system.api_keys (nova tabela + RLS + índices)
--   B — iam.permission_groups seed: grupo 'hermes_executor'
--   C — iam.permission_sections seed: 8 secções sistema/core
--   D — iam.permission_grants: grants do grupo hermes_executor
--   E — RPC iam.api_key_can(p_api_key, p_section, p_action) → boolean
--   F — Seed placeholder row para Hermes (hash = '$PENDING$', substituir após apply)
--
-- ROLLBACK (se necessário, criar nova migration forward-only):
--   DROP FUNCTION IF EXISTS iam.api_key_can(text, text, text);
--   DROP TABLE IF EXISTS system.api_keys;
--   DELETE FROM iam.permission_grants WHERE group_code = 'hermes_executor';
--   DELETE FROM iam.permission_sections WHERE code IN (
--     'system.recipes','system.tasks','core.pessoas','core.empresas',
--     'core.imoveis','core.condominios','core.activity_unified','system.swarm_discoveries'
--   );
--   DELETE FROM iam.permission_groups WHERE code = 'hermes_executor';
--
-- REFS: ADR-018 D5, ADR-013 IAM, ADR-011 CookAI Catalog
-- =============================================================================


-- =============================================================================
-- PARTE A — system.api_keys
-- Tabela de chaves de API para agentes externos (Hermes, CLI, integrações).
-- Segue padrão IAM existente: cada api_key tem um permission_group_code que
-- determina o que o detentor pode fazer (mesmo padrão que staff_login_aliases).
-- api_key_hash usa bcrypt via pgcrypto (já activo) — NUNCA guardar plaintext.
-- =============================================================================

CREATE TABLE IF NOT EXISTS system.api_keys (
    -- Identificador único — usado como referência em audit logs
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Nome descritivo único — ex: 'hermes_executor', 'cli_mario', 'n8n_webhook'
    name                 text        NOT NULL,

    -- Role funcional — categoriza o tipo de caller sem ser um grupo IAM
    -- Valores canónicos: 'hermes', 'cli', 'integration', 'webhook'
    role                 text        NOT NULL,

    -- Descrição livre para contexto operacional
    description          text,

    -- Hash bcrypt da api_key — gerado com pgcrypto crypt(key, gen_salt('bf', 10))
    -- '$PENDING$' = placeholder; substituir com UPDATE após gerar key real (ver guia abaixo)
    api_key_hash         text        NOT NULL,

    -- Prévia legível: últimos 4 chars da key original, ex: '...a1b2'
    -- Permite identificar qual key foi usada em logs sem expor o plaintext
    api_key_preview      text,

    -- Grupo de permissão IAM associado (usa padrão existente iam.permission_groups)
    -- FK RESTRICT: não apagar grupo enquanto existir api_key a usá-lo
    permission_group_code text       NOT NULL
                                     REFERENCES iam.permission_groups(code)
                                     ON DELETE RESTRICT,

    -- Metadados de uso
    last_used_at         timestamptz,
    usage_count          integer     NOT NULL DEFAULT 0,

    -- Controlo de ciclo de vida
    active               boolean     NOT NULL DEFAULT true,
    revoked_at           timestamptz,
    revoked_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Limites e expiração opcionais (jsonb extensível)
    -- Ex: {"expires_at": "2027-01-01", "rate_limit_per_min": 60}
    scope_json           jsonb       NOT NULL DEFAULT '{}'::jsonb,

    -- Auditoria standard
    created_at           timestamptz NOT NULL DEFAULT now(),
    created_by           uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at           timestamptz NOT NULL DEFAULT now(),

    -- Unicidade por nome
    CONSTRAINT api_keys_name_unique UNIQUE (name)
);

-- Comentário de tabela
COMMENT ON TABLE system.api_keys IS
    'Chaves de API para agentes externos (Hermes, CLI, integrações n8n/zapier). '
    'Hash bcrypt via pgcrypto. Permissões delegadas via iam.permission_groups. '
    'ADR-018 Phase 1.';

COMMENT ON COLUMN system.api_keys.api_key_hash IS
    'bcrypt hash gerado com: crypt(plaintext_key, gen_salt(''bf'', 10)). '
    'Placeholder ''$PENDING$'' indica key ainda não gerada — NÃO está activa.';

COMMENT ON COLUMN system.api_keys.permission_group_code IS
    'Grupo IAM que determina permissões (can_view/can_edit/can_create/can_delete '
    'por section_code). Segue exactamente o mesmo modelo de staff_login_aliases.';

-- Trigger updated_at (padrão da plataforma)
CREATE OR REPLACE FUNCTION system.set_api_keys_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON system.api_keys;
CREATE TRIGGER trg_api_keys_updated_at
    BEFORE UPDATE ON system.api_keys
    FOR EACH ROW EXECUTE FUNCTION system.set_api_keys_updated_at();

-- Índices
-- (active, role): consultas de validação "está activa e é do tipo X?"
CREATE INDEX IF NOT EXISTS idx_api_keys_active_role
    ON system.api_keys (role, active)
    WHERE active = true;

-- (permission_group_code): FK sempre indexada
CREATE INDEX IF NOT EXISTS idx_api_keys_permission_group
    ON system.api_keys (permission_group_code);

-- (name): pesquisa por nome em dashboards
CREATE INDEX IF NOT EXISTS idx_api_keys_name
    ON system.api_keys (name);


-- =============================================================================
-- RLS — system.api_keys
-- Filosofia Deny-by-default:
--   - anon: NADA (chaves de API são segredos internos)
--   - authenticated: SELECT apenas se is_staff() (ver e gerir no dashboard)
--   - service_role: bypass implícito pelo Supabase (sem policy necessária)
-- =============================================================================

ALTER TABLE system.api_keys ENABLE ROW LEVEL SECURITY;

-- Revogar qualquer acesso anon directo (redundante mas explícito)
REVOKE ALL ON system.api_keys FROM anon;

-- Staff pode ver todas as api_keys (para gestão no dashboard)
CREATE POLICY "api_keys_staff_select"
    ON system.api_keys
    FOR SELECT
    TO authenticated
    USING (
        -- is_staff() já existe em public (criada ADR-013/Batch1)
        -- equivale a: EXISTS (SELECT 1 FROM core.staff WHERE user_id = auth.uid() AND active = true)
        (SELECT public.is_staff())
    );

-- Staff pode inserir novas keys (dashboard "Criar API Key")
CREATE POLICY "api_keys_staff_insert"
    ON system.api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (SELECT public.is_staff())
    );

-- Staff pode actualizar (revogar, desactivar, mudar descrição)
CREATE POLICY "api_keys_staff_update"
    ON system.api_keys
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT public.is_staff())
    )
    WITH CHECK (
        (SELECT public.is_staff())
    );

-- Staff NÃO pode apagar fisicamente (preservar audit trail — usar active=false + revoked_at)
-- DELETE fica sem policy → bloqueado para authenticated também


-- =============================================================================
-- PARTE B — iam.permission_groups: grupo 'hermes_executor'
-- Hermes é tratado como um "grupo" no IAM para reutilizar o padrão existente.
-- Analogia contabilística: é como criar um "centro de custo" para o agente externo.
-- =============================================================================

INSERT INTO iam.permission_groups (code, label, color, ordem, descricao)
VALUES (
    'hermes_executor',
    'Hermes Executor (API)',
    'purple',
    900,
    'Grupo de permissões para o Hermes Agent (Nous Research) invocar CookAI via REST API. ADR-018.'
)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- PARTE C — iam.permission_sections: 8 secções para integração Hermes
-- Formato canónico: '<schema_ou_vertical>.<recurso>'
-- Reutiliza PKs de texto existentes (ex: 'v2.fracoes', 'system.inbox').
-- As 8 secções mapeiam directamente para os 5 padrões D7 do ADR-018.
-- =============================================================================

INSERT INTO iam.permission_sections (code, label, vertical, ordem, descricao)
VALUES
    -- Padrão D7-1: Hermes orquestra → invoca recipes e cria tasks
    ('system.recipes_exec',  'System · Recipes (execução)',       'system', 850,
     'Permite invocar/executar recipes CookAI. ADR-018 D5 D7-padrão-1.'),
    ('system.tasks_create',  'System · Tasks (criação)',          'system', 860,
     'Permite criar tasks no sistema. ADR-018 D5 D7-padrão-1.'),

    -- Padrão D7-4: Hermes lê swarm discoveries
    ('system.swarm_read',    'System · Swarm Discoveries (leitura)', 'system', 870,
     'Acesso de leitura a system.swarm_discoveries. ADR-018 D5 D7-padrão-4.'),

    -- Padrão D7-5: Hermes lê activity_unified para contexto cross-vertical
    ('core.activity_read',   'Core · Activity Unified (leitura)', 'core',  510,
     'Acesso de leitura a core.activity_unified via RPC. ADR-018 D5 D7-padrão-5.'),

    -- Leitura de entidades CRM para contexto (Hermes prepara respostas para Mário)
    ('core.pessoas_read',    'Core · Pessoas (leitura)',          'core',  520,
     'Acesso de leitura a core.pessoas via RPC. ADR-018 D5.'),
    ('core.empresas_read',   'Core · Empresas (leitura)',         'core',  530,
     'Acesso de leitura a core.empresas via RPC. ADR-018 D5.'),
    ('core.imoveis_read',    'Core · Imóveis (leitura)',          'core',  540,
     'Acesso de leitura a core.imoveis via RPC. ADR-018 D5.'),
    ('core.condominios_read','Core · Condomínios (leitura)',      'core',  550,
     'Acesso de leitura a core.condominios via RPC. ADR-018 D5.')
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- PARTE D — iam.permission_grants: whitelist do grupo hermes_executor
-- Usa o padrão real do IAM: (group_code, section_code) com booleans can_*.
-- Hermes só precisa de can_view=true para leituras e can_create=true para
-- invocar recipes/tasks. Nunca can_delete=true.
-- =============================================================================

INSERT INTO iam.permission_grants
    (group_code, section_code, can_view, can_edit, can_create, can_delete)
VALUES
    -- Recipes: pode ver catálogo + criar/executar (can_create = "invocar")
    ('hermes_executor', 'system.recipes_exec',   true,  false, true,  false),
    -- Tasks: pode ver estado das suas tasks + criar novas
    ('hermes_executor', 'system.tasks_create',   true,  false, true,  false),
    -- Swarm discoveries: só leitura
    ('hermes_executor', 'system.swarm_read',     true,  false, false, false),
    -- Activity unified: só leitura
    ('hermes_executor', 'core.activity_read',    true,  false, false, false),
    -- Entidades CRM: só leitura
    ('hermes_executor', 'core.pessoas_read',     true,  false, false, false),
    ('hermes_executor', 'core.empresas_read',    true,  false, false, false),
    ('hermes_executor', 'core.imoveis_read',     true,  false, false, false),
    ('hermes_executor', 'core.condominios_read', true,  false, false, false)
ON CONFLICT (group_code, section_code) DO NOTHING;


-- =============================================================================
-- PARTE E — RPC iam.api_key_can(p_api_key, p_section, p_action)
-- Valida se uma api_key tem permissão para uma secção+acção.
-- Usado pela Edge Function hermes-invoke-recipe para autorizar chamadas.
--
-- Fluxo:
--   1. Hash da key recebida → comparar com api_key_hash via pgcrypto crypt()
--   2. Se match e active=true: obter permission_group_code
--   3. Verificar iam.permission_grants para o grupo + secção + acção
--   4. Retornar boolean
--
-- SECURITY DEFINER: corre com privilégios do owner (service_role) para poder
-- ler system.api_keys sem expor a tabela via RLS a callers externos.
-- GRANT: apenas service_role pode invocar esta RPC (Edge Functions usam service_role).
-- NUNCA fazer GRANT TO anon ou authenticated.
-- =============================================================================

CREATE OR REPLACE FUNCTION iam.api_key_can(
    p_api_key  text,   -- plaintext key recebida no header x-api-key
    p_section  text,   -- ex: 'system.recipes_exec'
    p_action   text    -- 'view' | 'edit' | 'create' | 'delete'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iam, system, public
AS $$
DECLARE
    v_group_code  text;
    v_can_do      boolean := false;
BEGIN
    -- Passo 1: encontrar api_key activa cujo hash corresponde ao plaintext recebido
    -- pgcrypto crypt() faz o match contra o hash bcrypt armazenado
    -- Nota: '$PENDING$' nunca faz match com nenhum input real (bcrypt rejeita o formato)
    SELECT ak.permission_group_code
    INTO   v_group_code
    FROM   system.api_keys ak
    WHERE  ak.active = true
      AND  ak.api_key_hash != '$PENDING$'
      AND  crypt(p_api_key, ak.api_key_hash) = ak.api_key_hash
    LIMIT  1;

    -- Se não encontrou key válida, negar imediatamente
    IF v_group_code IS NULL THEN
        RETURN false;
    END IF;

    -- Passo 2: verificar permissão no grupo para a secção+acção pedida
    SELECT CASE p_action
               WHEN 'view'   THEN pg.can_view
               WHEN 'edit'   THEN pg.can_edit
               WHEN 'create' THEN pg.can_create
               WHEN 'delete' THEN pg.can_delete
               ELSE false
           END
    INTO   v_can_do
    FROM   iam.permission_grants pg
    WHERE  pg.group_code   = v_group_code
      AND  pg.section_code = p_section;

    -- Actualizar last_used_at e usage_count de forma assíncrona (best-effort)
    -- Usar UPDATE sem verificar resultado para não bloquear o caller
    UPDATE system.api_keys
    SET    last_used_at = now(),
           usage_count  = usage_count + 1
    WHERE  active = true
      AND  api_key_hash != '$PENDING$'
      AND  crypt(p_api_key, api_key_hash) = api_key_hash;

    RETURN COALESCE(v_can_do, false);
END;
$$;

COMMENT ON FUNCTION iam.api_key_can(text, text, text) IS
    'Valida se a api_key (plaintext) tem permissão para section+action. '
    'Usa bcrypt via pgcrypto. Actualiza last_used_at/usage_count. '
    'SECURITY DEFINER — só invocar via service_role (Edge Functions). ADR-018.';

-- Revogar acesso público e conceder apenas a service_role
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION iam.api_key_can(text, text, text) FROM authenticated;
-- service_role tem EXECUTE implícito via SECURITY DEFINER + owner, mas ser explícito:
-- (Nota: em Supabase, service_role bypassa RLS mas precisa de EXECUTE em funções)
GRANT EXECUTE ON FUNCTION iam.api_key_can(text, text, text) TO service_role;


-- =============================================================================
-- PARTE F — Seed placeholder para Hermes (api_key_hash = '$PENDING$')
-- A key real será gerada com o script bash abaixo APÓS este migration ser aplicado.
-- O placeholder garante que a row existe para os validation queries funcionarem,
-- mas '$PENDING$' nunca faz match em crypt() — a key fica inactiva até substituição.
-- =============================================================================

INSERT INTO system.api_keys (
    name,
    role,
    description,
    api_key_hash,
    api_key_preview,
    permission_group_code,
    active,
    scope_json
)
VALUES (
    'hermes_executor',
    'hermes',
    'Hermes Agent (Nous Research) — executivo externo que orquestra CookAI via REST. '
    'Self-hosted em Hetzner CAX11. Ver ADR-018 para padrões D5+D7. '
    'ACÇÃO NECESSÁRIA: substituir api_key_hash com key bcrypt real (ver script abaixo).',
    '$PENDING$',
    '...????',
    'hermes_executor',
    false,  -- INACTIVA até api_key_hash ser substituído
    '{"rate_limit_per_min": 60, "expires_at": null, "note": "Activar após UPDATE api_key_hash"}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE system.api_keys IS
    'Chaves de API para agentes externos (Hermes, CLI, integrações). '
    'Row hermes_executor criada inactiva — activar após gerar key real. '
    'ADR-018 Phase 1.';


-- =============================================================================
-- VALIDATION QUERIES (executar após apply para confirmar estado)
-- =============================================================================

/*
-- 1. Confirmar tabela criada e row placeholder presente
SELECT id, name, role, active, api_key_preview, permission_group_code,
       api_key_hash = '$PENDING$' AS is_placeholder
FROM system.api_keys
WHERE name = 'hermes_executor';
-- Esperado: 1 row, active=false, is_placeholder=true

-- 2. Confirmar grupo hermes_executor criado
SELECT code, label, color FROM iam.permission_groups
WHERE code = 'hermes_executor';
-- Esperado: 1 row, color='purple'

-- 3. Confirmar 8 secções criadas
SELECT code, vertical FROM iam.permission_sections
WHERE code IN (
    'system.recipes_exec', 'system.tasks_create', 'system.swarm_read',
    'core.activity_read', 'core.pessoas_read', 'core.empresas_read',
    'core.imoveis_read', 'core.condominios_read'
)
ORDER BY vertical, code;
-- Esperado: 8 rows

-- 4. Confirmar 8 grants do grupo
SELECT section_code, can_view, can_edit, can_create, can_delete
FROM iam.permission_grants
WHERE group_code = 'hermes_executor'
ORDER BY section_code;
-- Esperado: 8 rows com can_view=true em todos; can_create=true só nos 2 primeiros

-- 5. Confirmar RPC existe e não é invocável por anon
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'iam'
  AND routine_name = 'api_key_can';
-- Esperado: 1 row, security_type='DEFINER'

-- 6. Testar que '$PENDING$' não autoriza nada (deve retornar false)
SELECT iam.api_key_can('qualquer_coisa', 'system.recipes_exec', 'create');
-- Esperado: false (placeholder não faz match)

-- 7. Verificar RLS activo na tabela
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'system' AND tablename = 'api_keys';
-- Esperado: rowsecurity=true

-- 8. Confirmar policies criadas
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'system' AND tablename = 'api_keys'
ORDER BY policyname;
-- Esperado: 3 policies (select/insert/update para authenticated)
*/


-- =============================================================================
-- GUIA: COMO GERAR E ACTIVAR A API KEY DO HERMES (após apply)
-- =============================================================================
--
-- PASSO 1 — Gerar key segura (bash no terminal local ou no Hetzner):
--
--   HERMES_KEY=$(openssl rand -base64 48 | tr -d '/+=\n' | head -c 64)
--   echo "Key gerada: $HERMES_KEY"
--   echo "Guarda esta key AGORA — não será possível recuperá-la depois!"
--
-- PASSO 2 — Gerar hash bcrypt via SQL (no Supabase SQL Editor do V1):
--
--   SELECT crypt('COLA_A_KEY_AQUI', gen_salt('bf', 10)) AS hash_bcrypt;
--   -- Copiar o resultado (começa com '$2a$10$...')
--
-- PASSO 3 — Actualizar a row e activar:
--
--   UPDATE system.api_keys
--   SET    api_key_hash    = 'COLA_O_HASH_BCRYPT_AQUI',
--          api_key_preview = '...' || RIGHT('COLA_A_KEY_AQUI', 4),
--          active          = true,
--          scope_json      = '{"rate_limit_per_min": 60, "activated_at": "2026-05-24"}'
--   WHERE  name = 'hermes_executor';
--
-- PASSO 4 — Configurar no servidor Hetzner (Hermes config):
--
--   # Em ~/.config/hermes/config.yaml (ou equivalente):
--   supabase:
--     url: https://hkmvszkpxjbxmnixzqbl.supabase.co
--     api_key: "COLA_A_KEY_PLAINTEXT_AQUI"  # nunca commitar este ficheiro
--
-- PASSO 5 — Smoke test manual:
--
--   curl -X POST \
--     https://hkmvszkpxjbxmnixzqbl.supabase.co/functions/v1/hermes-invoke-recipe \
--     -H "x-api-key: COLA_A_KEY_AQUI" \
--     -H "Content-Type: application/json" \
--     -d '{"recipe_slug": "bia-daily-roundup", "payload": {}, "idempotency_key": "smoke-001"}'
--   # Esperado: {"ok": true, "data": {"task_id": "...", "status": "queued"}}
--
-- SEGURANÇA:
--   - Guardar a key plaintext no Bitwarden / 1Password (NUNCA em .env commitado)
--   - Adicionar ao Supabase Vault como secret 'HERMES_API_KEY' para acesso nas EFs
--   - Rotação semestral: gerar nova key, UPDATE hash, revogar antiga
-- =============================================================================
