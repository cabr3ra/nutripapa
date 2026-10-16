# 009 — daily-tracking — Requirements

## What's being built

Rellenar las filas de seguimiento de cada día de la tabla: **agua** (litros), **WC** (dos
contadores dentro de la misma fila: pis y caca) y **ejercicio** (pasos que tu padre mira en
su móvil y apunta a mano).

## Who/what it serves

- El padre: apuntar sus datos del día con unos pocos toques.
- La nutricionista, vía PDF (011): ver cómo responde su cuerpo a la dieta.
- 012 (peso) y 014 (km) amplían este mismo registro; 015 lo usa para las estadísticas.

## Hard constraints

- Un registro por tabla y día (`daily_logs`, 003); si una semana tiene varias tablas, cada una tiene el suyo (decisión de la entrevista).
- Agua en litros, con botones + y − en pasos de 0,25 L (un vaso) y la opción de escribir el valor _(judgement, no standard)_; se muestra con coma decimal ("1,5 L").
- WC: dos contadores en la misma fila, pis y caca, cada uno con + y − (enteros ≥ 0).
- Pasos: número entero ≥ 0, escrito a mano con el teclado numérico del móvil (`inputmode="numeric"`), con separador de miles al mostrarlo ("8.500") _(standard: atributo `inputmode` para elegir el teclado virtual — referencia MDN vía mirror https://docs.w3cub.com/html/reference/global_attributes/inputmode)_
- Una celda vacía se muestra como vacía, no como 0, para distinguir "no apuntado" de "cero" _(judgement, no standard)_
- Valores fuera de lo razonable (por ejemplo, agua > 10 L o pasos > 100.000) muestran un aviso suave en línea, pero se pueden guardar _(judgement, no standard)_
- Botones de 48 dp, sin ventanas emergentes (HARD), paleta HARD, textos en español cercanos.

## Acceptance criteria

- En la tabla, el martes: pulsar + de agua 6 veces muestra "1,5 L" y persiste al recargar.
- En la fila WC del martes se apuntan 5 pis y 1 caca por separado y ambos se ven en la celda.
- Escribir 8500 pasos en el móvil abre el teclado numérico y se muestra "8.500".
- Un día sin datos se ve vacío, no con ceros.
- Dos tablas de la misma semana mantienen registros de agua, WC y pasos independientes.

## Out of scope

- Peso (012) y km (014).
- Leer pasos automáticamente del móvil (Health Connect / Google Fit): se apuntan a mano (entrevista).
- Objetivos diarios o avisos de "te falta agua".

## Dependencies

006 (tabla y filas visibles). Tabla `daily_logs` de 003.

## Owner split

- agent: todo el desarrollo y los tests.
- human: probarlo con el padre.
