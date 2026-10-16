-- Spec 006 · Duplicar una tabla semanal de forma atómica.
-- Crea una tabla nueva (mismo nº de menú) en la semana indicada y copia sus
-- meal_entries no borradas. No copia daily_logs (agua, WC y pasos son de cada semana).
-- security invoker: la RLS de 003 sigue aplicando, así que no se puede duplicar
-- (ni siquiera ver) una tabla ajena.
-- Migración no destructiva: solo create / revoke / grant / comment.

create function public.duplicate_weekly_sheet(source_id uuid, target_start date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_menu_number smallint;
  new_sheet_id uuid;
begin
  if target_start is null then
    raise exception 'Falta la semana de destino.'
      using errcode = '22023';
  end if;

  -- El check de la tabla también lo exige; aquí damos un mensaje claro.
  if extract(isodow from target_start) <> 1 then
    raise exception 'La semana de destino debe empezar en lunes (recibido: %).', target_start
      using errcode = '22023';
  end if;

  -- Por la RLS, una tabla de otro usuario simplemente no aparece.
  select s.menu_number
    into source_menu_number
    from public.weekly_sheets s
   where s.id = source_id
     and s.deleted_at is null;

  if not found then
    raise exception 'No se encuentra la tabla que quieres duplicar.'
      using errcode = 'P0002';
  end if;

  -- owner_id por defecto: auth.uid()
  insert into public.weekly_sheets (start_date, menu_number)
  values (target_start, source_menu_number)
  returning id into new_sheet_id;

  -- Copia las comidas apuntadas (sin las borradas), manteniendo celda y orden.
  insert into public.meal_entries (
    sheet_id, food_id, day_of_week, meal_slot, quantity, unit, position
  )
  select new_sheet_id, e.food_id, e.day_of_week, e.meal_slot, e.quantity, e.unit, e.position
    from public.meal_entries e
   where e.sheet_id = source_id
     and e.deleted_at is null;

  return new_sheet_id;
end;
$$;

comment on function public.duplicate_weekly_sheet(uuid, date) is
  'Duplica una tabla semanal propia en la semana target_start (lunes): copia nº de menú y meal_entries, no daily_logs. Devuelve el id nuevo.';

-- Solo usuarios autenticados pueden llamarla.
revoke execute on function public.duplicate_weekly_sheet(uuid, date) from public, anon;
grant execute on function public.duplicate_weekly_sheet(uuid, date) to authenticated;
