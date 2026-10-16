# 003 — database-schema — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Escribir `supabase/migrations/<ts>_core_schema.sql`: `set_updated_at`, 5 tablas, índices, triggers, RLS y grants
      └─ supabase/migrations/20261016170000_core_schema.sql: set_updated_at, 5 tablas, 20 políticas, revoke anon+authenticated y grant CRUD; sent_pdfs.sheet_id on delete restrict.
- [x] T002 [agent] [status:done] Escribir `supabase/migrations/<ts>_sent_pdfs_storage.sql`: bucket privado `sent-pdfs` y sus políticas
      └─ supabase/migrations/20261016170100_sent_pdfs_storage.sql: bucket sent-pdfs privado (PDF, 10 MB) + políticas select/insert por carpeta uid; sin update/delete ni anon.
- [x] T003 [agent] [status:done] Escribir `supabase/tests/rls_check.sql`: aislamiento A/B, anon, carpetas del bucket y dos tablas el mismo lunes, con rollback forzado
      └─ supabase/tests/rls_check.sql: un DO que acaba siempre en raise (OK o FAIL); checks 0–6 (preflight, A, mismo lunes, B, anon, no-lunes, Storage con SKIPPED si SQL no puede insertar).
- [x] T004 [agent] [status:done] Aplicar las migraciones con `supabase db push` y comprobar `supabase migration list`
      └─ db push aplicó 20261016170000_core_schema y 20261016170100_sent_pdfs_storage; migration list: local = remoto en ambas.
- [x] T005 [agent] [status:done] Ejecutar `rls_check.sql` con `supabase db query --linked` y obtener `RLS_CHECK_OK`
      └─ Resultado RLS_CHECK_OK; variante con estado: storage_ok=t (checks de Storage ejecutados). auth.users = 0 tras la ejecución (rollback OK).
- [x] T006 [agent] [status:done] Ejecutar `supabase db advisors --linked --type security` sin avisos de RLS
      └─ advisors security: "No issues found" (results: []).
- [x] T007 [agent] [status:done] Generar `src/lib/database.types.ts` con `supabase gen types typescript --linked`
      └─ src/lib/database.types.ts (399 líneas, 5 tablas); añadido a .prettierignore por ser generado.
- [x] T008 [agent] [status:done] Añadir `@supabase/supabase-js` y escribir `scripts/check-anon-access.mjs`
      └─ @supabase/supabase-js ^2.118.0; scripts/check-anon-access.mjs + script `pnpm check:anon`; eslint cubre scripts/*.mjs (globals node). Sin ejecutar (falta .env.local, T009).
- [ ] T009 [human] [status:todo] Rellenar `.env.local` con `VITE_SUPABASE_URL` y la clave publicable
- [ ] T010 [agent] [status:todo] Ejecutar `scripts/check-anon-access.mjs` y comprobar que todo acceso anónimo es denegado
- [x] T011 [agent] [status:done] Verificar vía MCP (solo lectura) que las 5 tablas existen con RLS activado
      └─ MCP list_tables: 5 tablas con rls_enabled=true y 0 filas; pg_policies: 4 políticas en cada una.
- [x] T012 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, vitest 2/2, build OK (generateSW). Prettier OK en archivos rastreados.
