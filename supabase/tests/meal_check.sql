-- Spec 007 · Comprobación de public.save_meal_entry(entry_id, sheet_id, day, slot,
--            food_id, food_name, quantity, unit).
-- Spec 008 · Posiciones dispersas: las entradas nuevas y las que cambian de celda
--            van a máx + 1024 (celda vacía → 0; datos antiguos 0, 1 → 1025).
--
-- Se ejecuta con:  supabase db query --linked -f supabase/tests/meal_check.sql
--
-- REGLA DE ORO: no puede quedar ningún dato. Todo el script es UN único bloque DO
-- que termina SIEMPRE con `raise exception`, así Postgres revierte todo lo hecho
-- (usuarios ficticios, filas y cambios de rol).
--   · Si todo pasa      → error 'MEAL_CHECK_OK'
--   · Si un check falla → error 'MEAL_CHECK_FAIL: <qué check>'
--   · Cualquier otro mensaje también es un fallo (se envuelve como MEAL_CHECK_FAIL).
-- Las trazas de cada check que pasa salen como NOTICE.
--
-- Se ejecuta contra PRODUCCIÓN, donde ya hay datos reales: el script solo cuenta y
-- modifica filas de sus propios usuarios ficticios (nunca supone tablas vacías).
--
-- Actúa como usuario A, usuario B (UUID ficticios creados dentro del bloque) y anon,
-- cambiando de rol con set_config('role', …, true) + request.jwt.claims, igual que PostgREST.
-- Mismo patrón que supabase/tests/duplicate_check.sql, con UUID y emails distintos.

do $$
declare
  -- Usuarios ficticios (se revierten con todo lo demás)
  c_user_a constant uuid := '00000000-0000-4000-8000-0000000000e1';
  c_user_b constant uuid := '00000000-0000-4000-8000-0000000000e2';
  c_monday constant date := '2026-10-19';  -- lunes de las tablas de prueba

  -- Rol privilegiado con el que arranca la sesión (para volver a él)
  v_orig_role text := current_user;

  v_claims_a text := json_build_object('sub', '00000000-0000-4000-8000-0000000000e1', 'role', 'authenticated')::text;
  v_claims_b text := json_build_object('sub', '00000000-0000-4000-8000-0000000000e2', 'role', 'authenticated')::text;
  v_claims_anon text := json_build_object('role', 'anon')::text;

  -- Filas de A
  v_sheet uuid;
  v_sheet_deleted uuid;
  v_food uuid;
  v_food_yogur uuid;
  v_entry_1 uuid;
  v_entry_2 uuid;
  v_entry_3 uuid;
  v_entry_4 uuid;
  v_ret uuid;

  -- Filas de B
  v_sheet_b uuid;

  v_n bigint;
  v_pos integer;
  v_qty numeric;
  v_unit text;
  v_day smallint;
  v_slot text;
  v_food_of uuid;
  v_owner uuid;
  v_name text;
  v_state text;
