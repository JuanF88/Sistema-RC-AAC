-- Drop existing table if it exists (careful with this!)
DROP TABLE IF EXISTS public.consolidado_programas CASCADE;

-- Create consolidado_programas table with all fields from Excel
CREATE TABLE public.consolidado_programas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Basic Program Information
  process_code TEXT NOT NULL,
  faculty TEXT,
  program TEXT NOT NULL,
  degree TEXT,
  snies TEXT,
  
  -- Administrative Details
  creation_agreement TEXT,
  no_renewal TEXT,
  authorized_admissions_men INT,
  admission_periodicity TEXT,
  agreement_code TEXT,
  agreement_ies TEXT,
  agreement_administrator TEXT,
  
  -- Location and Format
  location TEXT,
  workday TEXT,
  regionalized BOOLEAN,
  level TEXT,
  academic_level TEXT,
  modality TEXT,
  methodology TEXT,
  
  -- Academic Credits
  research_credits INT,
  deepening_credits INT,
  total_academic_credits INT,
  duration INT,
  duration_unit TEXT,
  
  -- Reforms
  reform_academic_council TEXT,
  reform_superior_council TEXT,
  reform_mineducacion TEXT,
  tic_percentage DECIMAL(5,2),
  
  -- Current R.C. (Registro de Calificación)
  has_current_rc BOOLEAN,
  rc_resolution TEXT,
  rc_start DATE,
  rc_duration_years INT,
  rc_siga DATE,
  rc_mineducacion DATE,
  rc_end DATE,
  rc_extension_decree_1330 DATE,
  rc_extension_decree_1174 DATE,
  rc_historical_resolutions TEXT,
  rc_resolution_count INT,
  rc_official_resolution TEXT,
  rc_denied_resolution TEXT,
  
  -- Graduates
  number_graduates INT,
  
  -- Accreditation (A.A.C.)
  acreditable BOOLEAN,
  accredited BOOLEAN,
  in_accreditation_process BOOLEAN,
  aac_resolution TEXT,
  aac_start DATE,
  aac_duration_years INT,
  aac_cgcai_delivery DATE,
  aac_mineducacion_filing DATE,
  aac_end DATE,
  aac_improvement_halfway DATE,
  aac_historical_resolutions TEXT,
  aac_resolution_count INT,
  aac_denied_resolution TEXT,
  
  -- Notes and Metadata
  accreditation_guideline TEXT,
  general_observations TEXT,
  program_coordinator TEXT,
  source TEXT DEFAULT 'excel'
);

-- Create indexes for better query performance
CREATE INDEX idx_consolidado_process_code ON public.consolidado_programas(process_code);
CREATE INDEX idx_consolidado_faculty ON public.consolidado_programas(faculty);
CREATE INDEX idx_consolidado_program ON public.consolidado_programas(program);
CREATE INDEX idx_consolidado_snies ON public.consolidado_programas(snies);
CREATE INDEX idx_consolidado_rc_end ON public.consolidado_programas(rc_end);
CREATE INDEX idx_consolidado_aac_end ON public.consolidado_programas(aac_end);

-- Enable Row Level Security
ALTER TABLE public.consolidado_programas ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow public read access
CREATE POLICY "Allow public read access" ON public.consolidado_programas
  FOR SELECT USING (true);

-- Create RLS policy to allow authenticated users to update
CREATE POLICY "Allow authenticated update" ON public.consolidado_programas
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_consolidado_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consolidado_updated_at
BEFORE UPDATE ON public.consolidado_programas
FOR EACH ROW
EXECUTE FUNCTION update_consolidado_updated_at();

-- Grant permissions
GRANT SELECT ON public.consolidado_programas TO anon, authenticated;
GRANT UPDATE ON public.consolidado_programas TO authenticated;

-- Table for associated documents per program (files and URLs)
CREATE TABLE IF NOT EXISTS public.consolidado_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  program_id UUID NOT NULL REFERENCES public.consolidado_programas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url')),
  url TEXT NOT NULL,
  storage_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_consolidado_documentos_program_id
  ON public.consolidado_documentos(program_id);

ALTER TABLE public.consolidado_documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read docs" ON public.consolidado_documentos;
CREATE POLICY "Allow public read docs" ON public.consolidado_documentos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert docs" ON public.consolidado_documentos;
CREATE POLICY "Allow authenticated insert docs" ON public.consolidado_documentos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete docs" ON public.consolidado_documentos;
CREATE POLICY "Allow authenticated delete docs" ON public.consolidado_documentos
  FOR DELETE USING (auth.role() = 'authenticated');

GRANT SELECT ON public.consolidado_documentos TO anon, authenticated;
GRANT INSERT, DELETE ON public.consolidado_documentos TO authenticated;
