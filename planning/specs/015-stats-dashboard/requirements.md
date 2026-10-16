# 015 — stats-dashboard — Requirements

## What's being built

Un dashboard de estadísticas aparte de la tabla semanal, para explorar "como un juego de
datos" la evolución de tu padre por **días, semanas y meses**: comidas, agua, WC,
ejercicio (pasos y km) y peso. Se elige el periodo, se navega hacia atrás y hacia
delante, y al tocar un punto se ve el detalle de ese día o esa semana.

## Who/what it serves

- El padre: ver de un vistazo cómo lleva cada hábito y su peso.
- 016 (evaluación) se apoya en estas mismas series.

## Hard constraints

- Selector de periodo: día · semana · mes, con flechas para moverse en el tiempo.
- Secciones: **Peso** (línea diaria + media semanal, 012); **Agua** (litros por día y media del periodo); **WC** (pis y caca por día); **Ejercicio** (pasos y km por día, 014); **Comidas** (las más repetidas del periodo y cuántas veces, y en qué momento del día).
- Librería `recharts` (la opción estándar para dashboards con gráficas comunes en React) _(standard: Recharts como punto de partida por defecto en 2026 — https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026, https://blog.logrocket.com/top-5-react-chart-libraries/; secundarias)_
- Colores solo de la paleta (HARD): como mucho dos series por gráfica (principal salvia y acento terracota), sin añadir colores _(judgement, no standard: consecuencia de la regla HARD)_
- Pensado primero para el móvil: una gráfica por pantalla, legible sin zoom; en el PC, varias en cuadrícula. Las gráficas siguen la guía del skill `dataviz` salvo donde choque con la paleta HARD.
- Tocar un punto muestra su valor y fecha en línea (no en ventana emergente, HARD).
- Los datos salen de la base local (010): funciona sin conexión.
- Días sin datos se muestran como huecos, no como ceros (coherente con 009).

## Acceptance criteria

- En "Mes", la gráfica de peso muestra todos los pesos del mes y la media semanal; al tocar un punto se ve "82,4 kg · mar 20 oct".
- En "Semana", la sección de agua muestra los litros de cada día y la media de la semana.
- La sección de comidas lista las 5 más repetidas del periodo con su número de veces.
- Con las flechas se pasa al mes o la semana anterior y los datos cambian.
- En un Android todas las gráficas se leen sin zoom ni scroll horizontal, y funcionan en modo avión.

## Out of scope

- La valoración de si va bien o mal (016).
- Exportar las estadísticas a PDF o imagen.
- Datos nutricionales (calorías, macros).

## Dependencies

012 (peso). En la práctica usa también 009, 010 y 014 para las demás series.

## Owner split

- agent: todo el desarrollo y los tests.
- human: revisar con el padre que se entiende y le resulta útil.
