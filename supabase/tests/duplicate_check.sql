-- Spec 006 · Comprobación de public.duplicate_weekly_sheet(source_id, target_start).
--
-- Se ejecuta con:  supabase db query --linked -f supabase/tests/duplicate_check.sql
--
-- REGLA DE ORO: no puede quedar ningún dato. Todo el script es UN único bloque DO
-- que termina SIEMPRE con `raise exception`, así Postgres revierte todo lo hecho
-- (usuarios ficticios, filas y cambios de rol).
--   · Si todo pasa      → error 'DUPLICATE_CHECK_OK'
--   · Si un check falla → error 'DUPLICATE_CHECK_FAIL: <qué check>'
--   · Cualquier otro mensaje también es un fallo (se envuelve como DUPLICATE_CHECK_FAIL).
-- Las trazas de cada check que pasa salen como NOTICE.
--
-- Actúa como usuario A, usuario B (UUID ficticios creados dentro del bloque) y anon,
-- cambiando de rol con set_config('role', …, true) + request.jwt.claims, igual que PostgREST.
-- Mismo patrón que supabase/tests/rls_check.sql, con UUID y emails distintos.

do $$
declare
  -- Usuarios ficticios (se revierten con todo lo demás)
  c_user_a constant uuid := '00000000-0000-4000-8000-0000000000d1';
  c_user_b constant uuid := '00000000-0000-4000-8000-0000000000d2';
  c_source_monday constant date := '2026-10-19';  -- lunes de la tabla origen
  c_target_monday constant date := '2026-10-26';  -- lunes de destino
  c_target_tuesday constant date := '2026-10-27'; -- martes (debe fallar)

  -- Rol privilegiado con el que arranca la sesión (para volver a él)
  v_orig_role text := current_user;

  v_claims_a text := json_build_object('sub', '00000000-0000-4000-8000-0000000000d1', 'role', 'authenticated')::text;
  v_claims_b text := json_build_object('sub', '00000000-0000-4000-8000-0000000000d2', 'role', 'authenticated')::text;
  v_claims_anon text := json_build_object('role', 'anon')::text;

  -- Filas de A
  v_sheet_src uuid;
  v_sheet_deleted uuid;
  v_sheet_new uuid;
  v_food_1 uuid;
  v_food_2 uuid;

  v_n bigint;
  v_start date;
  v_menu smallint;
  v_owner uuid;
  v_state text;
