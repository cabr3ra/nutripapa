# 008 — drag-and-drop — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [x] T001 [agent] [status:done] Escribir `src/features/meals/position.ts` + tests (punto medio, renumerar)
      └─ position.ts (POSITION_STEP 1024, nextPosition, positionBetween, renumber, planMove con movingId, int4) + 21 tests; suite completa 288/288 tres veces seguidas.
- [x] T002 [agent] [status:done] Migración: `save_meal_entry` con paso 1024; `db push`, comprobación con `meal_check.sql` ajustado y tipos
      └─ 20261017140000_save_meal_entry_sparse_positions.sql (solo cambia la posición: máx + 1024); db push OK; meal_check ajustado (+check 10) → MEAL_CHECK_OK; recuentos iguales; tipos sin cambios.
- [x] T003 [agent] [status:done] Añadir `moveEntry` / `undoMove` en `meals/api.ts` + tests
      └─ meals/api.ts: moveEntry (planMove; 1 update o renumera la celda y luego mueve; sin cambios → sin llamadas; solo day/slot/position) + undoMove; tests de meals/api 40/40.
- [x] T004 [agent] [status:done] "Mover a…" en `MealPanel` + barra "Comida movida · Deshacer"
      └─ MealPanel "Mover a…" (selector en línea L–D + momento, "Ya está aquí"), SheetEditor onMove → moveEntry + "Comida movida · Deshacer", WeekGrid selectDayRequest; 314 tests. Test intermitente de 007 corregido (0 fallos en 8 vueltas).
- [x] T005 [agent] [status:done] Instalar `@dnd-kit` y crear el contexto con sensores (puntero, táctil 250 ms/5 px, teclado) y anuncios en español
      └─ @dnd-kit/core 6.3.1, sortable 10.0.0, utilities 3.2.2; meals/dnd: ids, resolveDrop, sensors (MousePointerSensor ignora táctil), announcements, collision, MealDndProvider; 37 tests.
- [x] T006 [agent] [status:done] Celdas ordenables en `WeekGrid` (mover entre celdas y reordenar) con zonas visibles
      └─ SheetEditor con MealDndProvider + performMove común; WeekGrid draggable (droppable por celda, SortableContext, useSortable en el botón "Editar…" sin attributes: teclado abre panel); zonas con borde discontinuo; 357 tests ×2.
- [x] T007 [agent] [status:done] Zonas de destino en la tira L–D (móvil)
      └─ DayStrip droppable (strip-day:1..7, borde discontinuo al pasar por encima; solo móvil); WeekGrid pasa droppable; test: soltar en jueves → moveEntry y la tira cambia a jueves.
- [x] T008 [agent] [status:done] Tests de `onDragEnd` y de los criterios (mover, reordenar, "Mover a…", deshacer)
      └─ Cubierto: resolveDrop.test (celda, antes de otra, reordenar, tira, sobre sí misma), meals/api.test (moveEntry/undoMove), MealPanel.test (Mover a…), WeeklySheetScreen.test (arrastrar → Comida movida → Deshacer; tira).
- [x] T009 [agent] [status:done] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde
      └─ lint OK, tsc OK, test 362/362 en 6 vueltas completas seguidas, build OK, format OK; sin hex/rgb/color-mix.
- [x] T010 [agent] [status:done] En el navegador: arrastrar en PC, reordenar, "Mover a…", deshacer y persistencia al recargar
      └─ Chrome (sesión del usuario, eventos de puntero reales sobre @dnd-kit): mover martes·desayuno → miércoles·comida persiste; "Mover a…" con toques; reordenar persiste; Deshacer restaura; 360px: soltar en la tira → viernes; 0 diálogos. Limpieza: 2 entradas quitadas.
- [ ] T011 [human] [status:todo] Probar la pulsación larga y el scroll en el móvil del padre
