# 005 — cloudflare-deploy — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Añadir `packageManager` a `package.json` con la versión local de pnpm
- [ ] T002 [agent] [status:todo] Añadir la sección "Despliegue" a `README.md` (ajustes de build, variables, ramas)
- [ ] T003 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde; commit y push a `main`
- [ ] T004 [human] [status:todo] Crear la cuenta de Cloudflare, autorizar GitHub y crear el proyecto de Pages (`main`, `pnpm build`, `dist`, `NODE_VERSION=24`)
- [ ] T005 [human] [status:todo] Poner `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ACCESS_EMAIL` en Producción y Preview
- [ ] T006 [agent] [status:todo] Verificar que un push a `main` publica en la URL `*.pages.dev` por HTTPS
- [ ] T007 [agent] [status:todo] Crear una rama de prueba, comprobar que su URL de preview es distinta y borrar la rama
- [ ] T008 [agent] [status:todo] Recargar una ruta interna en producción y comprobar que no da 404
- [ ] T009 [agent] [status:todo] Comprobar que el bundle publicado contiene la clave publicable y ningún `sb_secret_`
- [ ] T010 [human] [status:todo] Instalar la app desde Chrome en Android
