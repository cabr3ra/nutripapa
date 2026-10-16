# 006 — weekly-table — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Escribir `src/features/weekly-sheets/week.ts` + tests (lunes, nº de semana, rango en español, cambio de hora)
      └─ week.ts (fechas YYYY-MM-DD, aritmética UTC, sin librería; +daysBetween, mondayOfWeekNumber) + week.test.ts 19/19 con TZ Europe/Madrid.
- [x] T002 [agent] [status:done] Escribir la migración `supabase/migrations/<ts>_duplicate_weekly_sheet.sql` (security invoker, solo `authenticated`)
      └─ supabase/migrations/20261016200000_duplicate_weekly_sheet.sql: plpgsql security invoker, search_path vacío; 22023 si no es lunes, P0002 si no existe/ajena; copia menú + meal_entries; execute solo authenticated.
- [x] T003 [agent] [status:done] Escribir `supabase/tests/duplicate_check.sql`: copia comidas, no `daily_logs`, otro usuario no puede, rollback forzado
      └─ supabase/tests/duplicate_check.sql: un DO, siempre raise final (OK/FAIL); checks 0–7 con usuarios ficticios …d1/…d2.
- [x] T004 [agent] [status:done] Aplicar con `supabase db push`, ejecutar `duplicate_check.sql`, advisors y regenerar `src/lib/database.types.ts`
      └─ db push 20261016200000 (local = remoto); duplicate_check → DUPLICATE_CHECK_OK; después users/sheets/entries = 0; advisors sin avisos; tipos regenerados con duplicate_weekly_sheet.
- [x] T005 [agent] [status:done] Escribir `src/features/weekly-sheets/api.ts` + tests con cliente simulado
      └─ api.ts (getOrCreateCurrentSheet con promesa compartida, getSheet, listSheets, updateMenuNumber, createSheet, duplicateSheet/rpc, softDelete con bloqueo de la única, restore, groupSheetsByWeek) + api.test.ts; 65/65 en total.
- [x] T006 [agent] [status:done] Escribir `WeeklySheetScreen` (cabecera + menú editable) y rutas `/`, `/tabla/:sheetId`; quitar `HomeScreen`
      └─ WeeklySheetScreen (/ y /tabla/:sheetId, cabecera, menú editable con validación en línea) + rutas en App.tsx (/historial incluida); HomeScreen eliminada.
- [x] T007 [agent] [status:done] Escribir `WeekGrid` (PC 7 columnas) + `DayStrip` (móvil un día) con filas de seguimiento de solo lectura
      └─ WeekGrid (table real, 5 momentos + Agua/WC/Pasos, CSS-only responsive 48rem) + DayStrip (aria-pressed, ≥48px; en ≤400px usa medio margen) + gridFormat.ts; 13 tests.
- [x] T008 [agent] [status:done] Escribir `HistoryScreen` + `WeekPicker`: abrir, nueva, duplicar, eliminar con confirmación en línea y deshacer, bloqueo de la única tabla
      └─ HistoryScreen (grupos por semana, Abrir/Duplicar/Eliminar, Nueva tabla, confirmación en línea, barra Deshacer, única tabla deshabilitada) + WeekPicker; 12 tests.
- [x] T009 [agent] [status:done] Tests de componentes (cabecera semana 1, tira de días, historial: duplicar, eliminar, deshacer, única tabla)
      └─ Cubierto por los tests de T006–T008: semana 1 (WeeklySheetScreen.test), tira (DayStrip.test), duplicar/eliminar/deshacer/única (HistoryScreen.test).
- [x] T010 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, tsc OK, test 96/96 (12 archivos), build OK, format:check OK.
- [ ] T011 [human] [status:todo] Crear el usuario (004 T001) y entrar en la app en Chrome (`pnpm dev`) para que el agente use esa sesión
- [x] T012 [agent] [status:done] En el navegador con esa sesión: semana actual, 360 px y 1280 px sin scroll horizontal; menú editado en semana anterior persiste; duplicar; eliminar y deshacer
      └─ Chrome con la sesión del usuario: PC 7 columnas y móvil 360px (iframe) 1 día + tira, sin scroll X; menú 2 persistió tras recargar (restaurado a 1); duplicar → Semana 1; eliminar en línea + Deshacer; 0 diálogos.
- [ ] T013 [human] [status:todo] Revisar el aspecto y probarlo en el móvil del padre
