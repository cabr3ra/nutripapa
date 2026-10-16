-- Spec 003 · Esquema principal de NutriPapa (fase 1).
-- Crea la función de updated_at, las 5 tablas, índices, triggers, RLS y permisos
-- en una sola migración, para que ninguna tabla exista nunca sin RLS.
-- Migración no destructiva: solo create / alter / grant / revoke.

-- ---------------------------------------------------------------------------
-- Función común: actualiza updated_at en cada UPDATE
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger before update: pone updated_at = now(). Solo para triggers.';

-- Solo se usa desde triggers: nadie necesita llamarla directamente.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- weekly_sheets: tabla semanal (varias por semana permitidas)
-- ---------------------------------------------------------------------------

create table public.weekly_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Siempre lunes (ISO: 1 = lunes). El nº de semana lo deriva la app.
  start_date date not null check (extract(isodow from start_date) = 1),
  menu_number smallint null check (menu_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

comment on table public.weekly_sheets is
  'Tabla semanal de comidas. Sin unique en start_date: puede haber varias por semana.';

create index weekly_sheets_owner_id_idx on public.weekly_sheets (owner_id);

create trigger weekly_sheets_set_updated_at
  before update on public.weekly_sheets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- foods: catálogo de comidas reutilizables
-- ---------------------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (trim(name) <> ''),
  is_favorite boolean not null default false,
  default_quantity numeric null check (default_quantity > 0),
  default_unit text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

comment on table public.foods is
  'Catálogo de comidas del usuario. Nombre único por usuario sin distinguir mayúsculas.';

create index foods_owner_id_idx on public.foods (owner_id);

-- Nombre único por usuario (sin distinguir mayúsculas), ignorando las borradas.
create unique index foods_owner_id_lower_name_key
  on public.foods (owner_id, lower(name))
  where deleted_at is null;

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_entries: cada comida apuntada en una celda (día × momento)
-- ---------------------------------------------------------------------------

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sheet_id uuid not null references public.weekly_sheets (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  -- 1 = lunes … 7 = domingo
  day_of_week smallint not null check (day_of_week between 1 and 7),
  meal_slot text not null check (
    meal_slot in ('breakfast', 'mid_morning', 'lunch', 'afternoon_snack', 'dinner')
  ),
  quantity numeric null check (quantity > 0),
  unit text null,
  -- Orden dentro de la celda (arrastre de 008)
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

comment on table public.meal_entries is
  'Comidas apuntadas en una tabla semanal, por día y momento del día.';

create index meal_entries_owner_id_idx on public.meal_entries (owner_id);
create index meal_entries_sheet_cell_idx
  on public.meal_entries (sheet_id, day_of_week, meal_slot, position);
-- Índice de la FK a foods (comprobaciones del on delete restrict y búsquedas por comida).
create index meal_entries_food_id_idx on public.meal_entries (food_id);

create trigger meal_entries_set_updated_at
  before update on public.meal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_logs: agua, WC y pasos (uno por tabla y día)
-- ---------------------------------------------------------------------------

create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sheet_id uuid not null references public.weekly_sheets (id) on delete cascade,
  -- 1 = lunes … 7 = domingo
  day_of_week smallint not null check (day_of_week between 1 and 7),
  water_liters numeric(4, 2) null check (water_liters >= 0),
  pee_count smallint null check (pee_count >= 0),
  poop_count smallint null check (poop_count >= 0),
  steps integer null check (steps >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint daily_logs_sheet_id_day_of_week_key unique (sheet_id, day_of_week)
);

comment on table public.daily_logs is
  'Registro diario de agua, WC y pasos. Uno por tabla semanal y día.';

create index daily_logs_owner_id_idx on public.daily_logs (owner_id);

create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- sent_pdfs: historial de PDF enviados (el archivo vive en Storage)
-- ---------------------------------------------------------------------------

create table public.sent_pdfs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- restrict: no se pierde el historial de un PDF enviado al borrar físicamente su tabla
  sheet_id uuid not null references public.weekly_sheets (id) on delete restrict,
  generated_at timestamptz not null default now(),
  -- Ruta en el bucket sent-pdfs: {owner_id}/…
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

comment on table public.sent_pdfs is
  'PDF semanales enviados a la nutricionista; storage_path apunta al bucket sent-pdfs.';

create index sent_pdfs_owner_id_idx on public.sent_pdfs (owner_id);
create index sent_pdfs_sheet_id_idx on public.sent_pdfs (sheet_id);

create trigger sent_pdfs_set_updated_at
  before update on public.sent_pdfs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: activado en las 5 tablas; una política por operación, solo authenticated.
-- Ninguna política para anon. (select auth.uid()) se evalúa una vez por consulta.
-- ---------------------------------------------------------------------------

alter table public.weekly_sheets enable row level security;
alter table public.foods enable row level security;
alter table public.meal_entries enable row level security;
alter table public.daily_logs enable row level security;
alter table public.sent_pdfs enable row level security;

-- weekly_sheets ------------------------------------------------------------

create policy weekly_sheets_select_own on public.weekly_sheets
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy weekly_sheets_insert_own on public.weekly_sheets
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy weekly_sheets_update_own on public.weekly_sheets
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy weekly_sheets_delete_own on public.weekly_sheets
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- foods --------------------------------------------------------------------

create policy foods_select_own on public.foods
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy foods_insert_own on public.foods
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy foods_update_own on public.foods
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy foods_delete_own on public.foods
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- meal_entries: además, la tabla semanal y la comida deben ser del mismo dueño

create policy meal_entries_select_own on public.meal_entries
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy meal_entries_insert_own on public.meal_entries
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = food_id and f.owner_id = (select auth.uid())
    )
  );

create policy meal_entries_update_own on public.meal_entries
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.foods f
      where f.id = food_id and f.owner_id = (select auth.uid())
    )
  );

create policy meal_entries_delete_own on public.meal_entries
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- daily_logs: además, la tabla semanal debe ser del mismo dueño -------------

create policy daily_logs_select_own on public.daily_logs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy daily_logs_insert_own on public.daily_logs
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
  );

create policy daily_logs_update_own on public.daily_logs
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
  );

create policy daily_logs_delete_own on public.daily_logs
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- sent_pdfs: además, la tabla semanal debe ser del mismo dueño --------------

create policy sent_pdfs_select_own on public.sent_pdfs
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy sent_pdfs_insert_own on public.sent_pdfs
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
  );

create policy sent_pdfs_update_own on public.sent_pdfs
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.weekly_sheets s
      where s.id = sheet_id and s.owner_id = (select auth.uid())
    )
  );

create policy sent_pdfs_delete_own on public.sent_pdfs
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Permisos explícitos (sin depender de los grants por defecto de public).
-- Se revoca todo también a authenticated antes de conceder lo justo:
-- TRUNCATE se salta RLS, y REFERENCES/TRIGGER no hacen falta.
-- ---------------------------------------------------------------------------

revoke all on public.weekly_sheets from anon, authenticated;
revoke all on public.foods from anon, authenticated;
revoke all on public.meal_entries from anon, authenticated;
revoke all on public.daily_logs from anon, authenticated;
revoke all on public.sent_pdfs from anon, authenticated;

grant select, insert, update, delete on public.weekly_sheets to authenticated;
grant select, insert, update, delete on public.foods to authenticated;
grant select, insert, update, delete on public.meal_entries to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;
grant select, insert, update, delete on public.sent_pdfs to authenticated;
