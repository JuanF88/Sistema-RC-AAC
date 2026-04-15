-- Estado editable por programa en Acreditacion de Programas
CREATE TABLE IF NOT EXISTS public.acreditacion_estados_programa (
  program_id TEXT PRIMARY KEY,
  estado TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT acreditacion_estados_programa_estado_check
    CHECK (
      estado IN (
        'Renovaciones',
        'En proceso renovación',
        'Nuevos',
        'En proceso de AAC',
        'Acreditado a 2026'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_acreditacion_estados_programa_estado
  ON public.acreditacion_estados_programa(estado);

ALTER TABLE public.acreditacion_estados_programa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read acreditacion estados programa" ON public.acreditacion_estados_programa;
CREATE POLICY "Allow public read acreditacion estados programa" ON public.acreditacion_estados_programa
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert acreditacion estados programa" ON public.acreditacion_estados_programa;
CREATE POLICY "Allow authenticated insert acreditacion estados programa" ON public.acreditacion_estados_programa
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update acreditacion estados programa" ON public.acreditacion_estados_programa;
CREATE POLICY "Allow authenticated update acreditacion estados programa" ON public.acreditacion_estados_programa
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete acreditacion estados programa" ON public.acreditacion_estados_programa;
CREATE POLICY "Allow authenticated delete acreditacion estados programa" ON public.acreditacion_estados_programa
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_acreditacion_estados_programa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_acreditacion_estados_programa_updated_at ON public.acreditacion_estados_programa;
CREATE TRIGGER trigger_acreditacion_estados_programa_updated_at
BEFORE UPDATE ON public.acreditacion_estados_programa
FOR EACH ROW
EXECUTE FUNCTION update_acreditacion_estados_programa_updated_at();

GRANT SELECT ON public.acreditacion_estados_programa TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.acreditacion_estados_programa TO authenticated;
