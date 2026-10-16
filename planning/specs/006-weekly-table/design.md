# 006 — weekly-table — Design

## Approach

- **Fechas** (`src/features/weekly-sheets/week.ts`, funciones puras): fechas como texto `YYYY-MM-DD` en hora local, aritmética solo de días (sin horas), así el cambio de hora del 25-oct-2026 no desplaza nada. `mondayOf(fecha)`, `weekNumber(lunes)` = días desde 2026-10-19 / 7 + 1, `weekRangeLabel` en español con `Intl` ("del 19 al 25 de octubre de 2026"). Sin librería de fechas. Las semanas anteriores al 19-oct (nº ≤ 0) se muestran solo con el rango, sin número.
- **Acceso a datos** (`src/features/weekly-sheets/api.ts`): funciones async sobre el cliente único (`supabase-js`), siempre filtrando `deleted_at is null`. Sin librería de caché/fetching: 010 decidirá la capa offline y sustituirá este módulo por dentro sin tocar las pantallas.
  - `getOrCreateCurrentSheet()`: la tabla más reciente (por `created_at`) del lunes actual; si no hay, inserta una vacía. Protegida contra doble ejecución (StrictMode) con una promesa en curso compartida.
  - `getSheet(id)`: la tabla + `meal_entries` (con el nombre de `foods`, por `position`) + `daily_logs`.
  - `listSheets()`, `updateMenuNumber()`, `createSheet(lunes)`, `duplicateSheet(id, lunes)`, `softDeleteSheet(id)`, `restoreSheet(id)`.
- **Duplicar de forma atómica**: función Postgres `public.duplicate_weekly_sheet(source_id uuid, target_start date) returns uuid`, `security invoker`, `set search_path = ''`, `execute` solo para `authenticated`. Crea la tabla nueva (mismo nº de menú) y copia sus `meal_entries` en una transacción; no copia `daily_logs`. La RLS de 003 sigue aplicando: no se puede duplicar una tabla ajena. Nueva migración.
- **Rutas** (dentro de `RequireAuth`): `/` → tabla de la semana actual (sustituye a la `HomeScreen` provisional); `/tabla/:sheetId` → una tabla concreta; `/historial`; `/ajustes` (004).
- **Pantalla de tabla** (`WeeklySheetScreen`): cabecera con "CONTROL SEMANAL de COMIDAS", "Semana N", rango y "Menú nº" editable en línea (campo numérico pequeño, se guarda al salir del campo; vacío = sin número). Enlaces "Historial" y "Ajustes".
- **Cuadrícula** (`WeekGrid`): 5 filas de momentos + 3 filas de seguimiento (agua, WC = pis/caca, pasos) solo lectura. Cada celda lista sus comidas ("Tostada · 2 unidades"); vacía si no hay. Celdas de al menos 48 px de alto.
  - **≥ 48rem (PC/tablet)**: 7 columnas L–D con el día y la fecha; columna de etiquetas a la izquierda.
  - **< 48rem (móvil)**: tira de días `L M X J V S D` (botones de 48×48, el activo resaltado con salvia + borde, nunca solo color) y una sola columna con el día elegido; por defecto, hoy si cae en esa semana, si no el lunes.
  - Ancho al 100 % con `max-width`; nunca scroll horizontal de página.
- **Historial** (`/historial`): tablas agrupadas por semana, de la más reciente a la más antigua: "Semana N · 19–25 oct · Menú 2". Por tabla: **Abrir**, **Duplicar**, **Eliminar**. Arriba, **Nueva tabla**.
  - Duplicar y Nueva tabla abren un panel integrado bajo el elemento (sin modal) con selector de semana `‹ Semana N ›` (por defecto la siguiente / la actual) y botón de confirmar.
  - Eliminar: confirmación en línea en la propia fila ("¿Eliminar esta tabla? · Sí, eliminar · No"); tras eliminar, una barra integrada en la página "Tabla eliminada · Deshacer" que se queda hasta que se cierre o se cambie de pantalla. Si es la única tabla de su semana, el botón está desactivado con el texto "Es la única tabla de esta semana".
- Estilo: tokens, Nunito, tuteo; ningún popup ni `confirm()`.

## Deliverables

- `src/features/weekly-sheets/`: `week.ts`, `api.ts`, `WeeklySheetScreen.tsx`, `WeekGrid.tsx`, `DayStrip.tsx`, `HistoryScreen.tsx`, `WeekPicker.tsx` (+ css y tests).
- `supabase/migrations/<ts>_duplicate_weekly_sheet.sql` y `supabase/tests/duplicate_check.sql` (rollback forzado, como `rls_check.sql`).
- `src/lib/database.types.ts` regenerado (incluye la función).
- `App.tsx` con las rutas nuevas; `HomeScreen` provisional eliminada.
- Tests Vitest de `week.ts` (semana 1 del 19 al 25-oct, lunes en el cambio de hora, rango en español), de `api.ts` (cliente simulado) y de las pantallas.

## Sequencing

1. `week.ts` y la migración + su comprobación (independientes).
2. `db push` → comprobación SQL → tipos.
3. `api.ts` → pantallas → tests.
4. Revisión en el navegador: necesita que el usuario haya entrado en la app en su Chrome (el agente no conoce el código y comparte la sesión de esa pestaña).

## Open questions / deferred

- Dos dispositivos abriendo una semana nueva a la vez pueden crear dos tablas vacías en esa semana. Está permitido (varias por semana) y una se puede eliminar desde el historial; la fusión real es de 010.
- El selector de tabla cuando una semana tiene varias: `/` muestra la más reciente; las demás se abren desde el historial.