begin
  -- Bloque interno: todos los checks. Si salta un error inesperado se envuelve
  -- como MEAL_CHECK_FAIL; nuestros propios MEAL_CHECK_FAIL se relanzan tal cual.
  begin

    -- =====================================================================
    -- 0. Comprobaciones previas (rol privilegiado)
    -- =====================================================================

    -- Nunca tocar usuarios reales: si los UUID o emails ficticios existen, abortar.
    select count(*) into v_n
    from auth.users
    where id in (c_user_a, c_user_b)
       or email in ('meal-check-a@example.invalid', 'meal-check-b@example.invalid');
    if v_n > 0 then
      raise exception 'MEAL_CHECK_FAIL: 0. los usuarios ficticios ya existen en auth.users (no se toca nada)';
    end if;

    -- La función existe con la firma esperada
    if to_regprocedure('public.save_meal_entry(uuid, uuid, smallint, text, uuid, text, numeric, text)') is null then
      raise exception 'MEAL_CHECK_FAIL: 0. no existe public.save_meal_entry(uuid, uuid, smallint, text, uuid, text, numeric, text)';
    end if;
    raise notice 'OK 0: preflight (usuarios ficticios libres, función presente)';

    -- Usuarios ficticios A y B (columnas mínimas)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
      ('00000000-0000-0000-0000-000000000000', c_user_a, 'authenticated', 'authenticated',
       'meal-check-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('00000000-0000-0000-0000-000000000000', c_user_b, 'authenticated', 'authenticated',
       'meal-check-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());
    raise notice 'OK 0: usuarios ficticios A y B creados (se revierten al final)';

    -- =====================================================================
    -- 1. Como A: tabla semanal y primera comida nueva por nombre
    -- =====================================================================
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', v_claims_a, true);

    if auth.uid() is distinct from c_user_a then
      raise exception 'MEAL_CHECK_FAIL: 1. auth.uid() no devuelve el usuario A (devuelve %)', auth.uid();
    end if;

    insert into public.weekly_sheets (start_date, menu_number)
    values (c_monday, 1) returning id into v_sheet;

    v_entry_1 := public.save_meal_entry(
      null, v_sheet, 2::smallint, 'breakfast', null, 'Tostadas con aceite', 2, 'unidad');
    if v_entry_1 is null then
      raise exception 'MEAL_CHECK_FAIL: 1. la función no devolvió id de entrada';
    end if;

    -- Exactamente 1 comida de A con ese nombre, con la cantidad/unidad habituales
    select count(*) into v_n from public.foods
    where owner_id = c_user_a and lower(name) = lower('Tostadas con aceite') and deleted_at is null;
    if v_n <> 1 then
      raise exception 'MEAL_CHECK_FAIL: 1. A tiene % comidas "Tostadas con aceite" (esperada 1)', v_n;
    end if;
    select f.id, f.default_quantity, f.default_unit into v_food, v_qty, v_unit
    from public.foods f
    where f.owner_id = c_user_a and lower(f.name) = lower('Tostadas con aceite') and f.deleted_at is null;
    if v_qty is distinct from 2 or v_unit is distinct from 'unidad' then
      raise exception 'MEAL_CHECK_FAIL: 1. habituales de la comida son %/% (esperado 2/unidad)', v_qty, v_unit;
    end if;

    -- La entrada: de A, en (2, breakfast), con esa comida y position 0
    select e.position, e.food_id, e.quantity, e.unit, e.day_of_week, e.meal_slot, e.owner_id
      into v_pos, v_food_of, v_qty, v_unit, v_day, v_slot, v_owner
    from public.meal_entries e
    where e.id = v_entry_1 and e.sheet_id = v_sheet and e.deleted_at is null;
    if not found then
      raise exception 'MEAL_CHECK_FAIL: 1. no se encuentra la entrada creada';
    end if;
    if v_pos is distinct from 0 or v_food_of is distinct from v_food
       or v_qty is distinct from 2 or v_unit is distinct from 'unidad'
       or v_day is distinct from 2 or v_slot is distinct from 'breakfast'
       or v_owner is distinct from c_user_a then
      raise exception 'MEAL_CHECK_FAIL: 1. entrada incorrecta (pos %, food ok %, %/%, día %, %, dueño A %)',
        v_pos, v_food_of = v_food, v_qty, v_unit, v_day, v_slot, v_owner = c_user_a;
    end if;
    raise notice 'OK 1: crea la comida "Tostadas con aceite" (2/unidad) y la entrada en position 0';

    -- =====================================================================
    -- 2. Mismo nombre con otras mayúsculas/espacios → reutiliza la comida
    -- =====================================================================
    v_entry_2 := public.save_meal_entry(
      null, v_sheet, 2::smallint, 'breakfast', null, 'tostadas con ACEITE ', 3, 'unidades');

    select count(*) into v_n from public.foods
    where owner_id = c_user_a and lower(name) = lower('Tostadas con aceite') and deleted_at is null;
    if v_n <> 1 then
      raise exception 'MEAL_CHECK_FAIL: 2. A tiene % comidas "tostadas con aceite" (esperada 1: debía reutilizarse)', v_n;
    end if;

    select e.position, e.food_id into v_pos, v_food_of
    from public.meal_entries e where e.id = v_entry_2 and e.deleted_at is null;
    if not found or v_entry_2 = v_entry_1 then
      raise exception 'MEAL_CHECK_FAIL: 2. no se creó una entrada nueva';
    end if;
    if v_food_of is distinct from v_food then
      raise exception 'MEAL_CHECK_FAIL: 2. la entrada no reutiliza la comida existente';
    end if;
    if v_pos is distinct from 1024 then
      raise exception 'MEAL_CHECK_FAIL: 2. la segunda entrada de la celda tiene position % (esperado 1024)', v_pos;
    end if;

    select f.name, f.default_quantity, f.default_unit into v_name, v_qty, v_unit
    from public.foods f where f.id = v_food;
    if v_name is distinct from 'Tostadas con aceite' then
      raise exception 'MEAL_CHECK_FAIL: 2. el nombre de la comida cambió a "%"', v_name;
    end if;
    if v_qty is distinct from 3 or v_unit is distinct from 'unidades' then
      raise exception 'MEAL_CHECK_FAIL: 2. habituales son %/% (esperado 3/unidades)', v_qty, v_unit;
    end if;
    raise notice 'OK 2: reutiliza la comida sin distinguir mayúsculas/espacios, position 1024, habituales 3/unidades';

    -- =====================================================================
    -- 3. Comida elegida del catálogo (p_food_id) en otra celda
    -- =====================================================================
    v_entry_3 := public.save_meal_entry(
      null, v_sheet, 3::smallint, 'lunch', v_food, null, 150, 'g');

    select e.position, e.food_id, e.quantity, e.unit into v_pos, v_food_of, v_qty, v_unit
    from public.meal_entries e where e.id = v_entry_3 and e.deleted_at is null;
    if not found then
      raise exception 'MEAL_CHECK_FAIL: 3. no se encuentra la entrada creada con p_food_id';
    end if;
    if v_pos is distinct from 0 or v_food_of is distinct from v_food
       or v_qty is distinct from 150 or v_unit is distinct from 'g' then
      raise exception 'MEAL_CHECK_FAIL: 3. entrada incorrecta (pos %, food ok %, %/%)',
        v_pos, v_food_of = v_food, v_qty, v_unit;
    end if;

    select f.default_quantity, f.default_unit into v_qty, v_unit
    from public.foods f where f.id = v_food;
    if v_qty is distinct from 150 or v_unit is distinct from 'g' then
      raise exception 'MEAL_CHECK_FAIL: 3. habituales son %/% (esperado 150/g)', v_qty, v_unit;
    end if;
    raise notice 'OK 3: con p_food_id crea la entrada en position 0 de (3, lunch); habituales 150/g';

    -- =====================================================================
    -- 4. Editar una entrada: misma celda conserva position; otra celda va al final
    -- =====================================================================
    v_ret := public.save_meal_entry(
      v_entry_1, v_sheet, 2::smallint, 'breakfast', v_food, null, 5, 'unidad');
    if v_ret is distinct from v_entry_1 then
      raise exception 'MEAL_CHECK_FAIL: 4. editar devolvió otro id (%)', v_ret;
    end if;

    select e.position, e.quantity, e.unit, e.day_of_week, e.meal_slot
      into v_pos, v_qty, v_unit, v_day, v_slot
    from public.meal_entries e where e.id = v_entry_1 and e.deleted_at is null;
    if v_pos is distinct from 0 or v_qty is distinct from 5 or v_unit is distinct from 'unidad'
       or v_day is distinct from 2 or v_slot is distinct from 'breakfast' then
      raise exception 'MEAL_CHECK_FAIL: 4. edición en la misma celda incorrecta (pos %, %/%, día %, %)',
        v_pos, v_qty, v_unit, v_day, v_slot;
    end if;
    raise notice 'OK 4: editar la cantidad en la misma celda conserva position 0';

    -- Mover a (3, lunch), donde ya está la entrada 3 en position 0
    v_ret := public.save_meal_entry(
      v_entry_1, v_sheet, 3::smallint, 'lunch', v_food, null, 5, 'unidad');
    if v_ret is distinct from v_entry_1 then
      raise exception 'MEAL_CHECK_FAIL: 4. mover devolvió otro id (%)', v_ret;
    end if;

    select e.position, e.day_of_week, e.meal_slot into v_pos, v_day, v_slot
    from public.meal_entries e where e.id = v_entry_1 and e.deleted_at is null;
    if v_day is distinct from 3 or v_slot is distinct from 'lunch' then
      raise exception 'MEAL_CHECK_FAIL: 4. la entrada no se movió a (3, lunch) (está en %, %)', v_day, v_slot;
    end if;
    if v_pos is distinct from 1024 then
      raise exception 'MEAL_CHECK_FAIL: 4. al moverla quedó en position % (esperado 1024, al final)', v_pos;
    end if;

    -- Editar no crea filas nuevas: siguen 3 entradas en la tabla
    select count(*) into v_n from public.meal_entries where sheet_id = v_sheet;
    if v_n <> 3 then
      raise exception 'MEAL_CHECK_FAIL: 4. la tabla tiene % entradas (esperadas 3)', v_n;
    end if;
    raise notice 'OK 4: moverla a otra celda la pone al final (position 1024) sin crear filas';

    -- =====================================================================
    -- 5. Unidad solo con espacios → se guarda null
    -- =====================================================================
    v_entry_4 := public.save_meal_entry(
      null, v_sheet, 4::smallint, 'dinner', null, 'Yogur meal check', 1, '  ');

    select e.unit, e.food_id into v_unit, v_food_yogur
    from public.meal_entries e where e.id = v_entry_4 and e.deleted_at is null;
    if not found then
      raise exception 'MEAL_CHECK_FAIL: 5. no se encuentra la entrada con unidad en blanco';
    end if;
    if v_unit is not null then
      raise exception 'MEAL_CHECK_FAIL: 5. la entrada guardó la unidad "%" (esperado null)', v_unit;
    end if;
    select f.default_unit, f.default_quantity into v_unit, v_qty
    from public.foods f where f.id = v_food_yogur;
    if v_unit is not null or v_qty is distinct from 1 then
      raise exception 'MEAL_CHECK_FAIL: 5. habituales del yogur son %/% (esperado 1/null)', v_qty, v_unit;
    end if;
    raise notice 'OK 5: unidad "  " se guarda como null (entrada y habitual)';

    -- =====================================================================
    -- 6. Validaciones → 22023
    -- =====================================================================
    -- Ambos: food_id y food_name
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', v_food, 'Otra', 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. food_id + food_name no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Ninguno
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', null, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. sin food_id ni food_name no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Nombre solo con espacios
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', null, '   ', 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. nombre en blanco no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Cantidad 0
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', v_food, null, 0, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. cantidad 0 no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Día 8
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 8::smallint, 'breakfast', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. día 8 no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Momento no válido
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'snack', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '22023' then
      raise exception 'MEAL_CHECK_FAIL: 6. momento "snack" no dio 22023 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Ninguna validación fallida dejó filas
    select count(*) into v_n from public.meal_entries where sheet_id = v_sheet;
    if v_n <> 4 then
      raise exception 'MEAL_CHECK_FAIL: 6. la tabla tiene % entradas tras las validaciones (esperadas 4)', v_n;
    end if;
    raise notice 'OK 6: ambos/ninguno, nombre en blanco, cantidad 0, día 8 y momento no válido → 22023';

    -- =====================================================================
    -- 7. No encontrado → P0002
    -- =====================================================================
    -- Tabla inexistente
    v_state := null;
    begin
      perform public.save_meal_entry(null, gen_random_uuid(), 1::smallint, 'breakfast', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 7. tabla inexistente no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Comida inexistente
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', gen_random_uuid(), null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 7. comida inexistente no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Entrada a editar inexistente
    v_state := null;
    begin
      perform public.save_meal_entry(gen_random_uuid(), v_sheet, 1::smallint, 'breakfast', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 7. entrada inexistente no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Tabla borrada (deleted_at no nulo)
    insert into public.weekly_sheets (start_date, menu_number, deleted_at)
    values (c_monday, 2, now()) returning id into v_sheet_deleted;

    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet_deleted, 1::smallint, 'breakfast', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 7. tabla borrada no dio P0002 (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 7: tabla, comida o entrada inexistentes y tabla borrada → P0002';

    -- =====================================================================
    -- 8. Como B: no puede usar ni tocar nada de A
    -- =====================================================================
    perform set_config('request.jwt.claims', v_claims_b, true);

    if auth.uid() is distinct from c_user_b then
      raise exception 'MEAL_CHECK_FAIL: 8. auth.uid() no devuelve el usuario B';
    end if;

    insert into public.weekly_sheets (start_date, menu_number)
    values (c_monday, 1) returning id into v_sheet_b;

    -- Apuntar en la tabla de A
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', null, 'Meal check B', 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 8. B apuntó en la tabla de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Usar la comida de A en su propia tabla
    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet_b, 1::smallint, 'breakfast', v_food, null, 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 8. B usó la comida de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- Editar la entrada de A (desde su propia tabla y con una comida por nombre)
    v_state := null;
    begin
      perform public.save_meal_entry(v_entry_1, v_sheet_b, 1::smallint, 'breakfast', null, 'Meal check B', 9, 'g');
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from 'P0002' then
      raise exception 'MEAL_CHECK_FAIL: 8. B editó la entrada de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 8: B no puede usar la tabla ni la comida de A ni editar su entrada (P0002)';

    -- Con el rol privilegiado: filas de A intactas y B sin comidas ni entradas
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

    select count(*) into v_n from public.foods where owner_id = c_user_b;
    if v_n <> 0 then
      raise exception 'MEAL_CHECK_FAIL: 8. B tiene % comidas (esperadas 0)', v_n;
    end if;
    select count(*) into v_n from public.meal_entries where owner_id = c_user_b;
    if v_n <> 0 then
      raise exception 'MEAL_CHECK_FAIL: 8. B tiene % entradas (esperadas 0)', v_n;
    end if;

    select count(*) into v_n from public.foods where owner_id = c_user_a;
    if v_n <> 2 then
      raise exception 'MEAL_CHECK_FAIL: 8. A tiene % comidas (esperadas 2: tostadas y yogur)', v_n;
    end if;
    select f.default_quantity, f.default_unit into v_qty, v_unit
    from public.foods f where f.id = v_food;
    if v_qty is distinct from 5 or v_unit is distinct from 'unidad' then
      raise exception 'MEAL_CHECK_FAIL: 8. habituales de las tostadas son %/% (esperado 5/unidad)', v_qty, v_unit;
    end if;

    select count(*) into v_n from public.meal_entries where owner_id = c_user_a;
    if v_n <> 4 then
      raise exception 'MEAL_CHECK_FAIL: 8. A tiene % entradas (esperadas 4)', v_n;
    end if;
    select e.sheet_id, e.day_of_week, e.meal_slot, e.position, e.quantity, e.unit, e.food_id
      into v_ret, v_day, v_slot, v_pos, v_qty, v_unit, v_food_of
    from public.meal_entries e where e.id = v_entry_1;
    if v_ret is distinct from v_sheet or v_day is distinct from 3 or v_slot is distinct from 'lunch'
       or v_pos is distinct from 1024 or v_qty is distinct from 5 or v_unit is distinct from 'unidad'
       or v_food_of is distinct from v_food then
      raise exception 'MEAL_CHECK_FAIL: 8. la entrada 1 de A cambió (día %, %, pos %, %/%)',
        v_day, v_slot, v_pos, v_qty, v_unit;
    end if;
    raise notice 'OK 8: filas de A intactas (2 comidas, 4 entradas) y B sin comidas ni entradas';

    -- =====================================================================
    -- 9. anon: sin permiso de execute → 42501
    -- =====================================================================
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', v_claims_anon, true);

    v_state := null;
    begin
      perform public.save_meal_entry(null, v_sheet, 1::smallint, 'breakfast', null, 'Meal check anon', 1, null);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'MEAL_CHECK_FAIL: 9. anon pudo llamar a la función (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 9: anon no puede ejecutar save_meal_entry (42501)';

    -- =====================================================================
    -- 10. Como A: celda con datos antiguos (positions 0 y 1) → nueva en 1025
    -- =====================================================================
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', v_claims_a, true);

    -- Dos entradas "de antes de 008", insertadas directamente (owner_id por defecto: A)
    insert into public.meal_entries (sheet_id, food_id, day_of_week, meal_slot, quantity, unit, position)
    values
      (v_sheet, v_food, 5::smallint, 'mid_morning', 1, null, 0),
      (v_sheet, v_food, 5::smallint, 'mid_morning', 1, null, 1);

    v_ret := public.save_meal_entry(
      null, v_sheet, 5::smallint, 'mid_morning', v_food, null, 1, null);

    select e.position into v_pos
    from public.meal_entries e where e.id = v_ret and e.deleted_at is null;
    if not found then
      raise exception 'MEAL_CHECK_FAIL: 10. no se encuentra la entrada nueva en la celda con datos antiguos';
    end if;
    if v_pos is distinct from 1025 then
      raise exception 'MEAL_CHECK_FAIL: 10. la entrada nueva quedó en position % (esperado 1025 = 1 + 1024)', v_pos;
    end if;

    -- Las filas antiguas no se renumeran
    select count(*) into v_n from public.meal_entries
    where sheet_id = v_sheet and day_of_week = 5 and meal_slot = 'mid_morning'
      and deleted_at is null and position in (0, 1);
    if v_n <> 2 then
      raise exception 'MEAL_CHECK_FAIL: 10. las entradas antiguas cambiaron de position (quedan % en 0/1, esperadas 2)', v_n;
    end if;
    raise notice 'OK 10: en una celda con positions 0 y 1 la nueva va a 1025 sin renumerar las antiguas';

    -- Vuelta al rol privilegiado antes de terminar
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

  exception when others then
    -- Nuestros fallos se relanzan tal cual; cualquier otro error se marca como fallo.
    if sqlerrm like 'MEAL_CHECK_FAIL:%' then
      raise;
    end if;
    raise exception 'MEAL_CHECK_FAIL: error inesperado (sqlstate %): %', sqlstate, sqlerrm;
  end;

  -- Todo ha pasado. Se lanza SIEMPRE una excepción para revertir todo lo hecho.
  raise exception 'MEAL_CHECK_OK';
end
$$;
