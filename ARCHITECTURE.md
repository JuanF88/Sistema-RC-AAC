# Arquitectura tecnica - Sistema RC AAC

## Proposito del documento
Este documento describe la arquitectura tecnica del sistema, sus modulos principales, flujos de datos, API, modelo de datos en Supabase, ejecucion de tareas y despliegue. El enfoque es para equipo de desarrollo.

## Resumen ejecutivo
- Plataforma web construida con Next.js (App Router) y React 19.
- Datos persistidos en Supabase (Postgres + Storage + RLS) y consumidos via @supabase/supabase-js.
- API interna en rutas /api para autenticar, gestionar programas, documentos, visitas, historicos y notificaciones.
- Exportaciones a Excel con ExcelJS y notificaciones por correo via SMTP (nodemailer).
- Cron programado en Vercel para snapshots automatizados.

## Stack tecnologico
- Frontend: Next.js 16 (App Router), React 19, CSS Modules + Tailwind v4 (via PostCSS).
- Backend: API Routes de Next.js (Edge/Node segun runtime por defecto).
- Base de datos: Supabase (Postgres), RLS habilitado.
- Storage: Supabase Storage para documentos.
- Email: SMTP via nodemailer, auditoria en BD.
- Data import: scripts Node + XLSX/ExcelJS.
- Visualizacion: Highcharts + Recharts.

## Estructura de carpetas
- src/app: rutas de UI y API (App Router).
- src/components: UI del dashboard, vistas y widgets.
- src/lib: logica de negocio, auth, auditoria, export, email.
- supabase: esquemas SQL y migraciones.
- scripts: sincronizacion de datos desde Excel a Supabase.

## Rutas principales (UI)
- /: dashboard privado, requiere sesion.
- /login: formulario de autenticacion.
- /info: vista publica de informacion (sin login).

## Arquitectura de front-end
- Componente central: ConsolidadoDashboardClient maneja tabs, filtros y estado del dashboard.
- Vistas principales:
  - Consolidado (matriz editable)
  - Alertas (vencimientos RRC/AAC)
  - Registro calificado (agrupaciones por programa/facultad)
  - Acreditacion programas
  - Visitas de pares
  - Estadisticas
  - Historial (snapshots + auditoria de email)
  - Usuarios (administrador)
- Exportaciones a Excel se generan del lado cliente con ExcelJS.
- Uso de CSS Modules por vista para estilos aislados.

