-- Enforce allowed values for consolidado_programas.level while allowing NULL.
-- Added option: Especializacion Medico Quirurgica.
-- The constraint is created as NOT VALID to avoid breaking existing legacy rows.

ALTER TABLE public.consolidado_programas
DROP CONSTRAINT IF EXISTS consolidado_programas_level_check;

ALTER TABLE public.consolidado_programas
ADD CONSTRAINT consolidado_programas_level_check
CHECK (
  level IS NULL
  OR level IN (
    'Doctorado',
    'Especialización',
    'Especializacion',
    'Especialización Médico Quirúrgica',
    'Maestría',
    'Maestria',
    'Profesional Universitario',
    'Tecnología',
    'Tecnologia'
  )
)
NOT VALID;
