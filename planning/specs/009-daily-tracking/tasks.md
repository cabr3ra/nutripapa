# 009 — daily-tracking — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Escribir `src/features/daily-tracking/parse.ts` + tests (coma decimal, "1,5 L", "8.500", avisos)
      └─ parse.ts (WATER_STEP/MAX/WARN, parseSteps "8.500"→8500, formatStepsInput, validateWater, warningsFor) + 15 tests; api.ts reutiliza WATER_MAX.
- [x] T002 [agent] [status:done] Escribir `src/features/daily-tracking/api.ts` (upsert por `sheet_id, day_of_week`) + tests
      └─ daily-tracking/api.ts: saveDailyLog (upsert onConflict sheet_id,day_of_week, deleted_at null, validación en cliente) + 18 tests.
- [x] T003 [agent] [status:done] Escribir `TrackingPanel`: agua, pis, caca, pasos, vaciar, avisos y guardado automático
      └─ TrackingPanel (Stepper agua 0,25 L/pis/caca, pasos inputMode numeric, Vaciar, avisos, guardado tras 600 ms en cola, Listo guarda antes de cerrar) + 17 tests.
- [x] T004 [agent] [status:done] Celdas de seguimiento interactivas en `WeekGrid` + recarga
      └─ WeekGrid: onTrackingActivate (botones de celda con aria-label "Apuntar/Editar …"); SheetEditor monta TrackingPanel con key tabla-día, refresh sin remontar, copia local savedLogs (más reciente por updated_at).
- [x] T005 [agent] [status:done] Tests de los criterios de aceptación (+6 → 1,5 L; 5/1; 8500 → 8.500; vacío; dos tablas independientes)
      └─ Cubierto: TrackingPanel.test l.101 (+6 → 1,5), 132 (5/1), 148 (8500 → 8.500), 91/181 (vacío ≠ 0); independencia por sheet_id: api.test l.110 (onConflict) + único en BD; se comprueba en T007.
- [x] T006 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, tsc OK, test 268/268 (22 archivos), build OK, format:check OK; sin hex/rgb/color-mix.
- [x] T007 [agent] [status:done] En el navegador con la sesión: criterios en PC y a 360 px; al acabar, vaciar lo escrito
      └─ Chrome (sesión del usuario): +6 → 1,5 L; Pis 5 · Caca 1; 8500 → 8.500 (inputmode numeric); vacío ≠ 0; 2 tablas de la misma semana independientes (BD); 360px sin scroll X; 0 diálogos. Limpieza: datos vaciados, tabla extra eliminada (lógico).
- [ ] T008 [human] [status:todo] Probarlo con el padre
