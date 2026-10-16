# 012 — weight-tracking — Requirements

## What's being built

Registrar el peso de tu padre casi a diario: un valor en kg por fecha, apuntado desde la
tabla (fila "Peso" en cada día) y visible también en una pequeña evolución dentro de la
tabla semanal (peso del primer y último día apuntado de la semana y la media semanal).

## Who/what it serves

- El padre: apunta el peso en segundos y ve si baja.
- La nutricionista: ve el peso de la semana en el PDF.
- 015 (estadísticas) y 016 (evaluación) usan esta serie.

## Hard constraints

- El peso es de la persona y de la fecha, no de una tabla concreta: un único valor por fecha natural (tabla nueva `weight_logs` con `date` única por usuario, migración propia) aunque una semana tenga varias tablas _(judgement, no standard)_
- kg con un decimal ("82,4 kg"), botones + y − de 0,1 kg y opción de escribirlo con teclado decimal (`inputmode="decimal"`); se propone por defecto el último peso apuntado _(judgement, no standard)_
- Junto al campo, un recordatorio breve: pesarse por la mañana, tras ir al baño y antes de desayunar, siempre en la misma báscula _(standard: pesaje matinal en las mismas condiciones como lectura más estable — https://www.withings.com/us/en/blog/the-art-of-weighing-yourself, https://www.uhhospitals.org/blog/articles/2026/10/how-often-should-you-weigh-yourself; secundarias)_
- Lo importante es la tendencia semanal, no el dato de un día: la tabla muestra la media semanal y no destaca subidas de un solo día _(standard: media semanal frente a lecturas sueltas — https://www.bodyspec.com/blog/post/best_time_to_weigh_yourself_timing_and_frequency; secundaria)_
- Se añade una fila "Peso" al PDF (011) y a la sincronización sin conexión (010).
- Migración no destructiva; 48 dp, sin ventanas emergentes (HARD), paleta HARD.

## Acceptance criteria

- Apuntar 82,4 kg el martes lo guarda para esa fecha y aparece igual en todas las tablas de esa semana.
- Al apuntar el miércoles, el campo propone 82,4 y con − pasa a 82,3.
- La tabla semanal muestra la media de los pesos apuntados esa semana.
- El PDF de la semana incluye la fila "Peso".
- Funciona sin conexión y se sincroniza como el resto de datos (010).

## Out of scope

- Gráficas de evolución por semanas y meses (015) y la valoración de si va bien o mal (016).
- Conexión con básculas inteligentes o Health Connect.
- Otras medidas corporales (cintura, % de grasa).

## Dependencies

009 (filas de seguimiento). En la práctica también usa 010 (sincronización) y 011 (PDF),
que deben estar terminadas para cumplir los criterios correspondientes.

## Owner split

- agent: migración, UI, PDF, sincronización y tests.
- human: probarlo con el padre.
