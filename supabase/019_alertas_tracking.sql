-- Tracking de envios manuales de alertas por programa.
-- Permite llevar historial y consultar ultimo envio por tipo.

CREATE TABLE IF NOT EXISTS public.notifications_alertas_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  program_id UUID NOT NULL REFERENCES public.consolidado_programas(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  alert_kind TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  actor_username TEXT,
  recipients TEXT[] NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alertas_envios_program ON public.notifications_alertas_envios(program_id);
CREATE INDEX IF NOT EXISTS idx_alertas_envios_type_kind ON public.notifications_alertas_envios(alert_type, alert_kind);
CREATE INDEX IF NOT EXISTS idx_alertas_envios_sent_at ON public.notifications_alertas_envios(sent_at DESC);

ALTER TABLE public.notifications_alertas_envios ENABLE ROW LEVEL SECURITY;

-- Solo lecturas desde service role o usuarios autenticados via API interna.
DROP POLICY IF EXISTS "Allow authenticated read alertas envios" ON public.notifications_alertas_envios;
CREATE POLICY "Allow authenticated read alertas envios"
  ON public.notifications_alertas_envios FOR SELECT
  USING (auth.role() = 'authenticated');
