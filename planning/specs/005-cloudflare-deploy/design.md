# 005 — cloudflare-deploy — Design

## Approach

Proyecto de Cloudflare Pages con integración Git sobre el repo de GitHub: rama de producción `main`, vistas previas automáticas para el resto de ramas. Build: `pnpm build`, salida `dist`, raíz del repo.

- **Node 24**: el build image v3 de Pages lee `.nvmrc` (ya existe, `24`); además `NODE_VERSION=24` en el panel como respaldo (Pages usa Node 22 por defecto). Fuente: https://developers.cloudflare.com/pages/configuration/build-image/
- **pnpm**: Pages lo detecta por `pnpm-lock.yaml`; `"packageManager": "pnpm@<versión local>"` en `package.json` fija la misma versión en el build.
- **Rutas de la SPA**: sin `public/_redirects`. Pages trata como SPA un proyecto sin `404.html` en la raíz y sirve `index.html` en rutas desconocidas (https://developers.cloudflare.com/pages/configuration/serving-pages/). Sustituye la restricción de `requirements.md` que pedía `_redirects` (aprobado por el usuario, 2026-10-16); el criterio "recargar una ruta interna no da 404" se mantiene y se verifica.
- **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ACCESS_EMAIL` en Producción y Preview (panel, human). Nunca `sb_secret_…`, token ni contraseña.
- Documentación del ajuste en `README.md` (sección "Despliegue") para poder rehacerlo a mano.

## Deliverables

- `package.json` con `packageManager`.
- `README.md`: sección Despliegue (ajustes de build, variables, ramas).
- Proyecto de Pages creado y conectado, con variables (human).
- Verificación: push a `main` → URL `*.pages.dev`; push a rama de prueba → URL de preview distinta; HTTPS + instalable en Chrome Android (human en el móvil); ruta interna recargada sin 404; bundle publicado sin `sb_secret_`.

## Sequencing

1. Cambios del repo (`packageManager`, README) en `main`.
2. Cuenta, autorización de GitHub, proyecto y variables (human).
3. Primer deploy → verificaciones del agente → prueba de instalación en Android (human).

## Open questions / deferred

- Cloudflare orienta los proyectos nuevos a Workers con static assets. Pages sigue siendo gratuito y soportado; se mantiene Pages (decisión de `architecture.md`); migrar a Workers queda diferido.
- La rama de prueba del criterio de preview se crea y se borra después (rama, no datos).
