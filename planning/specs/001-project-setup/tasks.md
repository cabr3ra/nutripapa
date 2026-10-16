# 001 — project-setup — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [human] [status:todo] Crear el repositorio `NutriPapa` en GitHub y añadirlo como remoto `origin`
- [ ] T002 [agent] [status:todo] Renombrar `master` a `main`, hacer push y fijar `main` como rama por defecto en GitHub
- [ ] T003 [agent] [status:todo] Generar el scaffold de Vite `react-ts` con pnpm, con `.nvmrc` y `engines.node` 24
- [ ] T004 [agent] [status:todo] Configurar ESLint (flat config) y Prettier, con los scripts `lint` y `format`
- [ ] T005 [agent] [status:todo] Configurar Vitest + jsdom con el script `test` y un test de humo de `App`
- [ ] T006 [agent] [status:todo] Añadir `.gitignore` (`.env.local`, `dist/`) y `.env.example` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` vacías
- [ ] T007 [agent] [status:todo] Crear la estructura `src/features`, `src/lib`, `src/styles` y `src/test`
- [ ] T008 [agent] [status:todo] Crear `src/styles/tokens.css` con la paleta y el espaciado, y `src/styles/global.css` con Nunito y el fondo crema
- [ ] T009 [agent] [status:todo] Pantalla de bienvenida en `src/App.tsx` con el título "CONTROL SEMANAL de COMIDAS"
- [ ] T010 [agent] [status:todo] Configurar `vite-plugin-pwa` (manifest, `generateSW`, auto-update) con iconos provisionales 192, 512 y maskable
- [ ] T011 [agent] [status:todo] Añadir `.github/workflows/ci.yml` con lint, test y build no bloqueantes (`continue-on-error`)
- [ ] T012 [agent] [status:todo] Verificar que `pnpm install && pnpm lint && pnpm test && pnpm build` termina sin errores
- [ ] T013 [agent] [status:todo] Verificar que `pnpm dev` muestra el fondo `#F5EFE6` y Nunito
- [ ] T014 [human] [status:todo] Verificar que `pnpm preview` es instalable como PWA en Chrome
- [ ] T015 [agent] [status:todo] Verificar que un push dispara el CI y que no bloquea aunque falle
- [ ] T016 [human] [status:todo] Decidir los iconos definitivos y el nombre visible
