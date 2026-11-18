# Sistema Órbita (repo Sistema-RC-AAC)

Dashboard interno de la Universidad del Cauca, del CGCAI (Centro de Gestión de la Calidad y la Acreditación Institucional), para el seguimiento del Registro Calificado (RC) y la Acreditación de Alta Calidad (AAC) de ~127 programas académicos. Incluye matriz editable, alertas de vencimiento por correo, reportes, visitas de pares, estadísticas e historial (instantáneas y cortes mensuales). La interfaz y los textos están en español. Corre en producción en Vercel y guarda los datos en Supabase.

## Comandos y verificación

- `npm run dev`: en esta máquina el puerto 3000 lo ocupa otro proyecto, así que arranca en **3001**.
- Antes de dar algo por terminado: `npx tsc --noEmit` (limpio), `npx eslint src` y `npm run build`. La línea base de ESLint es **35 problemas (8 errores, 27 warnings)**, todos preexistentes: 2 comillas sin escapar en `HistorialView.tsx` y 6 `any` en los tooltips de `estadisticas/`. Ese número no debe subir.
- No hay tests automatizados ni `middleware`/`proxy`: cada ruta de API valida su propia sesión.

## Arquitectura

- Stack: Next.js 16.2 App Router (Turbopack), React 19 y TypeScript estricto. Estilos con CSS Modules por vista (Tailwind v4 solo en `globals.css`). Datos con `@supabase/supabase-js`, usando un cliente admin con service role que se crea dentro de cada ruta. Excel con ExcelJS y `xlsx`, correo con nodemailer, gráficos con Highcharts y Recharts, y three.js para el fondo 3D del login (`public/result.glb`).
- Páginas:
  - `/`: privada. Llama a `getSessionFromServerCookies()` y a `getConsolidadoDashboard()` y monta `ConsolidadoDashboardClient`.
  - `/login`.
  - `/info`: pública, solo muestra estadísticas.
- `src/components/consolidado/ConsolidadoDashboardClient.tsx` concentra el estado: filtros, vista activa, programa seleccionado, modal de edición, historial de alertas, bloqueo a una sola pestaña (localStorage + heartbeat) y sondeo de sesión.
- Las vistas se eligen con el estado `view`, no con rutas: `consolidado`, `alertas`, `registro-calificado`, `acreditacion-programas`, `visitas-pares`, `estadisticas`, `historial` y `usuarios`. `usuarios` es "Configuración", con tres pestañas: Usuarios (solo admin), Configuración de Alertas y Gestores de Calidad.
- Vistas en `src/components/consolidado/views/`:
  - `ConsolidadoMatrixView`: tabla con columnas `COLUMNS` y exportes visible/completo.
  - `ExpirationAlertsView`: alertas, con su pestaña de estadísticas en `alertas/`.
  - `RegistroCalificadoView` y `AcreditacionProgramasView`.
  - `VisitasParesView`.
  - `EstadisticasView` (con `estadisticas/`).
  - `HistorialView`, con pestañas instantáneas, cortes mensuales y correos.
  - `UsersManagementView`, `AlertasConfigView` y `GestoresCalidadView`.
  - `ProgramEditModal`: formulario del programa.
- `common/FiltersBar` aparece en consolidado, registro y acreditación.
- Código muerto (nadie lo importa): `views/FacultyView.tsx`, `views/ProgramDetailView.tsx` y `src/components/consolidado-dashboard.tsx`.

### `src/lib` (fuentes únicas de verdad)

- `consolidado.ts`: tipo `ConsolidadoProgram` (el modelo; `ProgramRecord` es un alias), `mapSupabaseRow` (alias de columnas tolerantes con `getFirst`), `mapExcelRow` (columnas por letra) y KPIs. El respaldo a Excel lee `Consolidado-RC AAC  GENERAL (3).xlsx`, que ya no existe (solo hay `(4)`). Si Supabase falla, la página falla.
- `alertSchedule.ts`: meses de cada alerta y `addMonthsToIsoDate` (ancla al fin de mes). Toda la aritmética de meses pasa por aquí.
- `auth.ts`: cookie `siac_session` (HMAC, 8 h). Roles `administrador | usuario | visualizador`. Los usuarios salen de `auth_app_users` (SHA-256) o de variables `AUTH_*`. En las rutas se usa `getSessionFromRequest(request)`. Hay sesión única por usuario mediante `auth_audit_sessions`.
- `audit.ts`: `registerChangeAudit({ sessionId, username, action: "CREATE"|"UPDATE"|"DELETE", resource, details })`.
- `email.ts`: `sendEmail({ to, cc, bcc, subject, html, attachments, audit: { source, actorUsername } })`. Cada envío queda registrado en `notifications_email_audit`.
- `cortes-mensuales.ts`: cortes mensuales en `historicos-database/cortes/corte-YYYY-MM_N-programas.xlsx`. Nunca se sobrescriben. El cron llama a `ensureMonthlyCortes()`.
- `locations.ts`: varios lugares en `location`, separados por `"; "`. Toda lectura pasa por `parseLocations`/`normalizeLocations`.
- `qualityManagers.ts`: gestores de calidad por facultad, que reciben copia de las alertas.
- `duration.ts`, `methodology.ts` y `export.ts` (`exportToExcel`, del lado cliente).
- `src/templates/templates.js`: plantillas HTML de correo, en ESM `.js` tipado con JSDoc: `buildAlertTemplate`, `buildProfessionalTemplateFromText` y `buildCredentialsTemplate`. Siguen reglas de correo: tablas, estilos en línea, sin JS y `bgcolor` de respaldo para los degradados.

