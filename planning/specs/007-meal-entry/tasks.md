# 007 — meal-entry — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Escribir `src/features/meals/normalize.ts` + tests (tildes, mayúsculas, orden de resultados)
      └─ normalize.ts (normalizeName NFD sin diacríticos, ñ→n documentado; prepareCatalog, searchFoods con puntuación empieza>palabra>contiene, findExactMatch) + 17 tests.
- [x] T002 [agent] [status:done] Escribir la migración `save_meal_entry` (security invoker, solo `authenticated`)
      └─ supabase/migrations/20261017090000_save_meal_entry.sql: valida (22023), sheet/comida/entrada visibles (P0002), busca o crea comida (unique_violation → reutiliza), defaults = última usada, position al final, for update al editar.
- [x] T003 [agent] [status:done] Escribir `supabase/tests/meal_check.sql`: crea/reutiliza comida, position, editar, ajena rechazada, anon sin permiso; rollback forzado
      └─ supabase/tests/meal_check.sql: un DO (l. 21–507), siempre raise final; checks 0–9 con usuarios …e1/…e2; conteos filtrados por sus propias filas (prod ya tiene datos).
- [x] T004 [agent] [status:done] Aplicar con `supabase db push`, ejecutar `meal_check.sql`, advisors y regenerar tipos
      └─ db push 20261017090000 (local = remoto); meal_check → MEAL_CHECK_OK; recuentos iguales antes/después; advisors: solo aviso de Auth (leaked password), ninguno de RLS; tipos regenerados.
- [x] T005 [agent] [status:done] Escribir `src/components/Stepper` + `UnitPicker` + tests
      └─ src/components: Stepper (−/+ 48px, coma decimal, minExclusive, null = vacío, prop error), UnitPicker (select + "Otra…"), units.ts (UNITS, stepForUnit); 31 tests.
- [x] T006 [agent] [status:done] Escribir `src/features/meals/api.ts` + tests
      └─ meals/api.ts: listFoods, getFoodUsage + topFoodsForSlot, resolveFoodForName, saveMealEntry (rpc), soft delete/restore, setFavorite, renameFood (23505 → aviso) + tests.
- [x] T007 [agent] [status:done] Escribir `FoodCombobox` (APG) + tests de teclado y sugerencias
      └─ FoodCombobox (APG list autocomplete, selección manual, grupos favoritas/más usadas, "Añadir «…»", ↓↑ cíclicas, Enter solo con activa, Escape ×2) + 13 tests.
- [x] T008 [agent] [status:done] Escribir `MealPanel`: elegir/crear, cantidad, unidad, favorita, corregir nombre, guardar, quitar y deshacer
      └─ MealPanel (carga catálogo+uso, combobox, Stepper/UnitPicker, favorita, corregir nombre con choque sin tildes, validación, guardar, quitar) + UndoBar exportado; 19 tests.
- [x] T009 [agent] [status:done] Celdas interactivas en `WeekGrid` + fila de panel + recarga en `WeeklySheetScreen`
      └─ WeekGrid: botones + y editar, fila de panel genérica (colSpan 8) tras la fila activa, onDayChange; WeeklySheetScreen: SheetEditor, recarga en segundo plano, UndoBar "Comida quitada". Tinte color-mix sustituido por --color-surface.
- [x] T010 [agent] [status:done] Tests de los criterios de aceptación (tostadas → 2 → 3, platano → Plátano, favorita, quitar/deshacer, sin diálogos)
      └─ Cubierto por tests existentes: MealPanel (tostadas nueva, existente 2→3, platano→Plátano, quitar), FoodCombobox (favoritas antes de escribir), WeeklySheetScreen (Comida quitada + Deshacer); espías alert/confirm.
- [x] T011 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, tsc OK, test 211/211 (19 archivos), build OK, format:check OK; sin hex/rgb/color-mix en CSS.
- [x] T012 [agent] [status:done] En el navegador con la sesión ya abierta: criterios de aceptación de punta a punta en PC y a 360 px
      └─ Chrome (sesión del usuario): los 5 criterios OK en PC (persisten tras recargar); 360px (iframe) panel sin scroll X; 0 diálogos. Limpieza: 3 entradas quitadas (lógico), favorita desmarcada; 2 comidas quedan en el catálogo (aprobado).
- [ ] T013 [human] [status:todo] Probar con el padre que añadir una comida repetida es rápido y claro
