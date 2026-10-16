# 001 — project-setup — Requirements

## What's being built

La base del repositorio sobre la que se construyen todas las specs: rama principal `main`,
app React + Vite + TypeScript configurada como PWA instalable, con pnpm, ESLint + Prettier,
Vitest, plantilla de variables de entorno y CI en GitHub Actions. Incluye un esqueleto de UI
vacío con la paleta y la fuente ya cargadas como tokens, para que las specs siguientes no
inventen estilos.

## Who/what it serves

- El agente, en todas las specs siguientes: 003, 005 y 006–016 dependen directa o
  indirectamente de esta.
- El usuario: puede arrancar la app en local y ver el CI desde el primer día.

## Hard constraints

- Stack fijo (architecture.md): React + Vite + TypeScript, pnpm, Vitest, ESLint + Prettier.
- Node.js 24 LTS, fijado en `.nvmrc` y en `engines` _(standard: Node 24 es la LTS activa hoy (pasa a mantenimiento el 20-oct-2026, EOL abr-2028); Node 26 será LTS el 28-oct-2026 — https://github.com/nodejs/release#release-schedule)_
- PWA con `vite-plugin-pwa`: manifest con `name`, `short_name`, iconos de 192×192 y 512×512 (más uno maskable), `display: standalone`, `theme_color`/`background_color` de la paleta; service worker generado. Requiere HTTPS en producción _(standard: campos requeridos del manifest y requisito HTTPS para service workers — documentación de vite-plugin-pwa, vía índice Algolia del repo https://docsearch.algolia.com/mcp/docs/repo/vite-pwa/vite-plugin-pwa; fuente secundaria, la oficial no se pudo abrir)_
- Los iconos son provisionales (placeholder con la paleta) hasta que el usuario decida el diseño _(judgement, no standard)_
- Comandos: `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm dev`.
- CI en GitHub Actions en cada push: lint + test + build, **no bloqueante** (`continue-on-error`) _(standard: `continue-on-error` evita que un fallo detenga el job — notas KodeKloud https://notes.kodekloud.com/docs/GitHub-Actions/Continuous-Integration-with-GitHub-Actions/Using-continue-on-error-expression; secundaria, falta confirmar en docs.github.com)_
- `pnpm/action-setup` no instala Node, así que se usa junto con `actions/setup-node` _(standard: https://docsearch.algolia.com/mcp/docs/repo/pnpm/action-setup — índice del repo oficial)_
- `.env.local` en `.gitignore`; `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` sin valores. Ningún secreto en el repo.
- Tokens CSS de la paleta (HARD) y fuente Nunito cargada. Solo modo claro.
- Identificadores en inglés, comentarios en español, Conventional Commits.

## Acceptance criteria

- La rama `main` existe y es la rama por defecto; `master` ya no se usa.
- `pnpm install && pnpm lint && pnpm test && pnpm build` termina sin errores en local.
- `pnpm dev` abre una pantalla vacía con el fondo crema `#F5EFE6` y el texto en Nunito.
- La build de producción es instalable como PWA en Chrome (desde `pnpm preview`, que sirve en localhost y cuenta como contexto seguro) _(standard: localhost es contexto seguro para service workers — mismo índice vite-plugin-pwa)_
- Un push a GitHub dispara el workflow, que muestra lint, test y build sin bloquear el push aunque fallen.

## Out of scope

- Esquema y conexión real con Supabase (003), acceso con código (004), publicación en Cloudflare (005).
- Cualquier pantalla funcional (006 en adelante).
- Iconos y diseño definitivos (decisión de diseño del usuario).

## Dependencies

Ninguna. Necesita que exista un repositorio remoto en GitHub para el CI (lo crea el usuario).

## Owner split

- human: crear el repositorio en GitHub y conectar el remoto; decidir los iconos definitivos.
- agent: todo el código y la configuración.
