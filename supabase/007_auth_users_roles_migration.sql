-- Migracion de roles para usuarios de acceso
ALTER TABLE public.auth_app_users
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.auth_app_users
SET role = 'administrador'
WHERE role IS NULL;

ALTER TABLE public.auth_app_users
  ALTER COLUMN role SET DEFAULT 'usuario';

ALTER TABLE public.auth_app_users
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.auth_app_users
  DROP CONSTRAINT IF EXISTS auth_app_users_role_check;

ALTER TABLE public.auth_app_users
  ADD CONSTRAINT auth_app_users_role_check
  CHECK (role IN ('administrador', 'usuario', 'visualizador'));

CREATE INDEX IF NOT EXISTS idx_auth_app_users_role
  ON public.auth_app_users(role);
