# 006 — weekly-table — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Escribir `src/features/weekly-sheets/week.ts` + tests (lunes, nº de semana, rango en español, cambio de hora)
- [ ] T002 [agent] [status:todo] Escribir la migración `supabase/migrations/<ts>_duplicate_weekly_sheet.sql` (security invoker, solo `authenticated`)
- [ ] T003 [agent] [status:todo] Escribir `supabase/tests/duplicate_check.sql`: copia comidas, no `daily_logs`, otro usuario no puede, rollback forzado
- [ ] T004 [agent] [status:todo] Aplicar con `supabase db push`, ejecutar `duplicate_check.sql`, advisors y regenerar `src/lib/database.types.ts`
- [ ] T005 [agent] [status:todo] Escribir `src/features/weekly-sheets/api.ts` + tests con cliente simulado
- [ ] T006 [agent] [status:todo] Escribir `WeeklySheetScreen` (cabecera + menú editable) y rutas `/`, `/tabla/:sheetId`; quitar `HomeScreen`
- [ ] T007 [agent] [status:todo] Escribir `WeekGrid` (PC 7 columnas) + `DayStrip` (móvil un día) con filas de seguimiento de solo lectura
- [ ] T008 [agent] [status:todo] Escribir `HistoryScreen` + `WeekPicker`: abrir, nueva, duplicar, eliminar con confirmación en línea y deshacer, bloqueo de la única tabla
- [ ] T009 [agent] [status:todo] Tests de componentes (cabecera semana 1, tira de días, historial: duplicar, eliminar, deshacer, única tabla)
- [ ] T010 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] T011 [human] [status:todo] Crear el usuario (004 T001) y entrar en la app en Chrome (`pnpm dev`) para que el agente use esa sesión
- [ ] T012 [agent] [status:todo] En el navegador con esa sesión: semana actual, 360 px y 1280 px sin scroll horizontal; menú editado en semana anterior persiste; duplicar; eliminar y deshacer
- [ ] T013 [human] [status:todo] Revisar el aspecto y probarlo en el móvil del padre
