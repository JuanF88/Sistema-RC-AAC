-- Visitas de pares table
CREATE TABLE IF NOT EXISTS public.visitas_pares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  program TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  subject TEXT NOT NULL,
  modality TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visitas_pares_start_date
  ON public.visitas_pares(start_date DESC);

CREATE INDEX IF NOT EXISTS idx_visitas_pares_program
  ON public.visitas_pares(program);

ALTER TABLE public.visitas_pares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read visitas pares" ON public.visitas_pares;
CREATE POLICY "Allow public read visitas pares" ON public.visitas_pares
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert visitas pares" ON public.visitas_pares;
CREATE POLICY "Allow authenticated insert visitas pares" ON public.visitas_pares
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update visitas pares" ON public.visitas_pares;
CREATE POLICY "Allow authenticated update visitas pares" ON public.visitas_pares
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete visitas pares" ON public.visitas_pares;
CREATE POLICY "Allow authenticated delete visitas pares" ON public.visitas_pares
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_visitas_pares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_visitas_pares_updated_at ON public.visitas_pares;
CREATE TRIGGER trigger_visitas_pares_updated_at
BEFORE UPDATE ON public.visitas_pares
FOR EACH ROW
EXECUTE FUNCTION update_visitas_pares_updated_at();

GRANT SELECT ON public.visitas_pares TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.visitas_pares TO authenticated;
