-- Cambiar regionalized de boolean a texto con 3 valores permitidos
-- Valores permitidos: 'Si', 'No', 'Ampliación de lugar de desarrollo'

ALTER TABLE public.consolidado_programas
  ALTER COLUMN regionalized TYPE text
  USING (
    CASE
      WHEN regionalized IS TRUE THEN 'Si'
      WHEN regionalized IS FALSE THEN 'No'
      ELSE NULL
    END
  );

ALTER TABLE public.consolidado_programas
  DROP CONSTRAINT IF EXISTS consolidado_programas_regionalized_check;

ALTER TABLE public.consolidado_programas
  ADD CONSTRAINT consolidado_programas_regionalized_check
  CHECK (
    regionalized IS NULL
    OR regionalized IN ('Si', 'No', 'Ampliación de lugar de desarrollo')
  );
