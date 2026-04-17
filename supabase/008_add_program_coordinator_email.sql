-- Minimal migration: add the new coordinator and alert observation fields
-- Safe to run multiple times because it uses IF NOT EXISTS.

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS program_coordinator_email TEXT;

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS program_coordinator_title TEXT;

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS observaciones_alerta_rrc TEXT;

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS observaciones_alerta_acreditados TEXT;
