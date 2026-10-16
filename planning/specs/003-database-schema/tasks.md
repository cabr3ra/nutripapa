# 003 — database-schema — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Escribir `supabase/migrations/<ts>_core_schema.sql`: `set_updated_at`, 5 tablas, índices, triggers, RLS y grants
- [ ] T002 [agent] [status:todo] Escribir `supabase/migrations/<ts>_sent_pdfs_storage.sql`: bucket privado `sent-pdfs` y sus políticas
- [ ] T003 [agent] [status:todo] Escribir `supabase/tests/rls_check.sql`: aislamiento A/B, anon, carpetas del bucket y dos tablas el mismo lunes, con rollback forzado
- [ ] T004 [agent] [status:todo] Aplicar las migraciones con `supabase db push` y comprobar `supabase migration list`
- [ ] T005 [agent] [status:todo] Ejecutar `rls_check.sql` con `supabase db query --linked` y obtener `RLS_CHECK_OK`
- [ ] T006 [agent] [status:todo] Ejecutar `supabase db advisors --linked --type security` sin avisos de RLS
- [ ] T007 [agent] [status:todo] Generar `src/lib/database.types.ts` con `supabase gen types typescript --linked`
- [ ] T008 [agent] [status:todo] Añadir `@supabase/supabase-js` y escribir `scripts/check-anon-access.mjs`
- [ ] T009 [human] [status:todo] Rellenar `.env.local` con `VITE_SUPABASE_URL` y la clave publicable
- [ ] T010 [agent] [status:todo] Ejecutar `scripts/check-anon-access.mjs` y comprobar que todo acceso anónimo es denegado
- [ ] T011 [agent] [status:todo] Verificar vía MCP (solo lectura) que las 5 tablas existen con RLS activado
- [ ] T012 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