### API (`src/app/api`)

"Escritura" significa que exige sesión y devuelve 403 al rol `visualizador`. La interfaz no oculta los botones.

| Ruta | Métodos | Protección |
|---|---|---|
| `auth/login`, `auth/logout`, `auth/session` | POST, POST, GET | — |
| `auth/users`, `auth/users/[id]` | GET POST, PATCH DELETE | solo administrador |
| `consolidado-programas`, `consolidado-programas/[id]` | POST, PATCH DELETE (borrado físico) | escritura |
| `consolidado-programas/[id]/documents(/[docId])` | GET / POST DELETE | GET **sin sesión**; el resto, escritura |
| `acreditacion-estados(/[programId])` | GET / PUT | GET **sin sesión** |
| `acreditacion-historicos(/[id])` | GET / POST PATCH DELETE | GET **sin sesión** |
| `visitas-pares(/[id])` | GET / POST PATCH DELETE | GET **sin sesión** |
| `gestores-calidad(/[id])` | GET / POST PATCH DELETE | GET **sin sesión**; no registra auditoría |
| `notifications/alertas` | GET / POST (enviar o marcar alerta) | GET **sin sesión** |
| `notifications/recipients(/[id])` | GET / POST PATCH DELETE | GET **sin sesión**; no registra auditoría |
| `notifications/send`, `notifications/test-smtp` | POST | escritura |
| `notifications/email-history` | GET | sesión |
| `notifications/snapshot-settings` | GET PATCH | sesión / escritura |
| `historial/export-snapshot` | GET (lista), POST (genera y envía correo) | **ninguna** |
| `historial/cortes` | GET, POST | **ninguna** |
| `cron/snapshots` | GET | `Bearer CRON_SECRET` (si no hay secreto, basta el header `x-vercel-cron`) |

### Datos (Supabase)

- Tablas:
  - `consolidado_programas`: entidad central, columnas snake_case.
  - `consolidado_documentos`.
  - `acreditacion_estados_programa`: su `estado` se compara por texto exacto, p. ej. `"En proceso de Acreditacion"` sin tilde. Cambiarlo exige migrar el CHECK y los datos a la vez.
  - `acreditacion_historicos` y `visitas_pares`.
  - `gestores_calidad`, con UNIQUE (`faculty`, `full_name`).
  - `auth_app_users`, `auth_audit_sessions` y `auth_audit_events`.
  - `notifications_recipients`, `notifications_snapshot_settings` (una fila, `id = "default"`), `notifications_email_audit` y `notifications_alertas_envios` (con `cycle_date`).
- Storage: `historicos-database` (en la raíz `snapshot-<timestamp>.xlsx`; en `cortes/` los cortes) y `documentos`. El código usa `getPublicUrl`, así que los buckets son públicos.
- Migraciones: `supabase/NNN_*.sql`, aplicadas a mano en el SQL Editor de Supabase (no hay CLI). La numeración es irregular: hay dos `018` y en `migrations/` hay un `015` y un `019`. Aplicadas hasta `022_gestores_calidad.sql`; la siguiente es **023**. Escríbelas idempotentes (`IF NOT EXISTS`) y refleja el cambio en `001_consolidado_schema.sql`.
- ⚠ `001_consolidado_schema.sql` empieza con `DROP TABLE ... CASCADE`. **Nunca** se vuelve a ejecutar.
- ⚠ Scripts de datos:
  - `npm run sync:consolidado` sobrescribe filas con el Excel de abril. Hoy la fuente de verdad es la BD.
  - `sync:visitas-pares` duplica registros si se repite.
  - `sync:coordinadores` es dry-run salvo `:apply`.
- Cron: `vercel.json` llama `GET /api/cron/snapshots` cada día a las 13:00 UTC. Primero ejecuta `ensureMonthlyCortes()` y después la instantánea según `notifications_snapshot_settings`.

## Dominio

