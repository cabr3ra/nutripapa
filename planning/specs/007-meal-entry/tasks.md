# 007 — meal-entry — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Escribir `src/features/meals/normalize.ts` + tests (tildes, mayúsculas, orden de resultados)
- [ ] T002 [agent] [status:todo] Escribir la migración `save_meal_entry` (security invoker, solo `authenticated`)
- [ ] T003 [agent] [status:todo] Escribir `supabase/tests/meal_check.sql`: crea/reutiliza comida, position, editar, ajena rechazada, anon sin permiso; rollback forzado
- [ ] T004 [agent] [status:todo] Aplicar con `supabase db push`, ejecutar `meal_check.sql`, advisors y regenerar tipos
- [ ] T005 [agent] [status:todo] Escribir `src/components/Stepper` + `UnitPicker` + tests
- [ ] T006 [agent] [status:todo] Escribir `src/features/meals/api.ts` + tests
- [ ] T007 [agent] [status:todo] Escribir `FoodCombobox` (APG) + tests de teclado y sugerencias
- [ ] T008 [agent] [status:todo] Escribir `MealPanel`: elegir/crear, cantidad, unidad, favorita, corregir nombre, guardar, quitar y deshacer
- [ ] T009 [agent] [status:todo] Celdas interactivas en `WeekGrid` + fila de panel + recarga en `WeeklySheetScreen`
- [ ] T010 [agent] [status:todo] Tests de los criterios de aceptación (tostadas → 2 → 3, platano → Plátano, favorita, quitar/deshacer, sin diálogos)
- [ ] T011 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
- [ ] T012 [agent] [status:todo] En el navegador con la sesión ya abierta: criterios de aceptación de punta a punta en PC y a 360 px
- [ ] T013 [human] [status:todo] Probar con el padre que añadir una comida repetida es rápido y claro
