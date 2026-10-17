# 007 — meal-entry — Design

## Approach

- **Búsqueda sin tildes ni mayúsculas** (`src/features/meals/normalize.ts`): `normalizeName()` = NFD + quitar diacríticos + minúsculas + espacios colapsados. El catálogo de un solo usuario es pequeño: se carga entero al abrir el panel y se precalcula el nombre normalizado en memoria (también servirá offline en 010). Orden de resultados: empieza por el texto > empieza una palabra por el texto > lo contiene; máximo 8.
- **Sin duplicados**: al guardar un nombre nuevo, si ya existe uno con el mismo nombre normalizado ("platano" ↔ "Plátano") se reutiliza ese; la BD ya impide el mismo nombre sin distinguir mayúsculas (003).
- **Guardar de forma atómica**: RPC `public.save_meal_entry(p_entry_id, p_sheet_id, p_day, p_slot, p_food_id, p_food_name, p_quantity, p_unit) returns uuid` (security invoker, `search_path = ''`, solo `authenticated`). Si no viene `p_food_id`, busca la comida por `lower(name)` o la crea; inserta la entrada al final de la celda (`position` = máx + 1) o actualiza la existente; guarda cantidad y unidad como las habituales de esa comida (la última usada). Nueva migración + `supabase/tests/meal_check.sql` (rollback forzado).
- **"Más usadas"**: `getFoodUsage()` lee `food_id, meal_slot` de las entradas no borradas y cuenta en el cliente por momento del día.
- **Celdas interactivas** (`WeekGrid`): cada celda de comida es un botón "Añadir comida · martes, desayuno"; cada comida apuntada es un botón para editarla. Al tocar, se abre el **panel integrado como una fila nueva justo debajo de esa fila de la tabla**, a todo el ancho (en móvil y en PC). Nunca modal. Un solo panel abierto. Sustituye al "en PC a un lado" de los requisitos (era _judgement_; aprobado por el usuario, 2026-10-16): con 7 columnas no queda sitio lateral sin estrechar la tabla.
- **Panel** (`MealPanel`):
  - `FoodCombobox` según el patrón APG "autocompletado de lista" (input `role=combobox`, `aria-expanded`, `aria-activedescendant`, flechas/Enter/Escape, sin selección automática). Vacío → grupos "Tus favoritas" y "Lo que más tomas en el desayuno". Escribiendo → coincidencias + "Añadir «…» como comida nueva" si no hay coincidencia exacta.
  - Elegir una comida rellena su cantidad y unidad habituales.
  - `Stepper` de cantidad: − / + de 48 px, paso 10 para g/ml y 1 para el resto; se puede escribir (admite decimales con coma); > 0.
  - `UnitPicker`: unidad, rebanada, taza, cucharada, vaso, g, ml, ración + "Otra…" (campo de texto).
  - Estrella "Favorita" (`aria-pressed`) y "Corregir nombre" en línea para la comida elegida del catálogo (choque de nombre → aviso en línea).
  - Botones "Guardar" / "Cancelar"; al editar, también "Quitar de aquí" → borrado lógico + barra integrada "Comida quitada · Deshacer".
- `Stepper` y `UnitPicker` van a `src/components/` (compartidos; 009 reutiliza `Stepper`).
- Tras guardar o quitar, la pantalla recarga la tabla (`getSheet`).

## Deliverables

- `src/features/meals/`: `normalize.ts`, `api.ts` (`listFoods`, `getFoodUsage`, `saveMealEntry`, `softDeleteEntry`, `restoreEntry`, `setFavorite`, `renameFood`), `FoodCombobox.tsx`, `MealPanel.tsx` (+ css y tests).
- `src/components/Stepper.tsx`, `UnitPicker.tsx` (+ css y tests).
- `WeekGrid` y `WeeklySheetScreen` con celdas interactivas y fila de panel.
- Migración `save_meal_entry` + `supabase/tests/meal_check.sql`; tipos regenerados.

## Sequencing

1. `normalize.ts`, migración + comprobación, `Stepper`/`UnitPicker` (independientes).
2. `db push` → comprobación → tipos → `api.ts`.
3. `FoodCombobox` → `MealPanel` → integración en la tabla → tests → navegador.

## Open questions / deferred

- La prueba en el navegador crea de verdad "tostadas con aceite" y "Plátano" en el catálogo del padre (aprobado por el usuario, 2026-10-16); las entradas se quitan al acabar (borrado lógico), las dos comidas se quedan en el catálogo (no hay borrado de catálogo: fuera de alcance).
- Comidas borradas del catálogo: fuera de alcance; si algún día se añaden, el RPC debe ignorar las borradas.
