# 010 — offline-sync — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Escribir la migración `sync_support` (server_updated_at, triggers de última escritura)
- [ ] T002 [agent] [status:todo] Escribir `supabase/tests/sync_check.sql` (escritura vieja ignorada, cursor sube, rollback forzado)
- [ ] T003 [agent] [status:todo] Aplicar con `supabase db push`, ejecutar la comprobación, advisors y regenerar tipos
- [ ] T004 [agent] [status:todo] Escribir `src/lib/db.ts` (Dexie) + outbox + tests con `fake-indexeddb`
- [ ] T005 [agent] [status:todo] Escribir `push` (upsert, backoff con jitter, 23505 en comidas) + tests
- [ ] T006 [agent] [status:todo] Escribir `pull` (cursores, aplicar con última escritura) + tests
- [ ] T007 [agent] [status:todo] Escribir el motor de sync (online, primer plano, 30 s, arranque) + `storage.persist()`
- [ ] T008 [agent] [status:todo] Escribir `SyncStatus` en la cabecera + tests
- [ ] T009 [agent] [status:todo] Pasar `weekly-sheets/api.ts` a Dexie (incl. duplicar en cliente) y sus pantallas a `useLiveQuery`
- [ ] T010 [agent] [status:todo] Pasar `meals/api.ts` a Dexie (guardar en cliente) y su panel
- [ ] T011 [agent] [status:todo] Pasar `daily-tracking/api.ts` a Dexie y su panel
- [ ] T012 [agent] [status:todo] Cerrar sesión: enviar pendientes y vaciar la base local
- [ ] T013 [agent] [status:todo] Tests de criterios (sin red → pendiente; vuelve la red → enviado < 1 min; conflicto → gana el más reciente; error 5xx → reintento)
- [ ] T014 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] T015 [agent] [status:todo] En el navegador con la sesión: descarga de datos existentes, editar → "Todo guardado", recarga servida por el service worker
- [ ] T016 [human] [status:todo] Modo avión en el móvil y cambio en el PC visto en el móvil
