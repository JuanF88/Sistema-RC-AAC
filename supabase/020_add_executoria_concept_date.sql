-- Agrega la fecha del concepto de ejecutoria, una para R.C. y otra para acreditacion (A.A.C.).
-- Seguro de ejecutar varias veces porque usa IF NOT EXISTS.

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS rc_executoria_concept_date DATE;

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS aac_executoria_concept_date DATE;