## Patrones de diseno y organizacion de la pagina
- Layout base con RootLayout y estilos globales en globals.css.
- Shell de dashboard con SidebarMenu y DashboardHeader como piezas persistentes.
- Navegacion por tabs internos (estado local) en lugar de rutas separadas por cada vista.
- Vistas desacopladas por funcion (views/*) con widgets reutilizables (widgets/*).
- Filtros y acciones encapsulados en FiltersBar para consistencia de UI.
- Exportaciones y acciones pesadas disparadas desde el cliente (botones flotantes).
- Uso de CSS Modules por vista y componentes para evitar colisiones de estilo.

## Arquitectura de back-end (API)
API interna expuesta en /api/* con validaciones de sesion y roles.

### Autenticacion y sesiones
- POST /api/auth/login: valida credenciales y emite cookie de sesion.
- POST /api/auth/logout: revoca sesion en auditoria y limpia cookie.
- GET /api/auth/session: consulta sesion activa.
- Usuarios:
  - GET/POST /api/auth/users
  - PATCH/DELETE /api/auth/users/{id}

### Consolidado de programas
- POST /api/consolidado-programas: crea programa.
- PATCH /api/consolidado-programas/{id}: actualiza programa y sincroniza estado de acreditacion.
- Documentos por programa:
  - GET/POST /api/consolidado-programas/{id}/documents
  - DELETE /api/consolidado-programas/{id}/documents/{docId}

### Acreditacion
- GET /api/acreditacion-estados
- PUT /api/acreditacion-estados/{programId}
- GET/POST /api/acreditacion-historicos
- PATCH/DELETE /api/acreditacion-historicos/{id}

### Visitas de pares
- GET/POST /api/visitas-pares
- DELETE /api/visitas-pares/{id}

### Notificaciones
- POST /api/notifications/send: envio manual.
- POST /api/notifications/test-smtp
- GET/POST/PATCH/DELETE /api/notifications/recipients
- GET /api/notifications/email-history
- GET/PATCH /api/notifications/snapshot-settings

### Historial / snapshots
- GET/POST /api/historial/export-snapshot: genera y lista snapshots.
- GET /api/cron/snapshots: cron de Vercel para ejecucion programada.

## Flujo de datos (alto nivel)
1) Usuario inicia sesion en /login -> /api/auth/login emite cookie.
2) / carga dashboard; servidor obtiene sesion y datos (getConsolidadoDashboard).
3) UI consulta API para operaciones CRUD (programas, documentos, visitas, historicos).
4) Cambios se registran en auditoria (auth_audit_events).
5) Snapshots: usuario o cron genera Excel, se almacena en Storage y notifica via SMTP.

## Logica de negocio relevante
- getConsolidadoDashboard (src/lib/consolidado.ts):
  - Obtiene datos desde Supabase o Excel, normaliza campos, calcula KPIs.
  - Deriva fechas relevantes (rc_end, aac_end, etc) y estados.
- Auth (src/lib/auth.ts):
  - Sesion firmada con HMAC, cookie httpOnly.
  - Usuarios desde BD (auth_app_users) o variables de entorno.
- Auditoria (src/lib/audit.ts):
  - Sesiones y eventos de cambio en tablas auth_audit_sessions y auth_audit_events.
- Email (src/lib/email.ts):
  - Envia via SMTP y registra auditoria (notifications_email_audit).

## Modelo de datos (Supabase)
Esquemas definidos en supabase/*.sql y migrations/.

### Tablas principales
- consolidado_programas: entidad central del programa academico.
- consolidado_documentos: documentos o URLs asociados a programas.
- acreditacion_estados_programa: estado editable por programa.
- acreditacion_historicos: historicos agregados para metricas.
- visitas_pares: seguimiento de visitas.
- auth_app_users: usuarios de autenticacion interna.
- auth_audit_sessions / auth_audit_events: auditoria de login y cambios.
- notifications_recipients: destinatarios de emails.
- notifications_snapshot_settings: configuracion de cron.
- notifications_email_audit: auditoria de correos.

### Storage
- Bucket: documentos (publico) para archivos del programa.

### RLS
- RLS habilitado en todas las tablas principales.
- Politicas: lectura publica en varias tablas y escritura autenticada.

## Seguridad
- Cookie de sesion httpOnly y secure en produccion.
- Validacion de rol en endpoints sensibles (visualizador sin permisos de escritura).
- Acceso admin a Supabase con SUPABASE_SERVICE_ROLE_KEY en API routes.
- Cron protegido con CRON_SECRET o header x-vercel-cron.

## Integraciones externas
- Supabase: persistencia y storage.
- SMTP: envio de correos (notificaciones y pruebas).
- Vercel Cron: ejecucion programada de snapshots.

## Configuracion y variables de entorno
Variables esperadas (segun uso en codigo):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY (opcional en lecturas)
- SUPABASE_SERVICE_ROLE_KEY
- AUTH_SESSION_SECRET
- AUTH_USERS_JSON (opcional) o AUTH_USERNAME / AUTH_PASSWORD / AUTH_DISPLAY_NAME / AUTH_ROLE
- SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / SMTP_FROM
- CRON_SECRET (opcional para cron)
- NODE_ENV

## Scripts de datos
- scripts/sync-consolidado-to-supabase.mjs: carga Excel principal.
- scripts/sync-visitas-pares-to-supabase.mjs: carga visitas.
- scripts/sync-coordinadores-to-supabase.mjs: actualiza coordinadores.
- scripts/migrate-urls-to-documents.mjs: migra URLs a documentos.

## Despliegue
- Next.js desplegado en Vercel.
- Cron en vercel.json: /api/cron/snapshots (13:00 UTC).
- Requiere variables de entorno configuradas en Vercel.

## Observabilidad y auditoria
- Auditoria de sesiones y cambios en BD.
- Auditoria de emails enviados/errores.
- Logs de errores en API via console/error.

## Riesgos y puntos de atencion
- Uso de service role key en API implica asegurar secretos en entorno.
- RLS permite lectura publica de varias tablas; revisar si aplica a todo el dataset.
- Validaciones de datos dependen de normalizaciones en API; mantener alineado con esquemas SQL.
- Cron depende de sincronizacion de timezone y configuracion de notifications_snapshot_settings.

## Sugerencias de mejora (opcional)
- Documentar contratos JSON por endpoint en un OpenAPI.
- Agregar pruebas de API para reglas de rol y validaciones.
- Centralizar validaciones compartidas (schema validation).
