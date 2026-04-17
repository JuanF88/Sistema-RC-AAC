-- Update estado check constraint to support the new accreditation flow labels.
-- Keeps backward compatibility with legacy labels already stored.

ALTER TABLE public.acreditacion_estados_programa
DROP CONSTRAINT IF EXISTS acreditacion_estados_programa_estado_check;

ALTER TABLE public.acreditacion_estados_programa
ADD CONSTRAINT acreditacion_estados_programa_estado_check
CHECK (
  estado IN (
    'Acreditable',
    'En proceso de Acreditacion',
    'Acreditado 2026',
    'Renovaciones',
    'En proceso renovación',
    'Nuevos',
    'En proceso de AAC',
    'Acreditado a 2026'
  )
);
