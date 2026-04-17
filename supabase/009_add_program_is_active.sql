-- Soft deactivate support for programs.
-- Default keeps existing and new records active unless explicitly deactivated.

ALTER TABLE public.consolidado_programas
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
