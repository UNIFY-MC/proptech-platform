-- 20_v5_3_4c_revoke_anon_rpc.sql
-- B1: Revogar acesso anon a funções RPC que expõem dados de utilizadores
-- Contexto: anon key está no bundle JS (público) — GRANT TO anon nestas fns = acesso público
-- Funções afectadas: core_get_* wrappers em schema public
-- Aplicado: 2026-04-26 · Sprint 3.4C T3 audit

REVOKE EXECUTE ON FUNCTION public.core_get_financial_kpis()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.core_get_staff_pessoas()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.core_get_staff_dashboard_scoped()    FROM anon;
REVOKE EXECUTE ON FUNCTION public.core_get_client_detail(uuid)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.core_get_pessoa_dashboard(uuid)      FROM anon;

-- Forçar PostgREST a recarregar schema cache
NOTIFY pgrst, 'reload schema';
