-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  Número sequencial legível para ordens                               ║
-- ║  v5-manutencao · 23 Abr 2026                                         ║
-- ║                                                                      ║
-- ║  Formato: "#25-0001" = ano 2 dígitos + sequencial 4 dígitos          ║
-- ║  Sequência é CORRIDA permanente — NÃO reinicia no ano novo.          ║
-- ║  O "25" é o ano em que a ordem foi criada (vem de EXTRACT(year)),    ║
-- ║  o "0001" vem da SEQUENCE. A primeira ordem criada em 2026 vai ser   ║
-- ║  "#26-0001", mas a próxima pode ser "#26-0002" mesmo que o ano mude  ║
-- ║  no meio — o número nunca repete.                                    ║
-- ║                                                                      ║
-- ║  Idempotente: IF NOT EXISTS em sequence, column e index. Trigger     ║
-- ║  com DROP IF EXISTS antes de CREATE.                                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- Sequência corrida permanente
CREATE SEQUENCE IF NOT EXISTS ordens_numero_seq START 1;

-- Coluna (TEXT para suportar prefixo "#" e separador "-")
ALTER TABLE ordens ADD COLUMN IF NOT EXISTS numero_sequencial TEXT;

-- Trigger function: popula numero_sequencial se vier NULL
CREATE OR REPLACE FUNCTION set_ordem_numero() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_sequencial IS NULL THEN
    NEW.numero_sequencial := '#'
      || LPAD(to_char(COALESCE(NEW.created_at, NOW()), 'YY'), 2, '0')
      || '-'
      || LPAD(nextval('ordens_numero_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger BEFORE INSERT (idempotente)
DROP TRIGGER IF EXISTS trg_ordem_numero ON ordens;
CREATE TRIGGER trg_ordem_numero
  BEFORE INSERT ON ordens
  FOR EACH ROW EXECUTE FUNCTION set_ordem_numero();

-- Índice para lookup rápido por número humano (ex: no admin)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ordens_numero_sequencial
  ON ordens(numero_sequencial);

-- Verificação (correr depois):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name='ordens' AND column_name='numero_sequencial';
--
-- SELECT tgname FROM pg_trigger WHERE tgname='trg_ordem_numero';
--
-- Após primeiro INSERT:
-- SELECT id, numero_sequencial, created_at FROM ordens ORDER BY created_at DESC LIMIT 5;
-- Expected: numero_sequencial no formato "#25-0001", "#25-0002", ...
