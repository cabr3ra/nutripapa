# 004 — access-code — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [human] [status:todo] Crear el usuario en Supabase Auth (Authentication → Users → Add user: email interno, código ≥ 8, auto-confirm)
- [ ] T002 [human] [status:todo] Desactivar el registro público (Authentication → Sign In / Providers → "Allow new users to sign up" off)
- [ ] T003 [human] [status:todo] Poner `VITE_ACCESS_EMAIL` en `.env.local`
- [ ] T004 [agent] [status:todo] Añadir `react-router`, y `VITE_ACCESS_EMAIL` en `.env.example` y en los tipos de `import.meta.env`
- [ ] T005 [agent] [status:todo] Escribir `src/lib/supabase.ts`: cliente único tipado con validación de variables
- [ ] T006 [agent] [status:todo] Escribir `AuthProvider` + `useAuth` (getSession + onAuthStateChange)
- [ ] T007 [agent] [status:todo] Escribir `AccessCodeScreen` con los mensajes en línea (corto, incorrecto, sin red)
- [ ] T008 [agent] [status:todo] Montar el router, `RequireAuth`, `HomeScreen` provisional y `SettingsScreen` con cerrar sesión (`scope: 'local'`)
- [ ] T009 [agent] [status:todo] Tests Vitest de la pantalla de código, `RequireAuth` y cerrar sesión
- [ ] T010 [agent] [status:todo] Escribir `scripts/check-signup-disabled.mjs` + `pnpm check:signup` y comprobar `disable_signup: true`
- [ ] T011 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] T012 [agent] [status:todo] En el navegador (`pnpm dev`): sin sesión, `/` y `/ajustes` muestran la pantalla de código; un código incorrecto da aviso en línea, sin popup
- [ ] T013 [human] [status:todo] Entrar con el código real en el PC, reiniciar el navegador y seguir dentro; cerrar sesión desde Ajustes
- [ ] T014 [human] [status:todo] Entrar también en el móvil (URL de 005) a la vez que en el PC
