# 003 — database-schema — Design

## Approach

Dos migraciones SQL en `supabase/migrations/`, aplicadas con `supabase db push`:

1. **Esquema + RLS** (una sola migración, para que ninguna tabla exista nunca sin RLS):
   - Función `public.set_updated_at()` (security invoker, `set search_path = ''`) y trigger `before update` en cada tabla.
   - Columnas comunes: `id uuid pk default gen_random_uuid()`, `owner_id uuid not null default auth.uid() references auth.users`, `created_at`, `updated_at`, `deleted_at` (nullable). Índice en `owner_id`.
   - `weekly_sheets`: `start_date date not null check (extract(isodow from start_date) = 1)`, `menu_number smallint null check (> 0)`. Sin unique en `start_date` (varias por semana). El nº de semana no se guarda: lo deriva la app (006).
   - `foods`: `name text not null check (trim(name) <> '')`, `is_favorite boolean not null default false`, `default_quantity numeric null check (> 0)`, `default_unit text null`. Índice único `(owner_id, lower(name)) where deleted_at is null`.
   - `meal_entries`: `sheet_id` → `weekly_sheets` (on delete cascade), `food_id` → `foods` (on delete restrict), `day_of_week smallint check (1–7)`, `meal_slot text check (in breakfast, mid_morning, lunch, afternoon_snack, dinner)`, `quantity numeric null check (> 0)`, `unit text null`, `position integer not null default 0`. Índice `(sheet_id, day_of_week, meal_slot, position)`.
   - `daily_logs`: `sheet_id`, `day_of_week (1–7)`, `unique (sheet_id, day_of_week)`, `water_liters numeric(4,2)`, `pee_count`, `poop_count`, `steps`, todos nullable y `check (>= 0)`.
   - `sent_pdfs`: `sheet_id`, `generated_at timestamptz not null default now()`, `storage_path text not null unique`.
   - RLS activado en las 5 tablas; una política por operación (select/insert/update/delete) `to authenticated` con `owner_id = (select auth.uid())` en `using` y `with check`. En las tablas hijas el `with check` exige además que el `sheet_id`/`food_id` referenciado sea del mismo dueño. Ninguna política para `anon`.
   - Permisos explícitos: `revoke all … from anon`; `grant select, insert, update, delete … to authenticated` (sin depender de los grants por defecto de `public`).
2. **Storage**: bucket `sent-pdfs` (`public = false`, solo `application/pdf`, límite 10 MB) con `insert … on conflict do nothing`. Políticas en `storage.objects` `to authenticated` para select e insert donde `bucket_id = 'sent-pdfs'` y `(storage.foldername(name))[1] = (select auth.uid())::text`. Sin update ni delete: el PDF archivado queda tal como se envió.

Verificación sin dejar datos:

- `supabase/tests/rls_check.sql`, ejecutado con `supabase db query --linked -f`: un único bloque `DO` que actúa como usuario A, usuario B (UUID ficticios, `set_config('role', 'authenticated', true)` + `request.jwt.claims`) y `anon`; comprueba aislamiento de filas, de carpetas del bucket y que se pueden crear dos `weekly_sheets` con el mismo `start_date`. Termina **siempre** con `raise exception` para que Postgres revierta todo: mensaje del check fallido, o `RLS_CHECK_OK` si todo pasa.
- `scripts/check-anon-access.mjs`: con `@supabase/supabase-js` y la clave publicable de `.env.local`, sin sesión, intenta leer/escribir cada tabla y subir/listar en el bucket; todo debe fallar.
- `supabase db advisors --linked --type security` sin avisos de RLS.

## Deliverables

- `supabase/migrations/<timestamp>_core_schema.sql` — función, 5 tablas, índices, triggers, RLS, grants.
- `supabase/migrations/<timestamp>_sent_pdfs_storage.sql` — bucket y políticas de Storage.
- `supabase/tests/rls_check.sql` — comprobación de RLS, Storage y varias tablas por semana, con rollback garantizado.
- `scripts/check-anon-access.mjs` + dependencia `@supabase/supabase-js` (la reutilizan 004 y siguientes).
- `src/lib/database.types.ts` generado con `supabase gen types typescript --linked`.
- `.env.local` relleno (human).

## Sequencing

1. Escribir las dos migraciones y el SQL de comprobación.
2. `supabase db push` → `supabase migration list` (local = remoto).
3. `rls_check.sql`, advisors, generar tipos.
4. Rellenar `.env.local` (human) → `check-anon-access.mjs`. Solo este paso espera al humano.

## Open questions / deferred

- Si `supabase db query --linked` (Management API) no permite cambiar a `role authenticated` dentro del `DO`, usar la misma comprobación vía `--db-url` con el pooler de `supabase/.temp/pooler-url` y `SUPABASE_DB_PASSWORD` (sigue con rollback, sin datos persistentes).
- Si los triggers de Storage bloquean insertar en `storage.objects` desde SQL, la prueba de carpetas por usuario se hace en 004, cuando exista el usuario real.
