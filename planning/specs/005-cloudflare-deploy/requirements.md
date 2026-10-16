# 005 — cloudflare-deploy — Requirements

## What's being built

La publicación de NutriPapa en Cloudflare Pages conectada al repositorio de GitHub: cada
push a `main` publica en producción y cada rama obtiene una URL de vista previa. Es lo que
hace que tu padre pueda instalar la app en su Android y en su PC por HTTPS.

## Who/what it serves

- El padre: una URL pública y estable, con HTTPS, desde donde instalar la PWA.
- El usuario: probar cada rama en una vista previa antes de pasarla a `main`.
- 006–016: cada spec se ve publicada al llegar a `main`.

## Hard constraints

- Plan gratuito de Cloudflare Pages (coste 0).
- Integración con Git: rama de producción `main`, vistas previas automáticas para las demás ramas _(standard: Cloudflare Pages Git integration — https://60eb615a.previews.developers.cloudflare.com/pages/get-started/git-integration/index.md; página de preview de la doc oficial)_
- Build: comando `pnpm build`, directorio de salida `dist` _(standard: salida por defecto de Vite — https://vite.dev/guide/static-deploy)_
- Versión de Node en el build igual a la de `.nvmrc` (24) _(standard, unverified: no se confirmó en la doc oficial si el build de Pages lee `.nvmrc`; si no, usar la variable `NODE_VERSION`)_
- Variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y `VITE_ACCESS_EMAIL` configuradas en el panel de Pages (producción y preview). Ningún secreto (`sb_secret_…`, token, contraseña de BD) en Cloudflare.
- Fallback de SPA: cualquier ruta sirve `index.html` (`public/_redirects` con `/* /index.html 200`) _(standard: reglas `_redirects` de Pages — https://codex-container-api-docs.previews.developers.cloudflare.com/pages/configuration/redirects/index.md; página de preview de la doc oficial)_
- HTTPS en producción, necesario para el service worker de la PWA (001).

## Acceptance criteria

- Un push a `main` publica automáticamente en la URL `*.pages.dev` de producción.
- Un push a otra rama genera una URL de vista previa distinta de la de producción.
- La URL de producción abre la app por HTTPS y Chrome en Android ofrece instalarla.
- Recargar la página en una ruta interna no da 404.
- El bundle publicado contiene la clave publicable pero ningún `sb_secret_`.

## Out of scope

- Dominio propio (es de pago o requiere comprar el dominio).
- Bloquear el despliegue por fallos de CI (decidido: CI no bloqueante).
- Contenido funcional de la app (006 en adelante).

## Dependencies

001 (repo en GitHub con la build funcionando).

## Owner split

- human: crear la cuenta de Cloudflare, autorizar el acceso a GitHub, crear el proyecto de Pages y poner las variables en el panel.
- agent: `public/_redirects`, documentar la configuración del build y verificar los criterios.
