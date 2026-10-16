# 016 — progress-evaluation — Requirements

## What's being built

Una vista sencilla que responde "¿voy bien o mal?" para cada hábito y para el peso, con un
semáforo amable (bien · regular · a mejorar) y una frase corta. Compara los datos de tu
padre con los objetivos que le marque la nutricionista, apuntados en Ajustes; si falta
algún objetivo, usa una referencia general, marcada siempre como orientativa.

## Who/what it serves

- El padre: entender de un vistazo si su evolución va bien, sin interpretar gráficas.
- Es el último paso de la definición de "terminado" del proyecto.

## Hard constraints

- Objetivos editables en Ajustes (de la nutricionista): peso objetivo y ritmo semanal, litros de agua al día, pasos al día. Cada uno puede quedar vacío.
- Referencias por defecto cuando no hay objetivo, siempre etiquetadas como "referencia general, no sustituye a tu nutricionista":
  - Peso: bajada de 0,5–1 kg por semana (media semanal, 012) _(standard: ritmo seguro de pérdida de peso, NHS — https://www.medicspot.co.uk/weight-loss/how-much-weight-can-you-lose, https://oviva.com/uk/en/how-much-weight-can-you-lose-in-a-month/; secundarias, no se encontró la página primaria del NHS)_
  - Agua: 2 L/día de bebida, derivado de la ingesta adecuada total de 2,5 L/día para hombres de EFSA, de la que ~20 % procede de los alimentos _(standard: EFSA AI agua total — https://pmc.ncbi.nlm.nih.gov/articles/4472938/; secundaria, no se abrió la opinión EFSA 2010)_
  - Pasos: 8.000/día _(standard: el riesgo de mortalidad se estabiliza en 6.000–8.000 pasos/día en ≥60 años y 8.000–10.000 en <60 — Paluch et al., Lancet Public Health 2022, https://pubmed.ncbi.nlm.nih.gov/35247352/)_ _(judgement, no standard: 8.000 como valor único válido para ambos tramos de edad)_
- La evaluación usa medias semanales, nunca un solo día _(standard: tendencia semanal frente a lecturas sueltas — https://www.bodyspec.com/blog/post/best_time_to_weigh_yourself_timing_and_frequency; secundaria)_
- WC y comidas no se evalúan como bien o mal: solo se muestran sus tendencias _(judgement, no standard: no hay una referencia general fiable y es terreno de la nutricionista)_
- Tono cercano y motivador, nunca alarmista ni culpabilizador; pocos emojis; sin ventanas emergentes (HARD). Semáforo con colores de la paleta (HARD) más un icono o texto, no solo color _(judgement, no standard)_
- Funciona sin conexión con los datos locales (010).

## Acceptance criteria

- Sin objetivos puestos y con una bajada media de 0,7 kg en la semana, el peso aparece como "bien" con la etiqueta de referencia general.
- Al poner en Ajustes un objetivo de 2,5 L de agua, la evaluación del agua usa 2,5 L y deja de mostrar la etiqueta de referencia general.
- Con una media de 5.000 pasos y sin objetivo, los pasos aparecen como "a mejorar" con una frase amable.
- Un solo día malo dentro de una semana buena no cambia la evaluación de la semana.
- Cada estado se distingue también por texto o icono, no solo por color.

## Out of scope

- Consejos médicos, de dieta o planes de alimentación.
- Avisos, notificaciones o recordatorios.
- Evaluar comidas concretas como buenas o malas.

## Dependencies

015 (series y medias). Usa los datos de 009, 012 y 014.

## Owner split

- human: apuntar en Ajustes los objetivos que dé la nutricionista; revisar el tono de los mensajes.
- agent: todo el desarrollo y los tests.
