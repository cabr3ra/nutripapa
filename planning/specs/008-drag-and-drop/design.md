# 008 — drag-and-drop — Design

## Approach

- **Librería**: `@dnd-kit/core` + `@dnd-kit/sortable` (versiones estables al instalar). Sensores: puntero (ratón, activa tras 5 px), táctil (`delay: 250`, `tolerance: 5`) y teclado (`sortableKeyboardCoordinates`). Elementos arrastrables con `touch-action: manipulation`. Anuncios para lector de pantalla en español (`announcements` / `screenReaderInstructions`).
- **Zonas de destino**: cada celda de comida es un contenedor ordenable; en móvil, además, cada botón de la tira L–D es una zona de destino (soltar → mismo momento de ese día, al final, y la tira cambia al día destino). Durante el arrastre las zonas se marcan con borde discontinuo carbón y fondo `--color-surface` (solo paleta).
- **Persistencia de un movimiento = una sola fila**: `position` pasa a ser dispersa. Las entradas nuevas usan `máx + 1024`; mover a un hueco calcula el punto medio entre las vecinas. Solo si no queda hueco (vecinas consecutivas) se renumera esa celda (0, 1024, 2048…). Así un movimiento normal actualiza una única fila (`day_of_week`, `meal_slot`, `position`), lo que encaja con la sincronización de 010 (última escritura por fila). Cantidad, unidad y comida no cambian.
- **Cambio en 007**: `save_meal_entry` pasa a usar `máx + 1024` para entradas nuevas (migración que reemplaza la función, no toca datos).
- **"Mover a…"** (alternativa sin arrastre, WCAG 2.5.7): en el panel de comida de 007, botón "Mover a…" → selector en línea con los 7 días (botones L–D) y el momento (select) → mueve al final de esa celda.
- **Deshacer**: tras mover, barra integrada "Comida movida · Deshacer" (reutiliza `UndoBar`); deshacer restaura día, momento y posición anteriores. Solo el último movimiento.
- La lógica de soltar (`onDragEnd` → destino, nueva posición) vive en funciones puras para poder probarla sin simular el arrastre.

## Deliverables

- `src/features/meals/position.ts` (posiciones dispersas, punto medio, renumerar) + tests.
- `meals/api.ts`: `moveEntry(entry, { day, slot, beforeId? })` y `undoMove`.
- `src/features/meals/dnd/` (contexto, sensores, anuncios, `onDragEnd` puro) integrado en `WeekGrid` y `DayStrip`.
- "Mover a…" en `MealPanel`.
- Migración: `save_meal_entry` con paso 1024; tipos regenerados.

## Sequencing

1. `position.ts` y la migración (independientes).
2. `moveEntry`/`undoMove` → "Mover a…" (funciona sin arrastre) → arrastre en PC → zonas de la tira en móvil → navegador.

## Open questions / deferred

- El arrastre real con pulsación larga en Android no se puede simular desde el navegador del PC: lo prueba el humano.
