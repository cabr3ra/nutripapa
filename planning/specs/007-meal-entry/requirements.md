# 007 — meal-entry — Requirements

## What's being built

Añadir y editar comidas en una celda (día + momento). Al tocar una celda se abre un panel
integrado en la página donde tu padre escribe la comida con sus palabras; si ya la apuntó
antes, la app se la sugiere y solo tiene que elegirla. Cada comida tiene nombre, cantidad
y unidad; la cantidad se ajusta con los botones + y −. Las comidas se guardan en un
catálogo propio, con favoritos.

## Who/what it serves

- El padre: apuntar lo que come en segundos, sin reescribir lo que ya repite.
- 008 (arrastrar las entradas creadas aquí), 011 (aparecen en el PDF), 015 (estadísticas de comidas).

## Hard constraints

- Panel integrado en la página, nunca una ventana emergente ni un modal (HARD); en móvil se despliega bajo la celda o desde abajo sin tapar la cabecera, en PC a un lado _(judgement, no standard)_
- Campo de nombre con sugerencias mientras escribe (combobox con lista, sin selección automática) _(standard: WAI-ARIA APG Combobox, autocompletado de lista con selección manual — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/)_
- La búsqueda ignora mayúsculas y tildes ("platano" encuentra "Plátano"), con nombres normalizados precalculados _(standard: normalización NFD / `Intl.Collator` con `sensitivity: 'base'` — https://lingo.dev/en/javascript-i18n/compare-strings-ignore-accents; secundaria)_
- Antes de escribir nada, el panel muestra los favoritos y las comidas más usadas en ese momento del día _(judgement, no standard)_
- Elegir una comida existente rellena su cantidad y unidad habituales; escribir un nombre nuevo la añade al catálogo al guardar. No se crean duplicados del mismo nombre (003: único sin distinguir mayúsculas).
- Cantidad > 0, con botones + y − grandes (48 dp, ver 006). Paso de 1 para unidades contables y de 10 para g/ml _(judgement, no standard)_
- Unidades: lista corta (unidad, rebanada, taza, cucharada, vaso, g, ml, ración) más la opción de escribir otra _(judgement, no standard)_
- Una celda admite varias comidas. Tocar una comida ya apuntada permite cambiar cantidad, unidad o comida, o quitarla (borrado lógico con deshacer, sin popup).
- Marcar o desmarcar una comida como favorita desde el panel; corregir el nombre de una comida del catálogo.
- Textos en español, tuteo cercano, pocos emojis; paleta HARD.

## Acceptance criteria

- Tocar la celda "martes · desayuno", escribir "tostadas con aceite", poner 2 unidades y guardar: aparece en la celda y persiste al recargar.
- En otra celda, escribir "tostadas" sugiere "tostadas con aceite"; al elegirla se rellena 2 unidades, con + pasa a 3 y se guarda como 3.
- Escribir "platano" sugiere "Plátano" si existe en el catálogo.
- Una comida marcada como favorita aparece en el panel antes de escribir nada.
- Quitar una comida de una celda se puede deshacer, y en ningún paso aparece una ventana emergente.

## Out of scope

- Arrastrar comidas entre celdas (008).
- Información nutricional, calorías o fotos de comidas.
- Borrar comidas del catálogo (solo corregir el nombre y marcar favoritas).
- Uso sin conexión (010).

## Dependencies

006 (tabla y celdas). Tablas `foods` y `meal_entries` de 003.

## Owner split

- agent: todo el desarrollo y los tests (búsqueda, normalización, +/−).
- human: probar con el padre que añadir una comida repetida es rápido y claro.
