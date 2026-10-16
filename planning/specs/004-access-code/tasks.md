# 004 — access-code — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [human] [status:todo] Crear el usuario en Supabase Auth (Authentication → Users → Add user: email interno, código ≥ 8, auto-confirm)
- [ ] T002 [human] [status:todo] Desactivar el registro público (Authentication → Sign In / Providers → "Allow new users to sign up" off)
- [ ] T003 [human] [status:todo] Poner `VITE_ACCESS_EMAIL` en `.env.local`
- [x] T004 [agent] [status:done] Añadir `react-router`, y `VITE_ACCESS_EMAIL` en `.env.example` y en los tipos de `import.meta.env`
      └─ react-router ^8.4.0; .env.example con VITE_ACCESS_EMAIL=; src/vite-env.d.ts con ImportMetaEnv (3 variables). tsc OK.
- [x] T005 [agent] [status:done] Escribir `src/lib/supabase.ts`: cliente único tipado con validación de variables
      └─ src/lib/supabase.ts: createClient<Database>, persistSession + autoRefreshToken; lanza error si falta alguna de las 3 variables; exporta accessEmail.
- [x] T006 [agent] [status:done] Escribir `AuthProvider` + `useAuth` (getSession + onAuthStateChange)
      └─ src/features/auth/{authContext.ts, AuthProvider.tsx, useAuth.ts} + AuthProvider.test.tsx (5 tests OK). Callback de onAuthStateChange síncrono.
- [x] T007 [agent] [status:done] Escribir `AccessCodeScreen` con los mensajes en línea (corto, incorrecto, sin red)
      └─ AccessCodeScreen.tsx/.css/.test.tsx: campo password, mensajes corto/incorrecto/sin red/genérico en role=alert; solo tokens; botón texto 22px bold (3.2:1).
- [x] T008 [agent] [status:done] Montar el router, `RequireAuth`, `HomeScreen` provisional y `SettingsScreen` con cerrar sesión (`scope: 'local'`)
      └─ App.tsx con createBrowserRouter (layout RequireAuth: /, /ajustes, * → /); HomeScreen (App.css movido) con enlace Ajustes; SettingsScreen con signOut local y error en línea.
- [x] T009 [agent] [status:done] Tests Vitest de la pantalla de código, `RequireAuth` y cerrar sesión
      └─ +11 tests: RequireAuth.test (5), SettingsScreen.test (4), App.test (+1), AccessCodeScreen.test (+1). 23/23 en 5 archivos; sin cambios de producción.
- [x] T010 [agent] [status:done] Escribir `scripts/check-signup-disabled.mjs` + `pnpm check:signup` y comprobar `disable_signup: true`
      └─ Tras T002: `pnpm check:signup` → OK, disable_signup: true. Sin signUp real.
- [x] T011 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, tsc OK, test 23/23, build OK (aviso bundle >500 kB), format:check OK en archivos rastreados.
- [x] T012 [agent] [status:done] En el navegador (`pnpm dev`): sin sesión, `/` y `/ajustes` muestran la pantalla de código; un código incorrecto da aviso en línea, sin popup
      └─ Chrome, dev en :5180: sin sesión / y /ajustes muestran "Tu código" (URL se mantiene); código erróneo → "Ese código no es correcto…" en role=alert, campo vacío aria-invalid, 0 diálogos, sin scroll X.
- [ ] T013 [human] [status:todo] Entrar con el código real en el PC, reiniciar el navegador y seguir dentro; cerrar sesión desde Ajustes
- [ ] T014 [human] [status:todo] Entrar también en el móvil (URL de 005) a la vez que en el PC
