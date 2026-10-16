# NutriPapa

Web app instalable (PWA) para apuntar de forma rápida y visual lo que se come cada semana: 5 momentos al día, agua, WC, pasos y peso. Permite reutilizar comidas ya apuntadas y compartir la semana con la nutricionista en PDF o imagen.

> Proyecto en fase de configuración inicial (spec `001-project-setup`).

## Stack

- React + Vite + TypeScript, como PWA (offline + sincronización).
- Supabase (Postgres, Auth, Storage) directamente desde el cliente con `supabase-js`, seguridad por RLS. Sin backend propio.
- pnpm, Vitest, ESLint + Prettier.
- Despliegue en Cloudflare Pages: un push a `main` va a producción.

## Requisitos

- Node 24 LTS (ver `.nvmrc`)
- pnpm

## Puesta en marcha

```bash
pnpm install
pnpm dev       # servidor de desarrollo
pnpm build     # build de producción en dist/
pnpm preview   # sirve el build localmente
pnpm lint      # linter
pnpm test      # tests (Vitest)
pnpm format    # formatea con Prettier
```

Antes de dar un cambio por bueno: `pnpm lint`, `pnpm test` y `pnpm build`.

Las variables de entorno van en `.env.local`, que no se sube al repositorio. Nunca se suben claves secretas, tokens ni contraseñas.

## Documentación

- `AGENTS.md`: resumen del proyecto y normas de trabajo
- `planning/product.md`: qué es, para quién y qué queda fuera
- `planning/architecture.md`: decisiones técnicas
- `planning/styles.md`: estilo visual y de código
- `planning/roadmap.md`: índice de specs
