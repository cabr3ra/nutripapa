# 006 — weekly-table — Requirements

## What's being built

El dashboard principal: la tabla semanal de control. Cabecera con "CONTROL SEMANAL de
COMIDAS", número de semana (semana 1 = 19-oct-2026), rango lunes–domingo y número de menú
opcional. Cuadrícula de 7 días (L–D) × 5 momentos (desayuno, media mañana, comida, media
tarde, cena), más las filas de agua, WC y ejercicio (su edición llega en 009). Incluye el
historial de tablas y las acciones crear, duplicar y eliminar tabla.

## Who/what it serves

- El padre: abre la app y ve directamente la tabla de la semana actual; puede volver a cualquier semana anterior para corregirla.
- 007 (añadir comida desde una celda), 008 (arrastrar entre celdas), 009 (filas de seguimiento), 011 (PDF de una tabla).

## Hard constraints

- Al abrir la app se muestra la tabla de la semana actual; si esa semana no tiene ninguna, se crea una vacía automáticamente _(judgement, no standard: interpretación de "al menos una tabla por semana")_
- Puede haber varias tablas por semana (decisión de la entrevista). No se puede eliminar la única tabla de una semana _(judgement, no standard)_
- Historial: lista de todas las tablas, de la más reciente a la más antigua, agrupadas por semana; cualquiera se abre y se edita.
- Duplicar copia las comidas de una tabla en una nueva tabla, en la semana que se elija (por defecto la siguiente). No copia agua, WC ni pasos _(judgement, no standard: son registros del día, no del menú)_
- Eliminar es borrado lógico (`deleted_at`, 003) y se confirma en línea, sin ventana emergente (HARD), con opción de deshacer.
- Móvil: un día cada vez con una tira de días L M X J V S D para cambiar; PC/tablet: la cuadrícula completa de 7 columnas. La página nunca hace scroll horizontal _(standard: vista de un día con selector en móvil y cuadrícula completa en escritorio — práctica habitual, evidencia secundaria/anecdótica: https://forum.dhtmlx.com/t/week-view-for-mobile/23204, https://iconicwp.com/feature-requests/reservation-table-responsive-breakpoints/)_
- Zonas táctiles de al menos 48×48 dp (celdas, días, botones) _(standard: Material 48dp, por encima de WCAG 2.2 SC 2.5.8 AA de 24×24 CSS px — https://wcag.dock.codes/documentation/wcag258, https://github.com/cvs-health/android-view-accessibility-techniques/blob/main/doc/basics/MinimumTouchTargetSize.md; secundarias)_
- Estilo: paleta HARD, Nunito, espacioso, solo modo claro, textos en español con tuteo cercano.
- Datos leídos y escritos en Supabase con la sesión de 004 (sin conexión: 010).

## Acceptance criteria

- Al abrir la app con sesión, aparece la tabla de la semana actual con la cabecera correcta (por ejemplo, del 19 al 25 de octubre de 2026 aparece "Semana 1").
- En un móvil Android se ve un día cada vez y se cambia de día con la tira L–D; en el PC se ven los 7 días a la vez; en ninguno hay scroll horizontal de página.
- Desde el historial se abre una tabla de una semana anterior, se cambia su número de menú y el cambio persiste al recargar.
- Duplicar una tabla crea otra en la semana elegida con las mismas comidas y sin datos de agua, WC ni pasos.
- Eliminar una tabla la quita del historial y se puede deshacer; la única tabla de una semana no se puede eliminar.

## Out of scope

- Añadir o editar comidas en una celda (007) y arrastrarlas (008).
- Editar agua, WC y pasos (009): en 006 sus filas solo se muestran.
- Uso sin conexión (010) y exportar a PDF (011).

## Dependencies

004 (sesión). Usa las tablas `weekly_sheets`, `meal_entries` y `daily_logs` de 003.

## Owner split

- agent: todo el desarrollo y los tests.
- human: revisar el aspecto visual y probarlo en el móvil del padre.
