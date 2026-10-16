# 008 — drag-and-drop — Requirements

## What's being built

Mover comidas ya apuntadas de una celda a otra arrastrándolas (por ejemplo, de la cena del
martes a la comida del miércoles) y reordenarlas dentro de la misma celda. Como alternativa
sin arrastre, cada comida tiene una acción "Mover a…" que permite elegir día y momento con
toques.

## Who/what it serves

- El padre: corregir dónde apuntó algo sin borrarlo y volver a escribirlo.
- 011 y 015: reflejan la posición final de cada comida.

## Hard constraints

- Toda acción de arrastre tiene una alternativa con toques simples, sin arrastrar ("Mover a…" con selector de día y momento) _(standard: WCAG 2.2 SC 2.5.7 Dragging Movements, nivel AA — https://kb.daisy.org/publishing/docs/wcag/dragging-movements.html; secundaria, la oficial es el Understanding de W3C)_
- Librería `@dnd-kit` con sensor de puntero (ratón, táctil) y teclado. En táctil, el arrastre empieza tras mantener pulsado unos 250 ms con una tolerancia de unos 5 px, para no confundirlo con el scroll; elementos arrastrables con `touch-action: manipulation` _(standard: dnd-kit — sensores y restricciones de activación — https://dndkit.com/react/guides/sensors, https://docs.dndkit.com/api-documentation/sensors/touch)_
- En el móvil, con un día visible cada vez (006), se puede soltar sobre un día de la tira L–D para moverla a ese día, y la tira cambia al día destino _(judgement, no standard)_
- Mover actualiza `day_of_week`, `meal_slot` y `position` de la entrada (003); la cantidad, la unidad y la comida no cambian.
- Se puede deshacer el último movimiento, sin ventana emergente (HARD).
- Zonas de destino visibles durante el arrastre usando solo la paleta (HARD).

## Acceptance criteria

- En el PC, arrastrar "tostadas con aceite" de martes·desayuno a miércoles·comida la mueve, y persiste al recargar.
- En un móvil Android, mantener pulsada una comida y soltarla sobre otro día de la tira la mueve a ese día; deslizar sin mantener pulsado hace scroll normal.
- "Mover a…" permite el mismo movimiento solo con toques.
- Reordenar dos comidas dentro de una celda conserva el nuevo orden al recargar.
- El último movimiento se puede deshacer.

## Out of scope

- Mover comidas entre tablas o semanas distintas (para eso está duplicar, 006).
- Arrastrar filas de agua, WC o pasos, o reordenar los momentos del día.
- Copiar arrastrando (solo mover).

## Dependencies

007 (comidas en las celdas).

## Owner split

- agent: todo el desarrollo y los tests.
- human: probar el arrastre en el móvil del padre.
