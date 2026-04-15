-- Historical accreditation goals table (manual yearly snapshots)
CREATE TABLE IF NOT EXISTS public.acreditacion_historicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  label TEXT NOT NULL,
  accredited_count INT,
  accreditable_count INT,
  target_25 INT,
  target_40 INT,
  target_60 INT,
  compliance_percent NUMERIC(5,2),
  order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_acreditacion_historicos_order
  ON public.acreditacion_historicos(order_index, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_acreditacion_historicos_label_unique
  ON public.acreditacion_historicos(label);

ALTER TABLE public.acreditacion_historicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read historicos" ON public.acreditacion_historicos;
CREATE POLICY "Allow public read historicos" ON public.acreditacion_historicos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert historicos" ON public.acreditacion_historicos;
CREATE POLICY "Allow authenticated insert historicos" ON public.acreditacion_historicos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update historicos" ON public.acreditacion_historicos;
CREATE POLICY "Allow authenticated update historicos" ON public.acreditacion_historicos
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete historicos" ON public.acreditacion_historicos;
CREATE POLICY "Allow authenticated delete historicos" ON public.acreditacion_historicos
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_acreditacion_historicos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_acreditacion_historicos_updated_at ON public.acreditacion_historicos;
CREATE TRIGGER trigger_acreditacion_historicos_updated_at
BEFORE UPDATE ON public.acreditacion_historicos
FOR EACH ROW
EXECUTE FUNCTION update_acreditacion_historicos_updated_at();

GRANT SELECT ON public.acreditacion_historicos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.acreditacion_historicos TO authenticated;

-- Seed initial historical rows (idempotent)
INSERT INTO public.acreditacion_historicos (
  label,
  accredited_count,
  accreditable_count,
  target_25,
  target_40,
  target_60,
  compliance_percent,
  order_index
)
VALUES
  ('Acreditados con corte a 2019', 20, 42, 11, 17, 25, 48, 1),
  ('Acreditados con corte a 2022', 27, 68, 17, 27, 41, 40, 2),
  ('Acreditados con corte a 2023', 36, 68, 17, 27, 41, 53, 3),
  ('Acreditados con corte a 2024', 35, 68, 17, 27, 41, 51, 4),
  ('Acreditados con corte a 2026', 35, 82, 21, 33, 49, 43, 5),
  ('% cumplimiento de la meta a 31/12/2024', 34, NULL, NULL, NULL, NULL, 69, 6)
ON CONFLICT (label)
DO UPDATE SET
  accredited_count = EXCLUDED.accredited_count,
  accreditable_count = EXCLUDED.accreditable_count,
  target_25 = EXCLUDED.target_25,
  target_40 = EXCLUDED.target_40,
  target_60 = EXCLUDED.target_60,
  compliance_percent = EXCLUDED.compliance_percent,
  order_index = EXCLUDED.order_index;
