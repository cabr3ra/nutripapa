# Architecture

## Container

PWA estática (React SPA) servida por Cloudflare Pages. Habla directamente con Supabase (Postgres + Auth + Storage) vía `supabase-js`. Sin backend ni API propia. Funciona sin conexión y sincroniza al volver la red.

## Stack

| Decision | Choice | Why |
|---|---|---|
| Runtime / lenguaje | TypeScript en navegador | Sin servidor propio; Python en servidor descartado (pieza extra, hosting gratis se duerme) |
| Framework | React + Vite, PWA | Usuario prefiere React; PWA instalable en móvil y PC |
| Datastore | Supabase Postgres (proyecto `jojumjyqxpqzaslbxrso`, eu-west-1, Postgres 17) | SQL (preferencia del usuario), gratis, auth + storage incluidos |
| Archivos | Supabase Storage para PDFs enviados | Historial de cada PDF tal como se envió |
| Migraciones | SQL en `supabase/migrations/` (Supabase CLI); el agente las aplica al remoto | Decisión del usuario |
| Interface | `supabase-js` directo, seguridad por RLS | Sin API propia (decisión del usuario) |
| Identidad | Un único acceso fijo creado por el usuario; el padre introduce un código una vez por dispositivo; sesión persistente | Sin cuentas para el padre; datos de salud protegidos. Google OAuth descartado |
| Hosting | Cloudflare Pages, auto-deploy desde `main`, previews por rama | Free tier sin límite de ancho de banda |
| Toolchain | pnpm · Vitest · ESLint + Prettier (`pnpm test`, `pnpm lint`, `pnpm build`) | Estándar React+Vite; aceptado por el usuario |
| CI | GitHub Actions: lint + test + build en cada push, **no bloqueante** | Decisión del usuario |
| Verificación | Vitest unitarios para lógica + prueba manual (usuario y padre). Sin E2E/Playwright por ahora | Decisión del usuario |
| Observabilidad | Indicador de estado de sincronización en la app; sin servicios externos | Que el padre nunca pierda datos sin saberlo |
| Third-party | Supabase, Cloudflare, GitHub (todos gratis) | Restricción: coste 0 |
| Node | 24 LTS (`.nvmrc`, `engines`) | LTS activa al arrancar (001) |
| PWA | `vite-plugin-pwa`, `generateSW`, auto-update | Manifest + SW generados (001) |
| Estilos base | Tokens CSS en `src/styles/tokens.css` | Paleta HARD en un solo sitio (001) |
| Estructura | `src/features/<feature>/`, `src/lib/`, `src/styles/`, `src/test/` | Elegida por el agente (001) |
| Supabase CLI | Global vía Scoop; auth por `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` (env de usuario) | Sin login interactivo; no depende de 001 (002) |
| Supabase MCP | Endpoint alojado en `.mcp.json`, `project_ref=jojumjyqxpqzaslbxrso`, `read_only=true`, OAuth | Inspección segura; escrituras solo por migraciones (002) |
| Aplicar migraciones | Siempre `supabase db push` | Historial versionado (002) |
| Valores cerrados en BD | `text` + `check (… in (…))`, no enums de Postgres | Más fácil de ampliar con migraciones no destructivas (003) |
| Verificar RLS | `supabase/tests/rls_check.sql` vía `supabase db query --linked`, un bloque `DO` que acaba siempre en `raise exception` (rollback) | Probar RLS en remoto sin dejar datos (003) |
| Tipos de BD | `src/lib/database.types.ts` generado con `supabase gen types typescript --linked` | Tipado de `supabase-js` desde el esquema real (003) |
| Fallback SPA | Comportamiento por defecto de Pages (sin `404.html` → `index.html`); sin `_redirects` | Cloudflare ya lo hace; `_redirects` sobraba (005) |
| Rutas | `react-router` (modo librería, `createBrowserRouter`); `RequireAuth` envuelve todas las rutas | Estándar en SPA React; rutas reales para 005/006+ (004) |
| Cerrar sesión | `signOut({ scope: 'local' })` | Cerrar en un dispositivo no saca a los demás (004) |
| Acceso a datos | Funciones en `src/features/<feature>/api.ts` sobre el cliente único; sin librería de fetching/caché hasta 010 | 010 decidirá la capa offline sin reescribir pantallas (006) |
| Operaciones de varias filas | Funciones Postgres `security invoker`, `search_path = ''`, `execute` solo `authenticated`, llamadas con `rpc` | Atómicas y sujetas a RLS (006) |
| Fechas | Texto `YYYY-MM-DD` en hora local, aritmética de días, `Intl` para textos; sin librería | Sin desfases por zona/cambio de hora (006) |
| Breakpoint móvil | `48rem`: por debajo un día + tira de días; por encima 7 columnas | Diseño de 006 |
| Comprobar registro desactivado | `GET /auth/v1/settings` → `disable_signup: true` (`pnpm check:signup`) | Verificar sin crear usuarios en producción (004) |

### Data model

- **Semana** — nº (semana 1 = lun 19-oct-2026), lunes de inicio, título fijo "CONTROL SEMANAL de COMIDAS", nº menú opcional.
- **Comida de catálogo** — nombre, favorita sí/no.
- **Entrada de comida** — semana, día, momento (desayuno · media mañana · comida · media tarde · cena), comida de catálogo, cantidad + unidad.
- **Registro diario** — agua (L), nº pis, nº caca, pasos; más tarde peso y km.
- **PDF enviado** — semana, fecha de generación, archivo en Storage.

## Conventions

TBD — fill via Q&A

## Fixed rules

- Coste 0: solo planes gratuitos.
- Nunca en el repo ni en el bundle: clave `sb_secret_…`/service_role, access token de Supabase CLI, contraseña de la BD, código de acceso del padre. `.env.local` gitignored; `.env.example` sin valores.
- RLS activado en todas las tablas: solo el acceso del padre lee y escribe.
- Supabase free pausa tras 7 días sin actividad (se reactiva a mano).

## Still to define

## Declined

- Backend Python/FastAPI — pieza extra sin beneficio.
- Streamlit/Reflex — mala PWA, drag & drop y offline pobres.
- Google OAuth — el padre no quiere cuenta.
- Sentry u otros servicios de errores — sin servicios externos.
- Playwright/E2E — no por ahora.
