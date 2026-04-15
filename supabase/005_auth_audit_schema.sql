-- Auditoria de inicio de sesion y cambios por sesion
CREATE TABLE IF NOT EXISTS public.auth_audit_sessions (
  session_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  has_changes BOOLEAN NOT NULL DEFAULT false,
  last_change_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_sessions_username
  ON public.auth_audit_sessions(username);

CREATE INDEX IF NOT EXISTS idx_auth_audit_sessions_login_at
  ON public.auth_audit_sessions(login_at DESC);

CREATE TABLE IF NOT EXISTS public.auth_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES public.auth_audit_sessions(session_id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_session_id
  ON public.auth_audit_events(session_id);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_created_at
  ON public.auth_audit_events(created_at DESC);

ALTER TABLE public.auth_audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read auth audit sessions" ON public.auth_audit_sessions;
CREATE POLICY "Allow public read auth audit sessions" ON public.auth_audit_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert auth audit sessions" ON public.auth_audit_sessions;
CREATE POLICY "Allow authenticated insert auth audit sessions" ON public.auth_audit_sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update auth audit sessions" ON public.auth_audit_sessions;
CREATE POLICY "Allow authenticated update auth audit sessions" ON public.auth_audit_sessions
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public read auth audit events" ON public.auth_audit_events;
CREATE POLICY "Allow public read auth audit events" ON public.auth_audit_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert auth audit events" ON public.auth_audit_events;
CREATE POLICY "Allow authenticated insert auth audit events" ON public.auth_audit_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.auth_audit_sessions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.auth_audit_sessions TO authenticated;

GRANT SELECT ON public.auth_audit_events TO anon, authenticated;
GRANT INSERT ON public.auth_audit_events TO authenticated;
