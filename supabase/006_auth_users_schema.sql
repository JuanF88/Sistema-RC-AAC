-- Usuarios de acceso para login interno
CREATE TABLE IF NOT EXISTS public.auth_app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'usuario' CHECK (role IN ('administrador', 'usuario', 'visualizador')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT auth_app_users_username_lowercase_check CHECK (username = lower(username))
);

-- Compatibilidad: si la tabla ya existia sin la columna role, agregarla.
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

CREATE INDEX IF NOT EXISTS idx_auth_app_users_is_active
  ON public.auth_app_users(is_active);

CREATE INDEX IF NOT EXISTS idx_auth_app_users_role
  ON public.auth_app_users(role);

ALTER TABLE public.auth_app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read auth app users" ON public.auth_app_users;
CREATE POLICY "Allow public read auth app users" ON public.auth_app_users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert auth app users" ON public.auth_app_users;
CREATE POLICY "Allow authenticated insert auth app users" ON public.auth_app_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update auth app users" ON public.auth_app_users;
CREATE POLICY "Allow authenticated update auth app users" ON public.auth_app_users
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_auth_app_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auth_app_users_updated_at ON public.auth_app_users;
CREATE TRIGGER trigger_auth_app_users_updated_at
BEFORE UPDATE ON public.auth_app_users
FOR EACH ROW
EXECUTE FUNCTION update_auth_app_users_updated_at();

GRANT SELECT ON public.auth_app_users TO anon, authenticated;
GRANT INSERT, UPDATE ON public.auth_app_users TO authenticated;

-- Usuario inicial: admin / admin1234
-- hash SHA-256(admin1234): ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270
INSERT INTO public.auth_app_users (username, password_hash, display_name, role, is_active)
VALUES ('admin', 'ac9689e2272427085e35b9d3e3e8bed88cb3434828b43b86fc0596cad4c6e270', 'Administrador', 'administrador', true)
ON CONFLICT (username)
DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
