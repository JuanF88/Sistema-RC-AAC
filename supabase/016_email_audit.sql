-- Auditoria de correos enviados por el sistema
CREATE TABLE IF NOT EXISTS public.notifications_email_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  source TEXT,
  actor_username TEXT,
  subject TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  cc_recipients TEXT[],
  bcc_recipients TEXT[],
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  attachment_names TEXT[],
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_email_audit_created_at
  ON public.notifications_email_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_email_audit_status
  ON public.notifications_email_audit(status);

CREATE INDEX IF NOT EXISTS idx_notifications_email_audit_source
  ON public.notifications_email_audit(source);

ALTER TABLE public.notifications_email_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read notifications email audit" ON public.notifications_email_audit;
CREATE POLICY "Allow public read notifications email audit" ON public.notifications_email_audit
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert notifications email audit" ON public.notifications_email_audit;
CREATE POLICY "Allow authenticated insert notifications email audit" ON public.notifications_email_audit
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.notifications_email_audit TO anon, authenticated;
GRANT INSERT ON public.notifications_email_audit TO authenticated;