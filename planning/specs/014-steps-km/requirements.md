# 014 — steps-km — Requirements

## What's being built

Mostrar los **km** junto a los pasos de cada día, como referencia. Por defecto se calculan
a partir de los pasos y de la altura de tu padre (como hace su móvil); si él prefiere,
puede escribir los km que le marca el móvil y entonces se usa ese valor.

## Who/what it serves

- El padre y la nutricionista: una referencia de distancia más intuitiva que los pasos.
- 015 (estadísticas de ejercicio).

## Hard constraints

- Longitud del paso estimada = altura (cm) × 0,415 (factor para hombres); km = pasos × longitud del paso / 100 000 _(standard: factores de longitud de paso por altura, 0,415 hombres / 0,413 mujeres, sobre altura en cm — https://foot.it.com/step-length-calculator, https://fitnessvolt.com/average-walking-stride-length/; secundarias)_
- La altura se introduce una vez en Ajustes de la app (en cm); sin altura no se calculan km y la celda invita a ponerla _(judgement, no standard)_
- Km escritos a mano para un día sustituyen al calculado; se distingue visualmente cuál es estimado ("≈ 6,2 km") y cuál apuntado ("6,4 km") _(judgement, no standard)_
- Un decimal, coma decimal; se guarda en `daily_logs` (columna nueva `km_manual`, migración no destructiva) y la altura en una tabla de ajustes del usuario.
- Se añade a la fila de ejercicio del PDF (011) y a la sincronización (010).
- Sin ventanas emergentes (HARD), paleta HARD.

## Acceptance criteria

- Con altura 175 cm y 8.500 pasos, la celda muestra "≈ 6,2 km".
- Escribir 6,4 km ese día sustituye el estimado y se muestra sin "≈".
- Sin altura configurada, la celda de km invita a ponerla en Ajustes y no muestra un valor inventado.
- El PDF muestra pasos y km en la fila de ejercicio.

## Out of scope

- Leer pasos o distancia automáticamente del móvil.
- Calorías quemadas u otras métricas de actividad.

## Dependencies

009 (pasos). Usa 010 (sync) y 011 (PDF), que en la práctica deben estar terminadas.

## Owner split

- agent: todo el desarrollo y los tests.
- human: poner la altura del padre en Ajustes y comparar con lo que marca su móvil.