- **RC**: Registro Calificado (MEN). **RRC**: su renovación. **AAC**: Acreditación de Alta Calidad. **CGCAI**: la oficina que recibe la documentación. **SNIES**: código nacional del programa. `process_code` es el "Código proceso".
- Modelo de fechas, igual para RC y AAC:
  - **Entrega CGCAI** = vencimiento − 14 meses.
  - **Plazo MinEducación** = vencimiento − 12 meses.
  - Plan de mejora AAC = mitad de la vigencia.
  - `ProgramEditModal` las autocalcula con `addMonthsToIsoDate`.
- Nombre heredado: `rc_siga`/`rcSiga` es la **fecha de entrega al CGCAI del RC**. SIGA ya no se usa, todo es CGCAI. Siguen las etiquetas "RC SIGA" y "SiGA RRC" en la matriz, el modal, la instantánea y los cortes. El equivalente en AAC es `aac_cgcai_delivery`.
- Alertas:
  - Tipos: `AlertType = "rrc" | "aac"` × `AlertKind = "inicio" | "recordatorio" | "entrega"`, es decir, 6 correos.
  - Calendario: inicio = vencimiento − 24 m; recordatorio = entrega CGCAI − 6 m; entrega = entrega CGCAI − 1 m.
  - El botón se habilita desde 1 mes antes (`ALERT_EARLY_SEND_MONTHS`).
  - El bloqueo por fecha existe **solo en el cliente**, en `buildMomentStatus`, que está duplicado en `ExpirationAlertsView` y `ConsolidadoDashboardClient`. Hay que cambiar los dos.
  - El envío (`POST notifications/alertas`) va a `program_coordinator_email` (formato `"institucional; personal"`), con copia a los correos **institucionales** de los gestores activos de la facultad, y crea una fila en `notifications_alertas_envios`.
  - "Marcar enviado" crea la misma fila sin correo. `email_sent` se deduce al leer: se cruza con `notifications_email_audit` por `source = "alerta-<tipo>-<kind>"`, destinatario y una ventana de 5 min.
  - El saludo es genérico ("Estimado(a) coordinador(a)") y el contacto es `acredigral@unicauca.edu.co`.
- Filtro de estado: `programStatusFilter` arranca en `["Activos"]` y gobierna la tabla, las tarjetas KPI y la descarga en las tres vistas de reporte.
  - Alertas, visitas, estadísticas e historial reciben `activePrograms`.
  - Las instantáneas solo incluyen programas activos. Los cortes incluyen todos, con columna Estado.

## Convenciones

- **Agregar un campo al programa** toca todo esto:
  1. Migración SQL.
  2. Tipo `ConsolidadoProgram`.
  3. `mapSupabaseRow`, con sus alias.
  4. `mapExcelRow` (`null` si no hay columna).
  5. `createEmptyProgramDraft` en `ConsolidadoDashboardClient`.
  6. `ProgramEditModal`: `FormState`, estado inicial, `mapProgramToForm`, `buildProgramPayload` y el `<Field>`.
  7. El mapeo del payload en `consolidado-programas/route.ts` (POST) y en `[id]/route.ts` (PATCH).
  8. Las columnas de `ConsolidadoMatrixView` (visibles y `FULL_EXPORT_COLUMNS`), los `bdColumns` de `export-snapshot` y `COLUMNS` de `cortes-mensuales`.
- **Fechas**: se guardan como ISO `YYYY-MM-DD` y se comparan bien como texto. **Nunca** formatees con `new Date(iso).toLocaleDateString()` sin `timeZone: "UTC"`: en Bogotá (UTC−5) muestra el día anterior. En la UI usa `formatDate` de `components/consolidado/utils.ts`; en el servidor, formatea a partir del texto.
- Los textos de la UI van en español con tildes y ortografía correctas; el usuario las revisa. Los comentarios del código van en español y, por convención existente, sin tildes.
- Patrones de UI:
  - Botón "Nuevo …" arriba a la derecha (`.createButton`, píldora con degradado `#fc6f5b → #fe965e`).
  - Encabezados ordenables (`SortField` + `getSortIndicator` "↕/↑/↓"; referencia: `AcreditacionProgramasView`).
  - Modales con `createPortal` y fondo a pantalla completa.
  - Edición en línea con estado `editingId` (referencia: `GestoresCalidadView`).
- El navegador nunca escribe directo en Supabase; todo pasa por `/api`.

## Entorno de desarrollo (Windows)

- La mayoría de archivos tiene finales de línea **CRLF**. La herramienta Edit funciona; los reemplazos multilínea con `perl -0pi`/`sed` fallan en silencio. Verifica siempre el resultado.
- Los heredocs (`cat <<'EOF'`) y `node -e "..."` se comen las barras invertidas y rompen las regex. Los scripts con regex se escriben con la herramienta Write.
- No hay `python`; Node es v22.
- Un script fuera del repo que necesite dependencias del proyecto usa `createRequire("C:/Users/piper/Desktop/Sistema-RC-AAC/package.json")` y se ejecuta desde la raíz con `node --env-file=.env.local <script>`. Nunca imprimas el contenido de `.env.local`.
