-- Global schedule settings for automatic snapshot generation and email delivery.
-- Singleton row identified by id='default'.

CREATE TABLE IF NOT EXISTS public.notifications_snapshot_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  frequency TEXT NOT NULL DEFAULT 'biweekly'
    CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  hour INTEGER NOT NULL DEFAULT 8 CHECK (hour >= 0 AND hour <= 23),
  minute INTEGER NOT NULL DEFAULT 0 CHECK (minute >= 0 AND minute <= 59),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.notifications_snapshot_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read snapshot settings" ON public.notifications_snapshot_settings;
CREATE POLICY "Allow read snapshot settings" ON public.notifications_snapshot_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated write snapshot settings" ON public.notifications_snapshot_settings;
CREATE POLICY "Allow authenticated write snapshot settings" ON public.notifications_snapshot_settings
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_notifications_snapshot_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notifications_snapshot_settings_updated_at ON public.notifications_snapshot_settings;
CREATE TRIGGER trigger_notifications_snapshot_settings_updated_at
BEFORE UPDATE ON public.notifications_snapshot_settings
FOR EACH ROW
EXECUTE FUNCTION update_notifications_snapshot_settings_updated_at();

INSERT INTO public.notifications_snapshot_settings (id, enabled, frequency, hour, minute)
VALUES ('default', TRUE, 'biweekly', 8, 0)
ON CONFLICT (id) DO NOTHING;
