# 004 — access-code — Requirements

## What's being built

La entrada a la app: una pantalla con un único campo "código" que tu padre escribe una
vez en cada dispositivo. Por debajo es un único usuario de Supabase Auth (email fijo +
contraseña = el código); la sesión queda guardada y se renueva sola, así que no vuelve a
pedirse salvo que se cierre la sesión o caduque tras mucho tiempo sin uso.

## Who/what it serves

- El padre: entra sin crear cuenta ni recordar un email.
- 006–016: todas las pantallas requieren sesión, y RLS (003) usa `auth.uid()` de este usuario.

## Hard constraints

- Un solo usuario en Supabase Auth, creado por el usuario (hijo) desde el panel. El email es interno y fijo, configurado en `.env.local` (`VITE_ACCESS_EMAIL`); el padre nunca lo ve _(judgement, no standard)_
- **Registro público desactivado** en Supabase Auth: nadie más puede crear cuentas _(judgement, no standard: restricción de la entrevista "solo lo usa él")_
- El código tiene al menos 8 caracteres _(standard: NIST SP 800-63B — mínimo 8 caracteres para secretos memorizados elegidos por el usuario — https://github.com/usnistgov/800-63-3/blob/nist-pages/sp800-63b/sec5_authenticators.md; texto Rev. 3)_
- Sesión persistente con `supabase-js` v2 (`persistSession`, por defecto en localStorage) y renovación automática con `onAuthStateChange`; un único cliente de Supabase compartido en toda la app _(standard: https://supabase.com/docs/reference/javascript/auth-api; secundaria para el patrón de cliente único — https://www.rapidevelopers.com/md/supabase-tutorial/how-to-debug-supabase-auth-not-persisting-session)_
- El código nunca se guarda en el repo, ni en el código fuente, ni en logs.
- Sin ventanas emergentes (HARD): el error de código incorrecto se muestra en línea, con un tono cercano.
- Las rutas de la app no muestran nada sin sesión.

## Acceptance criteria

- Con el código correcto, la app entra y muestra la pantalla principal; con uno incorrecto, muestra un aviso en línea y no entra.
- Tras cerrar y reabrir la app (y reiniciar el navegador), sigue dentro sin volver a pedir el código.
- Iniciar sesión en el móvil y en el PC funciona a la vez, con el mismo usuario.
- Un intento de registro (`signUp`) con la clave publicable es rechazado.
- Existe una opción discreta para cerrar sesión (en ajustes, no en la pantalla principal).

## Out of scope

- Recuperar el código por email o cambiarlo desde la app: si se olvida, el usuario lo cambia desde el panel de Supabase.
- Inicio de sesión con Google u otros proveedores (descartado en la entrevista).
- Varios usuarios.

## Dependencies

003 (esquema y RLS ya activos).

## Owner split

- human: crear el usuario en Supabase Auth, elegir el código, desactivar el registro público y poner `VITE_ACCESS_EMAIL` en `.env.local`.
- agent: pantalla de código, cliente Supabase único, persistencia y renovación de sesión, protección de rutas, opción de cerrar sesión, tests.
