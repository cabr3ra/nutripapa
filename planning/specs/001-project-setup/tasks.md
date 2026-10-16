# 001 — project-setup — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [human] [status:done] Crear el repositorio `NutriPapa` en GitHub y añadirlo como remoto `origin`
- [x] T002 [agent] [status:done] Renombrar `master` a `main`, hacer push y fijar `main` como rama por defecto en GitHub
      └─ Ya estaba hecho: main local = origin/main (90dac19), sin rama master, rama por defecto main en GitHub.
- [x] T003 [agent] [status:done] Generar el scaffold de Vite `react-ts` con pnpm, con `.nvmrc` y `engines.node` 24
      └─ Vite 8.3 + React 19.3 + TS 6.0, pnpm-lock, .nvmrc=24, engines >=24; pnpm build OK. La plantilla trae oxlint (lo sustituye T004).
- [x] T004 [agent] [status:done] Configurar ESLint (flat config) y Prettier, con los scripts `lint` y `format`
      └─ oxlint eliminado; eslint.config.js (flat, TS + react-hooks + react-refresh + prettier), .prettierrc, .prettierignore; lint, format:check y build OK.
- [x] T005 [agent] [status:done] Configurar Vitest + jsdom con el script `test` y un test de humo de `App`
      └─ Vitest 5 + jsdom en vite.config.ts, src/test/setup.ts (jest-dom + cleanup), src/App.test.tsx; pnpm test 1/1 OK.
- [x] T006 [agent] [status:done] Añadir `.gitignore` (`.env.local`, `dist/`) y `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` vacías
      └─ .gitignore ignora .env/.env*.local/*.local (salvo .env.example), dist/, dev-dist/, coverage/; .env.example con las dos variables vacías.
- [x] T007 [agent] [status:done] Crear la estructura `src/features`, `src/lib`, `src/styles` y `src/test`
      └─ src/features, src/lib, src/styles con .gitkeep; src/test ya existía (T005).
- [x] T008 [agent] [status:done] Crear `src/styles/tokens.css` con la paleta y el espaciado, y `src/styles/global.css` con Nunito y el fondo crema
      └─ tokens.css (5 colores HARD, tipografía, espaciado, radios, touch-target) + global.css; Nunito por <link> en index.html; index.css de plantilla eliminado.
- [x] T009 [agent] [status:done] Pantalla de bienvenida en `src/App.tsx` con el título "CONTROL SEMANAL de COMIDAS"
      └─ <main> con tarjeta beige + franja salvia, h1 exacto, subtítulo cálido; solo tokens; assets de plantilla eliminados; test del título.
- [x] T010 [agent] [status:done] Configurar `vite-plugin-pwa` (manifest, `generateSW`, auto-update) con iconos provisionales 192, 512 y maskable
      └─ vite-plugin-pwa 2.0 (generateSW, autoUpdate), manifest es/standalone, iconos 192/512/maskable + apple 180 (pnpm icons); build genera sw.js y manifest.
- [x] T011 [agent] [status:done] Añadir `.github/workflows/ci.yml` con lint, test y build no bloqueantes (`continue-on-error`)
      └─ ci.yml: push a main + PR, checkout@v7, pnpm/action-setup@v6 (pnpm 11), setup-node@v7 (.nvmrc), lint/test/build con continue-on-error.
- [x] T012 [agent] [status:done] Verificar que `pnpm install && pnpm lint && pnpm test && pnpm build` termina sin errores
      └─ Desde cero (sin node_modules ni dist): install --frozen-lockfile, lint, test 2/2 y build OK.
- [x] T013 [agent] [status:done] Verificar que `pnpm dev` muestra el fondo `#F5EFE6` y Nunito
      └─ Chrome en localhost:5173: body rgb(245,239,230) = #F5EFE6, Nunito 400/800 cargada, h1 correcto, sin scroll horizontal.
- [ ] T014 [human] [status:todo] Verificar que `pnpm preview` es instalable como PWA en Chrome
- [x] T015 [agent] [status:done] Verificar que un push dispara el CI y que no bloquea aunque falle
      └─ Push 916a357 lanzó CI run 38955370626 (success). No bloqueo: continue-on-error en lint/test/build y main sin protección; no se forzó un fallo real.
- [ ] T016 [human] [status:todo] Decidir los iconos definitivos y el nombre visible
