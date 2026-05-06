-- Formaliza GRANTs aplicados manualmente via SQL Editor em 2026-05-04
-- Estes GRANTs já estão aplicados — este ficheiro é só registo histórico

GRANT USAGE ON SCHEMA system TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA system TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA system
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
