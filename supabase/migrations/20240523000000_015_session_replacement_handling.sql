-- Agregar columna close_reason para diferenciar entre logout explícito y reemplazo por nuevo login
-- Este cambio permite que sesiones reemplazadas por nuevo login permanezcan como válidas
-- sin mostrar molesto mensaje al usuario

ALTER TABLE public.auth_audit_sessions
ADD COLUMN IF NOT EXISTS close_reason TEXT
  CHECK (close_reason IS NULL OR close_reason IN ('logout', 'replaced'));

-- Comentario para documentar: 
-- close_reason = 'logout' -> Cierre explícito del usuario (debe mostrar mensaje)
-- close_reason = 'replaced' -> Sesión reemplazada por nuevo login (NO mostrar mensaje)
-- close_reason = NULL -> Sesión aún activa
