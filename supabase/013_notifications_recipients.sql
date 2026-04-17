-- Recipients for automatic snapshot email notifications.
-- Seed includes requested personal email and can be edited from the app.

CREATE TABLE IF NOT EXISTS public.notifications_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipients_active
  ON public.notifications_recipients(is_active, email);

ALTER TABLE public.notifications_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read notifications recipients" ON public.notifications_recipients;
CREATE POLICY "Allow read notifications recipients" ON public.notifications_recipients
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write notifications recipients" ON public.notifications_recipients;
CREATE POLICY "Allow authenticated write notifications recipients" ON public.notifications_recipients
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_notifications_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notifications_recipients_updated_at ON public.notifications_recipients;
CREATE TRIGGER trigger_notifications_recipients_updated_at
BEFORE UPDATE ON public.notifications_recipients
FOR EACH ROW
EXECUTE FUNCTION update_notifications_recipients_updated_at();

GRANT SELECT ON public.notifications_recipients TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications_recipients TO authenticated;

INSERT INTO public.notifications_recipients (email, full_name, is_active)
VALUES ('juanfhurtado@unicauca.edu.co', 'Juan Hurtado', TRUE)
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;
