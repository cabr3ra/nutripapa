# 003 — database-schema — Requirements

## What's being built

El esquema de datos de NutriPapa en Supabase, como migraciones SQL versionadas aplicadas
al proyecto `jojumjyqxpqzaslbxrso`: tablas, relaciones, reglas de seguridad (RLS) y el
bucket privado para los PDF enviados. Cubre el modelo de la fase 1; peso y km se añaden
con migraciones propias en 012 y 014.

## Who/what it serves

- 004 (acceso), 006–011 (todas las pantallas de la fase 1) y, más adelante, 012–016.
- El padre: sus datos de salud quedan protegidos y solo su acceso puede verlos.

## Hard constraints

- Tablas (identificadores en inglés):
  - `weekly_sheets`: tabla semanal. `start_date` (siempre lunes), `menu_number` opcional, varias por semana permitidas. El número de semana se deriva de `start_date` (semana 1 = 2026-10-19).
  - `foods`: catálogo. `name` (único por usuario, sin distinguir mayúsculas), `is_favorite`, cantidad y unidad por defecto.
  - `meal_entries`: `sheet_id`, `day_of_week` (1–7, lunes = 1), `meal_slot` (breakfast · mid_morning · lunch · afternoon_snack · dinner), `food_id`, `quantity`, `unit`, `position` (orden dentro de la celda, para el arrastre de 008).
  - `daily_logs`: uno por tabla y día. `water_liters`, `pee_count`, `poop_count`, `steps`.
  - `sent_pdfs`: `sheet_id`, `generated_at`, `storage_path`.
- Todas las tablas con `owner_id uuid default auth.uid()`, `created_at`, `updated_at` (trigger) y RLS activado: `using`/`with check` comparando `owner_id = (select auth.uid())`; índice en `owner_id` _(standard: USING/WITH CHECK y `(select auth.uid())` evaluado una vez por consulta — https://makerkit.dev/blog/tutorials/supabase-rls-best-practices; secundaria)_
- `deleted_at` (borrado lógico) en las tablas editables, para que la sincronización sin conexión de 010 propague los borrados _(judgement, no standard)_
- Bucket de Storage `sent-pdfs` **privado**, con políticas en `storage.objects` que solo permiten al dueño subir y leer en la carpeta `{auth.uid()}/…` _(standard: buckets privados — toda operación, incluida la descarga, gobernada por RLS; sin políticas no se aceptan subidas — https://supabase.com/docs/guides/storage/security/access-control)_
- Migraciones solo en `supabase/migrations/`, aplicadas con `supabase db push`; ninguna migración destructiva sobre datos (regla del proyecto).
- La clave `sb_secret_…`/service_role nunca se usa en el cliente _(standard: https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)_

## Acceptance criteria

- `supabase db push` aplica todas las migraciones sin errores y `supabase migration list` las muestra sincronizadas en remoto.
- Las cinco tablas existen con RLS activado (comprobable vía MCP en solo lectura).
- Un cliente anónimo (solo clave publicable, sin sesión) no puede leer ni escribir ninguna fila ni ningún archivo del bucket.
- Un usuario autenticado solo ve sus propias filas y solo puede subir o leer archivos dentro de su carpeta.
- Se pueden crear dos `weekly_sheets` con el mismo `start_date`.

## Out of scope

- Crear el acceso del padre y la pantalla del código (004).
- Peso y km (012, 014): migraciones propias.
- Lógica de sincronización sin conexión (010) y generación de PDF (011).
- Datos de ejemplo en producción.

## Dependencies

001 (repo), 002 (CLI enlazada). Necesita `.env.local` con `VITE_SUPABASE_URL` y la clave
publicable para la prueba del cliente anónimo.

## Owner split

- agent: escribir y aplicar las migraciones, verificar RLS y Storage.
- human: rellenar `.env.local` con la URL y la clave publicable.
