# 010 — offline-sync — Design

## Approach

- **Base local** (`src/lib/db.ts`): Dexie con las tablas `weekly_sheets`, `foods`, `meal_entries`, `daily_logs` (misma forma que en Supabase) + `outbox` + `meta` (cursores de descarga). La UI lee de Dexie con `useLiveQuery` (`dexie-react-hooks`), así cualquier cambio local o descargado se ve al momento; se acaba el "recargar tras guardar".
- **Escribir = local primero**: cada `api.ts` (weekly-sheets, meals, daily-tracking) mantiene su API pero por dentro escribe en Dexie con id generado en el cliente (`crypto.randomUUID()`), `updated_at` = ahora del dispositivo, y añade la fila completa a `outbox` en la misma transacción.
- **Las RPC no sirven sin conexión**: la lógica de `duplicate_weekly_sheet` y `save_meal_entry` (buscar o crear la comida, posición) pasa al cliente sobre Dexie; las funciones siguen en la BD pero la app deja de usarlas.
- **Enviar** (`src/lib/sync/`): se vacía `outbox` en orden con `upsert` por `id` al recuperar conexión (`online`), al volver la app a primer plano (`visibilitychange`), al arrancar y cada 30 s; reintentos con espera exponencial + jitter (máx. 5 min). Error 4xx no recuperable → la fila se queda en la cola marcada con error (indicador "error"); 5xx/red → reintento.
- **Última escritura gana, en el servidor**: nueva migración:
  - columna `server_updated_at timestamptz` en las 4 tablas, siempre puesta por trigger a `now()` en insert/update (cursor de descarga fiable aunque los relojes difieran);
  - `set_updated_at` ya no pisa el `updated_at` que manda el cliente; y un trigger `before update` descarta (deja la fila como está) cualquier actualización con `updated_at` más antiguo que el guardado. Así gana la edición más reciente sin perder filas.
  - Es una migración no destructiva (añade columnas con default y reemplaza funciones/triggers; no borra datos).
- **Comidas duplicadas entre dispositivos**: si dos dispositivos crean sin conexión la misma comida, el segundo envío choca con el índice único (23505); el cliente adopta la comida remota (descarga por nombre), reapunta sus entradas locales a ese id y reintenta.
- **Descargar**: al arrancar, al volver a primer plano y tras cada envío, pide por tabla las filas con `server_updated_at` > cursor y las aplica en Dexie (si la local tiene cambios pendientes en la cola, gana la de `updated_at` mayor).
- **Primera carga**: con la base local vacía, descarga todo (pocas filas: un usuario).
- **Persistencia**: `navigator.storage.persist()` al iniciar sesión.
- **Indicador** (`SyncStatus`, en la cabecera de la tabla, discreto, `role="status"`): "Todo guardado" · "Pendiente de enviar (n)" · "Sin conexión, lo guardo y lo envío luego" · "No se ha podido enviar · Reintentar".
- **Cerrar sesión** (004): vacía la base local tras enviar lo pendiente (si hay pendientes sin conexión, avisa en línea y no cierra).
- Shell sin conexión: ya lo da el service worker de 001 (`navigateFallback` a `index.html`).

## Deliverables

- Dependencias `dexie`, `dexie-react-hooks`; en desarrollo `fake-indexeddb` para tests.
- `src/lib/db.ts`, `src/lib/sync/{outbox,push,pull,engine,backoff}.ts` + tests.
- `SyncStatus.tsx` en la cabecera.
- `weekly-sheets/api.ts`, `meals/api.ts`, `daily-tracking/api.ts` reescritos sobre Dexie + outbox con la misma API; pantallas pasadas a `useLiveQuery`.
- Migración `sync_support` (+ `supabase/tests/sync_check.sql` con rollback) y tipos regenerados.

## Sequencing

1. Migración + comprobación SQL (el servidor debe ignorar escrituras viejas antes de que el cliente empiece a enviar).
2. `db.ts` → outbox/push/pull/engine → indicador.
3. Pasar cada `api.ts` y sus pantallas, de uno en uno (weekly-sheets → meals → daily-tracking), con sus tests.
4. Navegador (el modo sin conexión de DevTools no está al alcance del agente: se prueba forzando la cola) y prueba humana con modo avión y dos dispositivos.

## Open questions / deferred

- Desfase de reloj entre dispositivos: aceptado (un solo usuario), como dicen los requisitos.
- 012 y 014 añadirán sus tablas/columnas a esta capa.
