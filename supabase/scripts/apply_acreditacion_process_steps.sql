-- Script unico para habilitar seguimiento por pasos de acreditacion.
-- Ejecutar una sola vez en la base de datos destino.

BEGIN;

ALTER TABLE public.acreditacion_estados_programa
  ADD COLUMN IF NOT EXISTS informe_cgc_enviado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enviado_ministerio BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acreditacion_recibida BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.acreditacion_estados_programa
  DROP CONSTRAINT IF EXISTS acreditacion_estados_programa_secuencia_check;

ALTER TABLE public.acreditacion_estados_programa
  ADD CONSTRAINT acreditacion_estados_programa_secuencia_check
  CHECK (
    (NOT enviado_ministerio OR informe_cgc_enviado)
    AND (NOT acreditacion_recibida OR enviado_ministerio)
  );

-- Backfill inicial segun estado historico guardado.
UPDATE public.acreditacion_estados_programa
SET
  informe_cgc_enviado = CASE
    WHEN estado = 'Acreditado 2026' OR estado = 'Acreditado a 2026' THEN true
    WHEN estado = 'En proceso de Acreditacion' THEN true
    ELSE false
  END,
  enviado_ministerio = CASE
    WHEN estado = 'Acreditado 2026' OR estado = 'Acreditado a 2026' THEN true
    ELSE false
  END,
  acreditacion_recibida = CASE
    WHEN estado = 'Acreditado 2026' OR estado = 'Acreditado a 2026' THEN true
    ELSE false
  END;

COMMIT;
