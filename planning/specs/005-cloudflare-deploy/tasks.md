# 005 — cloudflare-deploy — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Añadir `packageManager` a `package.json` con la versión local de pnpm
      └─ "packageManager": "pnpm@11.22.0" (versión local); pnpm install --frozen-lockfile OK.
- [x] T002 [agent] [status:done] Añadir la sección "Despliegue" a `README.md` (ajustes de build, variables, ramas)
      └─ README.md: sección Despliegue (ramas, tabla de ajustes de build, NODE_VERSION, variables Prod+Preview, sin secretos, SPA sin _redirects).
- [x] T003 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde; commit y push a `main`
      └─ lint OK, test 2/2, build OK; push 4bd73c8..9aefb8c a origin/main (0 claves en el diff).
- [ ] T004 [human] [status:todo] Crear la cuenta de Cloudflare, autorizar GitHub y crear el proyecto de Pages (`main`, `pnpm build`, `dist`, `NODE_VERSION=24`)
- [ ] T005 [human] [status:todo] Poner `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ACCESS_EMAIL` en Producción y Preview
- [ ] T006 [agent] [status:blocked] Verificar que un push a `main` publica en la URL `*.pages.dev` por HTTPS
      └─ Sin proyecto de Pages: nutripapa.pages.dev no resuelve (curl exit 6). Espera T004/T005 [human].
- [ ] T007 [agent] [status:blocked] Crear una rama de prueba, comprobar que su URL de preview es distinta y borrar la rama
      └─ Sin proyecto de Pages: nutripapa.pages.dev no resuelve (curl exit 6). Espera T004/T005 [human].
- [ ] T008 [agent] [status:blocked] Recargar una ruta interna en producción y comprobar que no da 404
      └─ Sin proyecto de Pages: nutripapa.pages.dev no resuelve (curl exit 6). Espera T004/T005 [human].
- [ ] T009 [agent] [status:blocked] Comprobar que el bundle publicado contiene la clave publicable y ningún `sb_secret_`
      └─ Sin proyecto de Pages: nutripapa.pages.dev no resuelve (curl exit 6). Espera T004/T005 [human].
- [ ] T010 [human] [status:todo] Instalar la app desde Chrome en Android
