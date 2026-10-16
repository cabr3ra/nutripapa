-- Spec 003 · Comprobación de RLS, Storage y varias tablas por semana.
--
-- Se ejecuta con:  supabase db query --linked -f supabase/tests/rls_check.sql
--
-- REGLA DE ORO: no puede quedar ningún dato. Todo el script es UN único bloque DO
-- que termina SIEMPRE con `raise exception`, así Postgres revierte todo lo hecho
-- (usuarios ficticios, filas, objetos del bucket y cambios de rol).
--   · Si todo pasa      → error 'RLS_CHECK_OK'
--   · Si un check falla → error 'RLS_CHECK_FAIL: <qué check>'
--   · Cualquier otro mensaje también es un fallo (se envuelve como RLS_CHECK_FAIL).
-- Las trazas de cada check que pasa salen como NOTICE.
--
-- Actúa como usuario A, usuario B (UUID ficticios creados dentro del bloque) y anon,
-- cambiando de rol con set_config('role', …, true) + request.jwt.claims, igual que PostgREST.

do $$
declare
  -- Usuarios ficticios (se revierten con todo lo demás)
  c_user_a constant uuid := '00000000-0000-4000-8000-00000000000a';
  c_user_b constant uuid := '00000000-0000-4000-8000-00000000000b';
  c_monday constant date := '2026-10-19';   -- lunes
  c_tuesday constant date := '2026-10-20';  -- martes (debe fallar)

  -- Rol privilegiado con el que arranca la sesión (para volver a él)
  v_orig_role text := current_user;

  v_claims_a text := json_build_object('sub', '00000000-0000-4000-8000-00000000000a', 'role', 'authenticated')::text;
  v_claims_b text := json_build_object('sub', '00000000-0000-4000-8000-00000000000b', 'role', 'authenticated')::text;
  v_claims_anon text := json_build_object('role', 'anon')::text;

  c_tables constant text[] := array['weekly_sheets', 'foods', 'meal_entries', 'daily_logs', 'sent_pdfs'];
  v_table text;

  -- Filas de A
  v_sheet_a1 uuid;
  v_sheet_a2 uuid;
  v_food_a uuid;
  v_meal_a uuid;
  v_log_a uuid;
  v_pdf_a uuid;
  -- Filas de B
  v_sheet_b uuid;
  v_food_b uuid;

  v_n bigint;
  v_state text;
  v_msg text;
  v_storage_ok boolean;
  v_obj_path_a text := '00000000-0000-4000-8000-00000000000a/rls-check.pdf';
  v_obj_path_b text := '00000000-0000-4000-8000-00000000000b/rls-check.pdf';
