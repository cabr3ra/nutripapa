# 009 — daily-tracking — Design

## Approach

- **Panel de seguimiento por día**: tocar cualquier celda de Agua, WC o Pasos de un día abre, con el mismo patrón de 007 (fila integrada bajo la fila tocada, a todo el ancho, nunca modal), el panel "Seguimiento del martes" con los tres datos juntos:
  - **Agua**: `Stepper` (de 007) en pasos de 0,25 L; se puede escribir con coma o punto (`inputmode="decimal"`); límite duro 99,99 L (columna `numeric(4,2)`), aviso suave por encima de 10 L.
  - **WC**: dos `Stepper` enteros ≥ 0, "Pis" y "Caca".
  - **Pasos**: campo `inputmode="numeric"`, entero ≥ 0, aviso suave por encima de 100.000; se muestra "8.500".
  - Cada dato tiene "Vaciar" para volver a "no apuntado" (`null`). Desde vacío, el primer + pone 0,25 L / 1; − nunca baja de 0.
- **Guardado automático**: cada cambio se guarda solo tras 600 ms sin tocar nada (y al cerrar el panel), con `upsert` en `daily_logs` por `(sheet_id, day_of_week)` (único en 003) y `deleted_at = null`. Indicador en línea: "Guardando…" / "Guardado" / error con "Reintentar". _(judgement: menos toques que un botón Guardar)_
- **Vacío ≠ 0**: los campos `null` se ven vacíos en la tabla (ya lo hace `gridFormat`); 0 se ve "0".
- Dos tablas de la misma semana: el registro va por `sheet_id`, así que son independientes sin hacer nada más.

## Deliverables

- `src/features/daily-tracking/`: `parse.ts` (leer "1,5"/"1.5", formatos, avisos), `api.ts` (`saveDailyLog`), `TrackingPanel.tsx` (+ css y tests).
- `WeekGrid`: celdas de seguimiento interactivas que abren la fila de panel; `WeeklySheetScreen` recarga al guardar.

## Sequencing

Después de 007 (reutiliza `Stepper` y el patrón de fila de panel de `WeekGrid`). Dentro de la spec: `parse.ts` y `api.ts` → panel → integración → tests → navegador.

## Open questions / deferred

- La prueba en el navegador escribe datos de verdad en un día de la tabla actual y luego los vacía (`null`); la fila de `daily_logs` se queda, vacía.
