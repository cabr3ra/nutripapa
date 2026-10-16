# 004 — access-code — Design

## Approach

- **Cliente único**: `src/lib/supabase.ts` crea un solo `createClient<Database>` (tipos de 003) con `persistSession: true`, `autoRefreshToken: true` (localStorage, por defecto en v2). Si faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_ACCESS_EMAIL`, lanza un error claro al arrancar.
- **Estado de sesión**: `src/features/auth/AuthProvider.tsx` + `useAuth()`: `getSession()` al montar y `onAuthStateChange` para mantener la sesión al día (entrada, renovación, salida). Mientras carga, una pantalla neutra (sin parpadeo de la pantalla de código).
- **Pantalla de código** (`src/features/auth/AccessCodeScreen.tsx`): un único campo de contraseña ("Tu código"), `autocomplete="current-password"`, botón "Entrar". Llama a `signInWithPassword({ email: VITE_ACCESS_EMAIL, password: código })`. El padre nunca ve el email. Mensajes en línea (`aria-live`), sin popups:
  - menos de 8 caracteres → "El código tiene al menos 8 caracteres." (sin llamar a Supabase);
  - credenciales inválidas → "Ese código no es correcto. Prueba otra vez.";
  - sin red → "Ahora no hay conexión. Prueba de nuevo en un momento.".
    El código nunca se registra en consola ni se guarda fuera del campo.
- **Rutas**: `react-router` (modo librería, `createBrowserRouter`). `RequireAuth` envuelve todas las rutas: sin sesión muestra la pantalla de código en esa misma URL. Rutas: `/` (pantalla principal provisional hasta 006, con un enlace discreto a ajustes) y `/ajustes`.
- **Cerrar sesión** en `/ajustes` (`src/features/settings/SettingsScreen.tsx`): `signOut({ scope: 'local' })`, para que cerrar en el PC no saque al móvil (por defecto `signOut` cierra todas las sesiones).
- **Registro desactivado**: se comprueba sin crear nada: `scripts/check-signup-disabled.mjs` hace `GET <url>/auth/v1/settings` con la clave publicable y exige `disable_signup: true`. Sustituye al intento real de `signUp` del criterio de aceptación: si el registro estuviera abierto, ese intento crearía un usuario en producción.
- Estilos solo con tokens de `tokens.css`, Nunito, controles grandes (táctil).

## Deliverables

- `src/lib/supabase.ts`; `src/features/auth/{AuthProvider.tsx, useAuth.ts, AccessCodeScreen.tsx, RequireAuth.tsx}`; `src/features/settings/SettingsScreen.tsx`; `src/features/home/HomeScreen.tsx` (provisional); `App.tsx`/`main.tsx` con el router.
- Dependencia `react-router`; `VITE_ACCESS_EMAIL` en `.env.example` y en los tipos de `import.meta.env`.
- Tests Vitest (cliente Supabase simulado): código correcto/incorrecto/corto/sin red, `RequireAuth` sin sesión, cerrar sesión con `scope: 'local'`.
- `scripts/check-signup-disabled.mjs` + `pnpm check:signup`.
- Usuario en Supabase Auth, registro desactivado, `VITE_ACCESS_EMAIL` en `.env.local` (human).

## Sequencing

1. Código y tests (no necesitan el usuario).
2. Usuario creado + registro desactivado + `.env.local` (human) → `check:signup` y prueba en navegador.
3. Prueba con el código real en PC y móvil (human); el móvil necesita la URL de 005.

## Open questions / deferred

- Arrancar sin conexión con el token de acceso caducado: `supabase-js` conserva la sesión y reintenta renovar, pero el comportamiento offline completo es de 010.
- El agente nunca conoce el código: las pruebas con el código real son del humano.
