-- Sprint M: Email integration (Gmail/Postmark/Mailgun inbound + outbound)
-- Workflow: email inbound → classify → draft → task needs_human → approve → send

CREATE TABLE IF NOT EXISTS system.email_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_id      text,
  thread_id       text,
  from_email      text NOT NULL,
  from_name       text,
  to_emails       text[] NOT NULL DEFAULT '{}',
  cc_emails       text[] NOT NULL DEFAULT '{}',
  subject         text NOT NULL DEFAULT '',
  body_text       text,
  body_html       text,
  body_snippet    text,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  classify_intent text,
  classify_score  numeric(3,2),
  routed_to_agent text,
  task_id         uuid REFERENCES system.tasks(id) ON DELETE SET NULL,
  vertical        text,
  client_id       uuid REFERENCES system.clients(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received', 'classified', 'drafted', 'awaiting_approval', 'approved', 'sent', 'failed', 'archived')),
  raw_payload     jsonb,
  received_at     timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_messages_thread_idx     ON system.email_messages (thread_id);
CREATE INDEX IF NOT EXISTS email_messages_status_idx     ON system.email_messages (status);
CREATE INDEX IF NOT EXISTS email_messages_task_idx       ON system.email_messages (task_id);
CREATE INDEX IF NOT EXISTS email_messages_client_idx     ON system.email_messages (client_id);
CREATE INDEX IF NOT EXISTS email_messages_received_idx   ON system.email_messages (received_at DESC);

DROP VIEW IF EXISTS public.system_email_messages;
CREATE VIEW public.system_email_messages AS
SELECT m.*, t.title AS task_title, t.status AS task_status, c.company_name AS client_name
FROM system.email_messages m
LEFT JOIN system.tasks t   ON t.id = m.task_id
LEFT JOIN system.clients c ON c.id = m.client_id
ORDER BY m.received_at DESC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_email_messages TO authenticated;
GRANT SELECT ON public.system_email_messages TO anon;
GRANT ALL ON system.email_messages TO authenticated, service_role;

-- Expandir tasks.kind para suportar email_reply + calendar_event
ALTER TABLE system.tasks DROP CONSTRAINT IF EXISTS tasks_kind_check;
ALTER TABLE system.tasks ADD CONSTRAINT tasks_kind_check
  CHECK (kind IN ('task', 'idea', 'followup', 'reminder', 'email_reply', 'calendar_event'));

NOTIFY pgrst, 'reload schema';