begin
  -- Bloque interno: todos los checks. Si salta un error inesperado se envuelve
  -- como DUPLICATE_CHECK_FAIL; nuestros propios DUPLICATE_CHECK_FAIL se relanzan tal cual.
  begin

    -- =====================================================================
    -- 0. Comprobaciones previas (rol privilegiado)
    -- =====================================================================

    -- Nunca tocar usuarios reales: si los UUID o emails ficticios existen, abortar.
    select count(*) into v_n
    from auth.users
    where id in (c_user_a, c_user_b)
       or email in ('dup-check-a@example.invalid', 'dup-check-b@example.invalid');
    if v_n > 0 then
      raise exception 'DUPLICATE_CHECK_FAIL: 0. los usuarios ficticios ya existen en auth.users (no se toca nada)';
    end if;

    -- La función existe con la firma esperada
    if to_regprocedure('public.duplicate_weekly_sheet(uuid, date)') is null then
      raise exception 'DUPLICATE_CHECK_FAIL: 0. no existe public.duplicate_weekly_sheet(uuid, date)';
    end if;
    raise notice 'OK 0: preflight (usuarios ficticios libres, función presente)';

    -- Usuarios ficticios A y B (columnas mínimas)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
      ('00000000-0000-0000-0000-000000000000', c_user_a, 'authenticated', 'authenticated',
       'dup-check-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('00000000-0000-0000-0000-000000000000', c_user_b, 'authenticated', 'authenticated',
       'dup-check-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());
    raise notice 'OK 0: usuarios ficticios A y B creados (se revierten al final)';

    -- =====================================================================
    -- 1. Como A: tabla origen con comidas (una borrada) y un daily_log
    -- =====================================================================
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', v_claims_a, true);

    if auth.uid() is distinct from c_user_a then
      raise exception 'DUPLICATE_CHECK_FAIL: 1. auth.uid() no devuelve el usuario A (devuelve %)', auth.uid();
    end if;

    insert into public.weekly_sheets (start_date, menu_number)
    values (c_source_monday, 3) returning id into v_sheet_src;

    insert into public.foods (name, default_quantity, default_unit)
    values ('Dup check tostada', 2, 'unidades') returning id into v_food_1;
    insert into public.foods (name, default_quantity, default_unit)
    values ('Dup check yogur', 1, 'unidad') returning id into v_food_2;

    -- Dos comidas vivas en celdas distintas y una borrada (no debe copiarse)
    insert into public.meal_entries (sheet_id, food_id, day_of_week, meal_slot, quantity, unit, position)
    values
      (v_sheet_src, v_food_1, 1, 'breakfast', 2, 'unidades', 0),
      (v_sheet_src, v_food_2, 3, 'afternoon_snack', 1.5, 'unidad', 1),
      (v_sheet_src, v_food_1, 5, 'dinner', 3, 'unidades', 2);
    update public.meal_entries set deleted_at = now()
    where sheet_id = v_sheet_src and day_of_week = 5 and meal_slot = 'dinner';
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception 'DUPLICATE_CHECK_FAIL: 1. no se pudo marcar como borrada la tercera comida';
    end if;

    insert into public.daily_logs (sheet_id, day_of_week, water_liters, pee_count, poop_count, steps)
    values (v_sheet_src, 1, 1.5, 4, 1, 8000);
    raise notice 'OK 1: A crea tabla origen (menú 3), 2 comidas, 3 meal_entries (1 borrada) y 1 daily_log';

    -- =====================================================================
    -- 2. A duplica a la semana siguiente
    -- =====================================================================
    v_sheet_new := public.duplicate_weekly_sheet(v_sheet_src, c_target_monday);

    if v_sheet_new is null or v_sheet_new = v_sheet_src then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. la función no devolvió un id nuevo (devolvió %)', v_sheet_new;
    end if;

    select s.start_date, s.menu_number, s.owner_id into v_start, v_menu, v_owner
    from public.weekly_sheets s
    where s.id = v_sheet_new and s.deleted_at is null;
    if not found then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. A no ve la tabla nueva';
    end if;
    if v_start is distinct from c_target_monday then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. start_date de la tabla nueva es % (esperado %)', v_start, c_target_monday;
    end if;
    if v_menu is distinct from 3 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. menu_number de la tabla nueva es % (esperado 3)', v_menu;
    end if;
    if v_owner is distinct from c_user_a then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. owner_id de la tabla nueva no es A';
    end if;
    raise notice 'OK 2: tabla nueva con id distinto, lunes 2026-10-26, menú 3 y dueño A';

    -- Exactamente 2 meal_entries, vivas y de A
    select count(*) into v_n from public.meal_entries where sheet_id = v_sheet_new;
    if v_n <> 2 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. la tabla nueva tiene % meal_entries (esperadas 2)', v_n;
    end if;
    select count(*) into v_n from public.meal_entries
    where sheet_id = v_sheet_new and deleted_at is null and owner_id = c_user_a;
    if v_n <> 2 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. las meal_entries copiadas no están vivas o no son de A';
    end if;

    -- Mismo contenido que las no borradas del origen (diferencia simétrica vacía)
    select count(*) into v_n from (
      (select food_id, day_of_week, meal_slot, quantity, unit, position
         from public.meal_entries where sheet_id = v_sheet_src and deleted_at is null
       except
       select food_id, day_of_week, meal_slot, quantity, unit, position
         from public.meal_entries where sheet_id = v_sheet_new)
      union all
      (select food_id, day_of_week, meal_slot, quantity, unit, position
         from public.meal_entries where sheet_id = v_sheet_new
       except
       select food_id, day_of_week, meal_slot, quantity, unit, position
         from public.meal_entries where sheet_id = v_sheet_src and deleted_at is null)
    ) d;
    if v_n <> 0 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. las meal_entries copiadas no coinciden con las del origen (% diferencias)', v_n;
    end if;
    raise notice 'OK 2: se copian exactamente las 2 comidas no borradas (food/día/momento/cantidad/unidad/posición)';

    -- No se copian daily_logs
    select count(*) into v_n from public.daily_logs where sheet_id = v_sheet_new;
    if v_n <> 0 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. la tabla nueva tiene % daily_logs (esperados 0)', v_n;
    end if;
    raise notice 'OK 2: no se copian daily_logs';

    -- El origen sigue intacto
    select count(*) into v_n from public.meal_entries where sheet_id = v_sheet_src;
    if v_n <> 3 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. el origen tiene % meal_entries (esperadas 3)', v_n;
    end if;
    select count(*) into v_n from public.daily_logs where sheet_id = v_sheet_src;
    if v_n <> 1 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. el origen tiene % daily_logs (esperado 1)', v_n;
    end if;
    select count(*) into v_n from public.weekly_sheets
    where id = v_sheet_src and start_date = c_source_monday and menu_number = 3 and deleted_at is null;
    if v_n <> 1 then
      raise exception 'DUPLICATE_CHECK_FAIL: 2. la tabla origen cambió';
    end if;
    raise notice 'OK 2: el origen sigue intacto (3 meal_entries, 1 daily_log)';

    -- =====================================================================
    -- 3. Semana de destino inválida → 22023
    -- =====================================================================
    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(v_sheet_src, c_target_tuesday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'DUPLICATE_CHECK_FAIL: 3. duplicar a un martes no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(v_sheet_src, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'DUPLICATE_CHECK_FAIL: 3. duplicar con destino null no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 3: destino en martes o null rechazado (22023)';

    -- =====================================================================
    -- 4. Origen inexistente → P0002
    -- =====================================================================
    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(gen_random_uuid(), c_target_monday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'DUPLICATE_CHECK_FAIL: 4. duplicar un id inexistente no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 4: origen inexistente rechazado (P0002)';

    -- =====================================================================
    -- 5. Origen borrado (deleted_at no nulo) → P0002
    -- =====================================================================
    insert into public.weekly_sheets (start_date, menu_number, deleted_at)
    values (c_source_monday, 4, now()) returning id into v_sheet_deleted;

    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(v_sheet_deleted, c_target_monday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'DUPLICATE_CHECK_FAIL: 5. duplicar una tabla borrada no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 5: origen borrado rechazado (P0002)';

    -- =====================================================================
    -- 6. Como B: no puede duplicar la tabla de A (por RLS ni la ve)
    -- =====================================================================
    perform set_config('request.jwt.claims', v_claims_b, true);

    if auth.uid() is distinct from c_user_b then
      raise exception 'DUPLICATE_CHECK_FAIL: 6. auth.uid() no devuelve el usuario B';
    end if;

    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(v_sheet_src, c_target_monday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'DUPLICATE_CHECK_FAIL: 6. B duplicó (o no falló con P0002) la tabla de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    select count(*) into v_n from public.weekly_sheets;
    if v_n <> 0 then
      raise exception 'DUPLICATE_CHECK_FAIL: 6. B ve % weekly_sheets (esperadas 0)', v_n;
    end if;
    raise notice 'OK 6: B no puede duplicar la tabla de A (P0002) y sigue sin tablas';

    -- Con el rol privilegiado: B no tiene ninguna tabla real y A solo las 3 creadas aquí
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

    select count(*) into v_n from public.weekly_sheets where owner_id = c_user_b;
    if v_n <> 0 then
      raise exception 'DUPLICATE_CHECK_FAIL: 6. existen % weekly_sheets de B', v_n;
    end if;
    select count(*) into v_n from public.weekly_sheets where owner_id = c_user_a;
    if v_n <> 3 then
      raise exception 'DUPLICATE_CHECK_FAIL: 6. A tiene % weekly_sheets (esperadas 3: origen, borrada y copia)', v_n;
    end if;
    raise notice 'OK 6: sin filas de B; A conserva solo origen, borrada y copia';

    -- =====================================================================
    -- 7. anon: sin permiso de execute → 42501
    -- =====================================================================
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', v_claims_anon, true);

    v_state := null;
    begin
      perform public.duplicate_weekly_sheet(v_sheet_src, c_target_monday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'DUPLICATE_CHECK_FAIL: 7. anon pudo llamar a la función (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 7: anon no puede ejecutar duplicate_weekly_sheet (42501)';

    -- Vuelta al rol privilegiado antes de terminar
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

  exception when others then
    -- Nuestros fallos se relanzan tal cual; cualquier otro error se marca como fallo.
    if sqlerrm like 'DUPLICATE_CHECK_FAIL:%' then
      raise;
    end if;
    raise exception 'DUPLICATE_CHECK_FAIL: error inesperado (sqlstate %): %', sqlstate, sqlerrm;
  end;

  -- Todo ha pasado. Se lanza SIEMPRE una excepción para revertir todo lo hecho.
  raise exception 'DUPLICATE_CHECK_OK';
end
$$;
