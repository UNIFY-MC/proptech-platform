-- system.* — policies abertas para uso interno (1 user, protegido por Vercel password).
-- Quando precisar de Auth real, reverter para USING (public.is_staff()).

-- ── inbox_items ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS staff_read_inbox_items    ON system.inbox_items;
DROP POLICY IF EXISTS staff_archive_inbox_items ON system.inbox_items;

CREATE POLICY internal_open_read  ON system.inbox_items FOR SELECT USING (true);
CREATE POLICY internal_open_write ON system.inbox_items FOR ALL    USING (true) WITH CHECK (true);

-- ── inbox_reads ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS staff_read_own_reads   ON system.inbox_reads;
DROP POLICY IF EXISTS staff_insert_own_reads ON system.inbox_reads;
DROP POLICY IF EXISTS staff_delete_own_reads ON system.inbox_reads;

-- Sem auth real, dropar FK para auth.users e usar UUID fixo de utilizador interno
ALTER TABLE system.inbox_reads
  DROP CONSTRAINT IF EXISTS inbox_reads_user_id_fkey;

ALTER TABLE system.inbox_reads
  ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001'::uuid;

CREATE POLICY internal_open_read  ON system.inbox_reads FOR SELECT USING (true);
CREATE POLICY internal_open_write ON system.inbox_reads FOR ALL    USING (true) WITH CHECK (true);

-- ── approvals_queue ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS staff_read_approvals    ON system.approvals_queue;
DROP POLICY IF EXISTS staff_decide_approvals  ON system.approvals_queue;

CREATE POLICY internal_open_read  ON system.approvals_queue FOR SELECT USING (true);
CREATE POLICY internal_open_write ON system.approvals_queue FOR ALL    USING (true) WITH CHECK (true);
