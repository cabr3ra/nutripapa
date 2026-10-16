# AGENTS.md

## Project

- **Goal:** NutriPapa es una web app instalable (móvil y PC) donde el padre del autor registra de forma rápida y visual lo que come cada semana: 5 momentos al día, agua, WC, pasos y peso. Puede reutilizar comidas que ya apuntó antes y comparte la semana con su nutricionista en PDF o imagen. Sustituye al papel y boli, y le enseña de forma sencilla si su evolución va bien o mal.
- **Audience:** un único usuario (el padre). La nutricionista solo recibe el PDF; no usa la app. Debe ser fácil para cualquier persona.
- **Project type:** software — web app instalable (PWA), usada en móvil y PC.

## Doc map

- `planning/product.md` — qué es, para quién, fuera de alcance
- `planning/architecture.md` — registro de decisiones técnicas
- `planning/styles.md` — estilo visual y de código
- `planning/roadmap.md` — índice de specs
- `planning/specs/NNN-name/` — requirements / design / tasks por spec
- `.specloop/interview.md` — respuestas de la entrevista

## Stack & conventions

- React + Vite + TypeScript, PWA (offline + sync). Sin backend propio: `supabase-js` directo a Supabase (Postgres, Auth, Storage), seguridad por RLS.
- pnpm · Vitest · ESLint + Prettier. Antes de dar un cambio por bueno: `pnpm lint`, `pnpm test`, `pnpm build`.
- Migraciones SQL en `supabase/migrations/` (Supabase CLI); el agente las aplica al proyecto remoto.
- Deploy: Cloudflare Pages, push a `main` = producción. CI GitHub Actions informativo (no bloquea).
- Secretos: solo `.env.local` (gitignored). Nunca commitear ni meter en el bundle la clave secret/service_role, el token CLI, la contraseña de BD ni el código de acceso.
- Coste 0: solo planes gratuitos. Sin servicios externos de errores; el estado de sincronización se muestra en la app.
- Node 24 LTS. PWA con `vite-plugin-pwa` (`generateSW`). Colores solo vía tokens de `src/styles/tokens.css`. Código por feature en `src/features/<feature>/`.
- Supabase: migraciones solo con `supabase db push` (CLI global, auth por env vars del usuario). El MCP de Supabase (`.mcp.json`) es de solo lectura: úsalo para inspeccionar, nunca para escribir.
- BD: valores cerrados como `text` + `check`, no enums. RLS se verifica con `supabase db query --linked -f supabase/tests/rls_check.sql` (siempre con rollback). Tipos en `src/lib/database.types.ts` (`supabase gen types typescript --linked`).
- Cloudflare Pages: sin `_redirects` ni `404.html` en la raíz (Pages sirve la SPA por defecto).
- Auth: un único cliente en `src/lib/supabase.ts`; rutas con `react-router` envueltas en `RequireAuth`; `signOut({ scope: 'local' })`. Nunca probar `signUp` real contra producción: usar `pnpm check:signup`.
- Detalle y motivos: `planning/architecture.md`.

## Style

Detalle y tokens: `planning/styles.md`.

- **HARD:** paleta salvia y crema (`#F5EFE6` fondo · `#EDE8D0` superficie · `#9CAF88` principal · `#E2725B` acento · `#36454F` texto); ningún color fuera de ella.
- **HARD:** sin ventanas emergentes ni modales; paneles integrados.
- DEFAULT: Nunito; diseño espacioso (táctil); solo modo claro; contraste WCAG AA.
- DEFAULT: textos de la UI en español, tuteo cercano y cálido, pocos emojis.
- DEFAULT: identificadores en inglés, comentarios en español, Conventional Commits.
- Dispositivos objetivo: Android + Edge/Chrome en PC.

## Rules for agents

- **Nunca borrar datos reales de Supabase** (producción: proyecto `jojumjyqxpqzaslbxrso`). Migraciones destructivas o `DELETE`/`TRUNCATE`/`DROP` sobre datos reales: prohibido.
- Comentarios de código en español.
- Herramientas disponibles: `run` (arrancar la app), `claude-in-chrome` (revisar en navegador), `dataviz` (gráficas), `code-review`, `security-review` (sobre todo RLS).
