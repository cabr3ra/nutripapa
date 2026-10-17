-- Spec 008 · Posiciones dispersas en save_meal_entry.
-- Reemplaza la función de 007 con la MISMA firma, validaciones y semántica; solo
-- cambia el cálculo de posición: las entradas nuevas y las que cambian de celda van
-- al final con paso 1024 (coalesce(max(position), -1024) + 1024). Así queda hueco
-- entre vecinas para que mover una comida (arrastrar o "Mover a…") actualice una
-- única fila con el punto medio.
--   · Celda vacía                    → 0
--   · Celda con 0, 1024              → 2048
--   · Celda con datos antiguos 0,1,2 → 1026 (no se renumeran: el orden se mantiene)
-- security invoker: la RLS de 003 sigue aplicando, así que no se puede tocar
-- (ni siquiera ver) una tabla, comida o entrada ajena.
-- Migración no destructiva: solo create or replace / comment / revoke / grant;
-- no toca ni renumera filas existentes.

create or replace function public.save_meal_entry(
  p_entry_id uuid,
  p_sheet_id uuid,
  p_day_of_week smallint,
  p_meal_slot text,
  p_food_id uuid,
  p_food_name text,
  p_quantity numeric,
  p_unit text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_food_name text := nullif(trim(p_food_name), '');
  -- Unidad vacía = sin unidad.
  v_unit text := nullif(trim(p_unit), '');
  v_food_id uuid;
  v_entry_id uuid;
  v_old_sheet_id uuid;
  v_old_day smallint;
  v_old_slot text;
  v_position integer;
begin
  -- Validaciones con mensajes claros (los checks de las tablas también lo exigen).
  if (p_food_id is null) = (v_food_name is null) then
    raise exception 'Indica una comida: elige una del catálogo o escribe su nombre (solo una de las dos).'
      using errcode = '22023';
  end if;

  if p_quantity is not null and p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor que cero (recibido: %).', p_quantity
      using errcode = '22023';
  end if;

  if p_day_of_week is null or p_day_of_week not between 1 and 7 then
    raise exception 'El día debe estar entre 1 (lunes) y 7 (domingo) (recibido: %).', p_day_of_week
      using errcode = '22023';
  end if;

  if p_meal_slot is null
     or p_meal_slot not in ('breakfast', 'mid_morning', 'lunch', 'afternoon_snack', 'dinner') then
    raise exception 'Momento del día no válido (recibido: %).', p_meal_slot
      using errcode = '22023';
  end if;

  -- Por la RLS, una tabla de otro usuario simplemente no aparece.
  perform 1
     from public.weekly_sheets s
    where s.id = p_sheet_id
      and s.deleted_at is null;

  if not found then
    raise exception 'No se encuentra la tabla semanal.'
      using errcode = 'P0002';
  end if;

  -- Comida: la elegida del catálogo, o la que tenga ese nombre, o una nueva.
  if p_food_id is not null then
    select f.id
      into v_food_id
      from public.foods f
     where f.id = p_food_id
       and f.deleted_at is null;

    if not found then
      raise exception 'No se encuentra esa comida en tu catálogo.'
        using errcode = 'P0002';
    end if;
  else
    select f.id
      into v_food_id
      from public.foods f
     where lower(f.name) = lower(v_food_name)
       and f.deleted_at is null;

    if not found then
      -- Sub-bloque: si otra sesión la crea a la vez, el índice único
      -- (owner_id, lower(name)) salta y reutilizamos la que ya existe.
      begin
        -- owner_id por defecto: auth.uid()
        insert into public.foods (name)
        values (v_food_name)
        returning id into v_food_id;
      exception
        when unique_violation then
          select f.id
            into v_food_id
            from public.foods f
           where lower(f.name) = lower(v_food_name)
             and f.deleted_at is null;
      end;
    end if;
  end if;

  -- La última cantidad y unidad usadas pasan a ser las habituales.
  if p_quantity is not null then
    update public.foods f
       set default_quantity = p_quantity,
           default_unit = v_unit
     where f.id = v_food_id;
  end if;

  if p_entry_id is null then
    -- Entrada nueva: al final de la celda con paso 1024 (celda vacía → 0).
    select coalesce(max(e.position), -1024) + 1024
      into v_position
      from public.meal_entries e
     where e.sheet_id = p_sheet_id
       and e.day_of_week = p_day_of_week
       and e.meal_slot = p_meal_slot
       and e.deleted_at is null;

    -- owner_id por defecto: auth.uid()
    insert into public.meal_entries (
      sheet_id, food_id, day_of_week, meal_slot, quantity, unit, position
    )
    values (
      p_sheet_id, v_food_id, p_day_of_week, p_meal_slot, p_quantity, v_unit, v_position
    )
    returning id into v_entry_id;
  else
    -- Entrada existente: se bloquea la fila para que dos guardados no se pisen.
    select e.id, e.sheet_id, e.day_of_week, e.meal_slot, e.position
      into v_entry_id, v_old_sheet_id, v_old_day, v_old_slot, v_position
      from public.meal_entries e
     where e.id = p_entry_id
       and e.deleted_at is null
       for update;

    if not found then
      raise exception 'No se encuentra la comida apuntada que quieres cambiar.'
        using errcode = 'P0002';
    end if;

    -- Si cambia de celda (o de tabla), pasa al final de la nueva (máx + 1024);
    -- si no, conserva su orden.
    if v_old_sheet_id <> p_sheet_id
       or v_old_day <> p_day_of_week
       or v_old_slot <> p_meal_slot then
      select coalesce(max(e.position), -1024) + 1024
        into v_position
        from public.meal_entries e
       where e.sheet_id = p_sheet_id
         and e.day_of_week = p_day_of_week
         and e.meal_slot = p_meal_slot
         and e.deleted_at is null
         and e.id <> v_entry_id;
    end if;

    update public.meal_entries e
       set sheet_id = p_sheet_id,
           day_of_week = p_day_of_week,
           meal_slot = p_meal_slot,
           food_id = v_food_id,
           quantity = p_quantity,
           unit = v_unit,
           position = v_position
     where e.id = v_entry_id;
  end if;

  return v_entry_id;
end;
$$;

comment on function public.save_meal_entry(uuid, uuid, smallint, text, uuid, text, numeric, text) is
  'Guarda una comida apuntada de forma atómica: busca o crea la comida (por nombre sin mayúsculas), guarda su cantidad/unidad como habituales y crea (al final de la celda, máx + 1024) o actualiza la entrada; si cambia de celda pasa al final de la nueva. Devuelve el id de la entrada.';

-- Solo usuarios autenticados pueden llamarla (create or replace conserva los
-- permisos, pero se repite para que la migración sea explícita e idempotente).
revoke execute on function public.save_meal_entry(uuid, uuid, smallint, text, uuid, text, numeric, text) from public, anon;
grant execute on function public.save_meal_entry(uuid, uuid, smallint, text, uuid, text, numeric, text) to authenticated;
