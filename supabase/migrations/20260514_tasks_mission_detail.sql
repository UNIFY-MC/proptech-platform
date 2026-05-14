-- 20260514_tasks_mission_detail.sql
-- Mission Detail schema (CookAI-style task view)
-- Adiciona à system.tasks: skills text[], branch text, prompt_md text, files jsonb
-- Cria system.task_comments (stream de comentários humano/agent/system)
-- Recria view public.system_tasks com novos campos + duration_seconds

ALTER TABLE system.tasks
  ADD COLUMN IF NOT EXISTS skills    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS branch    text,
  ADD COLUMN IF NOT EXISTS prompt_md text,
  ADD COLUMN IF NOT EXISTS files     jsonb  NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS system.task_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES system.tasks(id) ON DELETE CASCADE,
  author_kind text NOT NULL CHECK (author_kind IN ('human', 'agent', 'system')),
  author_id   text,
  author_name text,
  body_md     text NOT NULL,
  kind        text NOT NULL DEFAULT 'comment' CHECK (kind IN ('comment', 'status_update', 'approval', 'revision_request', 'mission_completed')),
  metadata    jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_idx ON system.task_comments(task_id, created_at);

CREATE OR REPLACE VIEW public.system_task_comments AS
SELECT id, task_id, author_kind, author_id, author_name, body_md, kind, metadata, created_at
FROM system.task_comments;

GRANT SELECT, INSERT ON public.system_task_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system.task_comments TO anon, authenticated;

CREATE OR REPLACE FUNCTION system.task_duration_seconds(t system.tasks)
RETURNS integer LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN t.done_at IS NULL THEN NULL
    ELSE GREATEST(0, EXTRACT(EPOCH FROM (t.done_at - t.created_at))::integer)
  END;
$$;

DROP VIEW IF EXISTS public.system_tasks;
CREATE VIEW public.system_tasks AS
SELECT
  id, title, description_md, status, priority, kind, vertical,
  owner_agent_id, owner_user_id, created_by, due_at,
  source_kind, source_id, payload, tags, steps, goal, project,
  skills, branch, prompt_md, files,
  done_at, created_at, updated_at,
  system.task_duration_seconds(tasks.*) AS duration_seconds
FROM system.tasks;

GRANT SELECT ON public.system_tasks TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