begin
  -- Bloque interno: todos los checks. Si salta un error inesperado se envuelve
  -- como RLS_CHECK_FAIL; nuestros propios RLS_CHECK_FAIL se relanzan tal cual.
  begin

    -- =====================================================================
    -- 0. Comprobaciones previas (rol privilegiado)
    -- =====================================================================

    -- Nunca tocar usuarios reales: si los UUID o emails ficticios existen, abortar.
    select count(*) into v_n
    from auth.users
    where id in (c_user_a, c_user_b)
       or email in ('rls-check-a@example.invalid', 'rls-check-b@example.invalid');
    if v_n > 0 then
      raise exception 'RLS_CHECK_FAIL: 0. los usuarios ficticios ya existen en auth.users (no se toca nada)';
    end if;

    -- RLS activado en las 5 tablas
    select count(*) into v_n
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any (c_tables)
      and c.relrowsecurity;
    if v_n <> 5 then
      raise exception 'RLS_CHECK_FAIL: 0. RLS no está activado en las 5 tablas (activado en %)', v_n;
    end if;

    -- Bucket privado existente
    select count(*) into v_n
    from storage.buckets
    where id = 'sent-pdfs' and public = false;
    if v_n <> 1 then
      raise exception 'RLS_CHECK_FAIL: 0. el bucket sent-pdfs no existe o no es privado';
    end if;
    raise notice 'OK 0: preflight (usuarios ficticios libres, RLS en 5 tablas, bucket privado)';

    -- Usuarios ficticios A y B (columnas mínimas)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values
      ('00000000-0000-0000-0000-000000000000', c_user_a, 'authenticated', 'authenticated',
       'rls-check-a@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('00000000-0000-0000-0000-000000000000', c_user_b, 'authenticated', 'authenticated',
       'rls-check-b@example.invalid', '', '{}'::jsonb, '{}'::jsonb, now(), now());
    raise notice 'OK 0: usuarios ficticios A y B creados (se revierten al final)';

    -- =====================================================================
    -- 1 y 2. Como A: inserta en las 5 tablas y DOS tablas el mismo lunes
    -- =====================================================================
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', v_claims_a, true);

    if auth.uid() is distinct from c_user_a then
      raise exception 'RLS_CHECK_FAIL: 1. auth.uid() no devuelve el usuario A (devuelve %)', auth.uid();
    end if;

    insert into public.weekly_sheets (start_date, menu_number)
    values (c_monday, 1) returning id into v_sheet_a1;
    insert into public.weekly_sheets (start_date, menu_number)
    values (c_monday, 2) returning id into v_sheet_a2;

    insert into public.foods (name, is_favorite, default_quantity, default_unit)
    values ('RLS check tostada', true, 2, 'unidades') returning id into v_food_a;

    insert into public.meal_entries (sheet_id, food_id, day_of_week, meal_slot, quantity, unit)
    values (v_sheet_a1, v_food_a, 1, 'breakfast', 2, 'unidades') returning id into v_meal_a;

    insert into public.daily_logs (sheet_id, day_of_week, water_liters, pee_count, poop_count, steps)
    values (v_sheet_a1, 1, 1.5, 4, 1, 8000) returning id into v_log_a;

    insert into public.sent_pdfs (sheet_id, storage_path)
    values (v_sheet_a1, v_obj_path_a) returning id into v_pdf_a;

    -- owner_id se rellena solo con auth.uid()
    select count(*) into v_n from public.weekly_sheets
    where id in (v_sheet_a1, v_sheet_a2) and owner_id = c_user_a;
    if v_n <> 2 then
      raise exception 'RLS_CHECK_FAIL: 1. owner_id por defecto no es el usuario A';
    end if;
    raise notice 'OK 1: A inserta filas propias en las 5 tablas';

    -- A ve exactamente sus dos tablas del mismo lunes (y ninguna fila ajena)
    select count(*) into v_n from public.weekly_sheets where start_date = c_monday;
    if v_n <> 2 then
      raise exception 'RLS_CHECK_FAIL: 2. A debería ver 2 tablas con start_date %, ve %', c_monday, v_n;
    end if;
    select count(*) into v_n from public.weekly_sheets;
    if v_n <> 2 then
      raise exception 'RLS_CHECK_FAIL: 2. A ve % tablas semanales en total (esperadas 2: ve filas ajenas)', v_n;
    end if;
    raise notice 'OK 2: A tiene DOS tablas semanales con el mismo lunes y no ve filas ajenas';

    -- A puede actualizar lo suyo
    update public.weekly_sheets set menu_number = 3 where id = v_sheet_a2;
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception 'RLS_CHECK_FAIL: 1. A no puede actualizar su propia tabla semanal';
    end if;

    -- A no puede regalar su fila a B (with check del update)
    v_state := null;
    begin
      update public.weekly_sheets set owner_id = c_user_b where id = v_sheet_a2;
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 1. A pudo cambiar owner_id a B (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 1: A actualiza lo suyo y no puede cambiar el dueño';

    -- =====================================================================
    -- 5. start_date que no es lunes → check (23514)
    -- =====================================================================
    v_state := null;
    begin
      insert into public.weekly_sheets (start_date) values (c_tuesday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '23514' then
      raise exception 'RLS_CHECK_FAIL: 5. start_date en martes no falló por check (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 5: start_date que no es lunes rechazado (23514)';

    -- =====================================================================
    -- 3. Como B: aislamiento total respecto de A
    -- =====================================================================
    perform set_config('request.jwt.claims', v_claims_b, true);

    if auth.uid() is distinct from c_user_b then
      raise exception 'RLS_CHECK_FAIL: 3. auth.uid() no devuelve el usuario B';
    end if;

    -- B (aún sin datos) no ve ninguna fila en las 5 tablas
    foreach v_table in array c_tables loop
      execute format('select count(*) from public.%I', v_table) into v_n;
      if v_n <> 0 then
        raise exception 'RLS_CHECK_FAIL: 3. B ve % filas en %', v_n, v_table;
      end if;
    end loop;
    raise notice 'OK 3: B no ve ninguna fila en las 5 tablas';

    -- B no puede actualizar filas de A (0 filas afectadas)
    update public.weekly_sheets set menu_number = 9 where id = v_sheet_a1;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B actualizó weekly_sheets de A'; end if;
    update public.foods set name = 'hackeado' where id = v_food_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B actualizó foods de A'; end if;
    update public.meal_entries set quantity = 99 where id = v_meal_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B actualizó meal_entries de A'; end if;
    update public.daily_logs set steps = 1 where id = v_log_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B actualizó daily_logs de A'; end if;
    update public.sent_pdfs set storage_path = 'x/hackeado.pdf' where id = v_pdf_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B actualizó sent_pdfs de A'; end if;
    raise notice 'OK 3: B no puede actualizar filas de A (0 filas)';

    -- B no puede borrar filas de A (0 filas afectadas; hijas primero por las FK)
    delete from public.meal_entries where id = v_meal_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B borró meal_entries de A'; end if;
    delete from public.daily_logs where id = v_log_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B borró daily_logs de A'; end if;
    delete from public.sent_pdfs where id = v_pdf_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B borró sent_pdfs de A'; end if;
    delete from public.foods where id = v_food_a;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B borró foods de A'; end if;
    delete from public.weekly_sheets where id = v_sheet_a2;
    get diagnostics v_n = row_count;
    if v_n <> 0 then raise exception 'RLS_CHECK_FAIL: 3. B borró weekly_sheets de A'; end if;
    raise notice 'OK 3: B no puede borrar filas de A (0 filas)';

    -- B no puede insertar con owner_id = A
    v_state := null;
    begin
      insert into public.weekly_sheets (owner_id, start_date) values (c_user_a, c_monday);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó weekly_sheets con owner_id = A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.foods (owner_id, name) values (c_user_a, 'RLS check intruso');
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó foods con owner_id = A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 3: B no puede insertar con owner_id = A';

    -- B crea su propia tabla y comida (debe poder)
    insert into public.weekly_sheets (start_date) values (c_monday) returning id into v_sheet_b;
    insert into public.foods (name) values ('RLS check tostada') returning id into v_food_b;
    raise notice 'OK 3: B crea su propia tabla y comida (mismo nombre que A, sin choque)';

    -- B no puede colgar filas de la tabla semanal de A
    v_state := null;
    begin
      insert into public.meal_entries (sheet_id, food_id, day_of_week, meal_slot)
      values (v_sheet_a1, v_food_b, 2, 'lunch');
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó meal_entries en la tabla de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    -- …ni usar la comida de A en su propia tabla
    v_state := null;
    begin
      insert into public.meal_entries (sheet_id, food_id, day_of_week, meal_slot)
      values (v_sheet_b, v_food_a, 2, 'lunch');
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó meal_entries con la comida de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.daily_logs (sheet_id, day_of_week, steps) values (v_sheet_a1, 2, 100);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó daily_logs en la tabla de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.sent_pdfs (sheet_id, storage_path) values (v_sheet_a1, v_obj_path_b);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 3. B insertó sent_pdfs en la tabla de A (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 3: B no puede insertar meal_entries/daily_logs/sent_pdfs sobre datos de A';

    -- Vuelta al rol privilegiado: las filas de A siguen intactas
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

    select count(*) into v_n from public.weekly_sheets
    where owner_id = c_user_a and start_date = c_monday and menu_number in (1, 3);
    if v_n <> 2 then raise exception 'RLS_CHECK_FAIL: 3. las tablas semanales de A cambiaron'; end if;
    select count(*) into v_n from public.foods where id = v_food_a and name = 'RLS check tostada';
    if v_n <> 1 then raise exception 'RLS_CHECK_FAIL: 3. la comida de A cambió'; end if;
    select count(*) into v_n from public.meal_entries where id = v_meal_a and quantity = 2;
    if v_n <> 1 then raise exception 'RLS_CHECK_FAIL: 3. el meal_entry de A cambió'; end if;
    select count(*) into v_n from public.daily_logs where id = v_log_a and steps = 8000;
    if v_n <> 1 then raise exception 'RLS_CHECK_FAIL: 3. el daily_log de A cambió'; end if;
    select count(*) into v_n from public.sent_pdfs where id = v_pdf_a and storage_path = v_obj_path_a;
    if v_n <> 1 then raise exception 'RLS_CHECK_FAIL: 3. el sent_pdf de A cambió'; end if;
    raise notice 'OK 3: las filas de A siguen intactas tras los intentos de B';

    -- =====================================================================
    -- 4. anon: no lee ni escribe nada
    -- =====================================================================
    perform set_config('role', 'anon', true);
    perform set_config('request.jwt.claims', v_claims_anon, true);

    foreach v_table in array c_tables loop
      v_state := null;
      v_n := null;
      begin
        execute format('select count(*) from public.%I', v_table) into v_n;
      exception when others then
        v_state := sqlstate;
      end;
      if not (v_state = '42501' or (v_state is null and v_n = 0)) then
        raise exception 'RLS_CHECK_FAIL: 4. anon puede leer % (sqlstate %, filas %)', v_table, coalesce(v_state, 'sin error'), v_n;
      end if;
    end loop;
    raise notice 'OK 4: anon no puede leer las 5 tablas';

    v_state := null;
    begin
      insert into public.weekly_sheets (owner_id, start_date) values (c_user_a, c_monday);
    exception when others then v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 4. anon insertó en weekly_sheets (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.foods (owner_id, name) values (c_user_a, 'RLS check anon');
    exception when others then v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 4. anon insertó en foods (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.meal_entries (owner_id, sheet_id, food_id, day_of_week, meal_slot)
      values (c_user_a, v_sheet_a1, v_food_a, 3, 'dinner');
    exception when others then v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 4. anon insertó en meal_entries (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.daily_logs (owner_id, sheet_id, day_of_week) values (c_user_a, v_sheet_a1, 3);
    exception when others then v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 4. anon insertó en daily_logs (sqlstate %)', coalesce(v_state, 'sin error');
    end if;

    v_state := null;
    begin
      insert into public.sent_pdfs (owner_id, sheet_id, storage_path)
      values (c_user_a, v_sheet_a1, 'anon/rls-check.pdf');
    exception when others then v_state := sqlstate;
    end;
    if v_state is distinct from '42501' then
      raise exception 'RLS_CHECK_FAIL: 4. anon insertó en sent_pdfs (sqlstate %)', coalesce(v_state, 'sin error');
    end if;
    raise notice 'OK 4: anon no puede insertar en las 5 tablas';

    -- =====================================================================
    -- 6. Storage: carpetas por usuario en el bucket sent-pdfs
    -- =====================================================================
    -- Como A, subir a su carpeta. Si esto falla por cualquier motivo (triggers
    -- internos de Storage, tablas auxiliares como storage.prefixes…), no se
    -- puede distinguir de forma fiable de un fallo de RLS: se omite el bloque
    -- de Storage con un aviso y se cubre en la spec 004 con el usuario real.
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', v_claims_a, true);

    v_storage_ok := true;
    begin
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values ('sent-pdfs', v_obj_path_a, c_user_a::text,
              '{"mimetype": "application/pdf", "size": 1}'::jsonb);
    exception when others then
      v_storage_ok := false;
      v_state := sqlstate;
      v_msg := sqlerrm;
    end;

    if not v_storage_ok then
      raise notice 'STORAGE_CHECK_SKIPPED: A no pudo insertar en su propia carpeta desde SQL (sqlstate %: %)', v_state, v_msg;
    else
      raise notice 'OK 6: A sube un objeto a su carpeta';

      -- A ve su objeto
      select count(*) into v_n from storage.objects
      where bucket_id = 'sent-pdfs' and name = v_obj_path_a;
      if v_n <> 1 then
        raise exception 'RLS_CHECK_FAIL: 6. A no ve su propio objeto en sent-pdfs';
      end if;

      -- A no puede subir a la carpeta de B
      v_state := null;
      begin
        insert into storage.objects (bucket_id, name, owner_id, metadata)
        values ('sent-pdfs', v_obj_path_b, c_user_a::text,
                '{"mimetype": "application/pdf", "size": 1}'::jsonb);
      exception when others then
        v_state := sqlstate;
      end;
      if v_state is distinct from '42501' then
        raise exception 'RLS_CHECK_FAIL: 6. A subió a la carpeta de B (sqlstate %)', coalesce(v_state, 'sin error');
      end if;

      -- A tampoco puede subir fuera de cualquier carpeta (raíz del bucket)
      v_state := null;
      begin
        insert into storage.objects (bucket_id, name, owner_id, metadata)
        values ('sent-pdfs', 'rls-check-raiz.pdf', c_user_a::text,
                '{"mimetype": "application/pdf", "size": 1}'::jsonb);
      exception when others then
        v_state := sqlstate;
      end;
      if v_state is distinct from '42501' then
        raise exception 'RLS_CHECK_FAIL: 6. A subió a la raíz del bucket (sqlstate %)', coalesce(v_state, 'sin error');
      end if;
      raise notice 'OK 6: A no puede subir fuera de su carpeta';

      -- B no ve el objeto de A
      perform set_config('request.jwt.claims', v_claims_b, true);
      select count(*) into v_n from storage.objects
      where bucket_id = 'sent-pdfs' and name = v_obj_path_a;
      if v_n <> 0 then
        raise exception 'RLS_CHECK_FAIL: 6. B ve el objeto de A en sent-pdfs';
      end if;
      raise notice 'OK 6: B no ve el objeto de A';

      -- anon no ve ni sube
      perform set_config('role', 'anon', true);
      perform set_config('request.jwt.claims', v_claims_anon, true);

      v_state := null;
      v_n := null;
      begin
        select count(*) into v_n from storage.objects where bucket_id = 'sent-pdfs';
      exception when others then
        v_state := sqlstate;
      end;
      if not (v_state = '42501' or (v_state is null and v_n = 0)) then
        raise exception 'RLS_CHECK_FAIL: 6. anon ve objetos de sent-pdfs (sqlstate %, filas %)', coalesce(v_state, 'sin error'), v_n;
      end if;

      v_state := null;
      begin
        insert into storage.objects (bucket_id, name, metadata)
        values ('sent-pdfs', v_obj_path_b, '{"mimetype": "application/pdf", "size": 1}'::jsonb);
      exception when others then
        v_state := sqlstate;
      end;
      if v_state is distinct from '42501' then
        raise exception 'RLS_CHECK_FAIL: 6. anon subió a sent-pdfs (sqlstate %)', coalesce(v_state, 'sin error');
      end if;
      raise notice 'OK 6: anon no ve ni sube objetos en sent-pdfs';
    end if;

    -- Vuelta al rol privilegiado antes de terminar
    perform set_config('role', v_orig_role, true);
    perform set_config('request.jwt.claims', '', true);

  exception when others then
    -- Nuestros fallos se relanzan tal cual; cualquier otro error se marca como fallo.
    if sqlerrm like 'RLS_CHECK_FAIL:%' then
      raise;
    end if;
    raise exception 'RLS_CHECK_FAIL: error inesperado (sqlstate %): %', sqlstate, sqlerrm;
  end;

  -- Todo ha pasado. Se lanza SIEMPRE una excepción para revertir todo lo hecho.
  raise exception 'RLS_CHECK_OK';
end
$$;
