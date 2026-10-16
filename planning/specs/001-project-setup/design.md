# 001 — project-setup — Design

## Approach

Repositorio único con una SPA de Vite (plantilla `react-ts`) gestionada con pnpm y Node 24
LTS. `vite-plugin-pwa` genera el manifest y el service worker (estrategia `generateSW`,
actualización automática). Los estilos base viven en un único archivo de tokens CSS
(variables en `:root` con la paleta) y Nunito se carga desde Google Fonts. Calidad:
ESLint (flat config) + Prettier y Vitest con jsdom para testear componentes. CI: un
workflow de GitHub Actions que instala con pnpm y ejecuta lint, test y build, cada paso
con `continue-on-error: true`.

## Deliverables

- Rama `main` como rama por defecto (renombrar `master`, actualizar el remoto).
- `package.json` con scripts `dev`, `build`, `preview`, `lint`, `test`, `format`; `engines.node` 24; `.nvmrc`.
- `vite.config.ts` con React y `vite-plugin-pwa` (manifest: NutriPapa, `standalone`, colores de la paleta).
- Iconos provisionales 192, 512 y maskable en `public/`.
- `src/styles/tokens.css` (paleta HARD + escala de espaciado amplia) y `src/styles/global.css` (Nunito, fondo crema).
- `src/App.tsx`: pantalla vacía de bienvenida con el título "CONTROL SEMANAL de COMIDAS".
- Estructura de carpetas: `src/features/<feature>/`, `src/lib/`, `src/styles/`, `src/test/`.
- `eslint.config.js`, `.prettierrc`, `vitest` configurado, un test de humo de `App`.
- `.gitignore` (incluye `.env.local`, `dist/`), `.env.example` con las dos variables vacías.
- `.github/workflows/ci.yml` (setup-node 24 + pnpm/action-setup, lint/test/build no bloqueantes).

## Sequencing

1. Rama `main` y repositorio remoto (el remoto lo crea el usuario) antes de añadir el CI.
2. Scaffold de Vite → toolchain (lint/format/test) → PWA → tokens y fuente → CI.

## Open questions / deferred

- Iconos y nombre visible definitivos: decisión de diseño del usuario; se usan provisionales.
