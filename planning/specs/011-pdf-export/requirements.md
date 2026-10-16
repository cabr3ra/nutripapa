# 011 — pdf-export — Requirements

## What's being built

Generar el PDF de una tabla semanal para la nutricionista, compartirlo desde el móvil o
descargarlo en el PC, y guardar una copia de cada PDF enviado en el historial. El PDF
reproduce la tabla de papel: cabecera "CONTROL SEMANAL de COMIDAS" con número de semana,
rango de fechas y número de menú (si lo hay); 7 columnas (L–D); filas de desayuno, media
mañana, comida, media tarde y cena, y filas de agua, WC (pis/caca) y ejercicio (pasos).

## Who/what it serves

- La nutricionista: recibe cada jueves una tabla clara y legible.
- El padre: la envía con un toque y puede recuperar cualquier PDF ya enviado.
- 013 (imagen) reutiliza esta misma maquetación.

## Hard constraints

- Generación en el navegador con `@react-pdf/renderer` (PDF a partir de componentes React, con más control de maquetación que jsPDF) y Nunito registrada como fuente _(standard: comparativa 2026 — https://www.pkgpulse.com/guides/react-pdf-vs-react-pdf-renderer-vs-jspdf-pdf-in-react-2026; secundaria)_
- A4 apaisado, la semana completa en una sola página; si una celda tiene muchas comidas, el texto se reduce antes de pasar a una segunda página _(judgement, no standard)_
- Colores de la paleta (HARD) con contraste suficiente para leerse también impreso en blanco y negro _(judgement, no standard)_
- Cada comida aparece como "nombre — cantidad unidad" en el orden de la celda; los días sin datos quedan en blanco.
- Compartir en móvil con la Web Share API (`navigator.canShare({ files })` y luego `navigator.share`); si no está disponible (PC), descarga directa _(standard: Web Share API con archivos, PDF permitido — https://web.dev/articles/web-share)_
- Al compartir o descargar, el PDF se sube al bucket privado `sent-pdfs` (ruta `{uid}/{sheet_id}/{fecha}.pdf`) y se registra en `sent_pdfs`; el historial de PDFs de cada tabla se puede abrir de nuevo (003).
- Nombre de archivo legible: `control-semanal-semana-NN-AAAA-MM-DD.pdf` _(judgement, no standard)_
- Requiere conexión para archivar; sin conexión se avisa en línea, sin ventana emergente (HARD), y no se genera un registro a medias.

## Acceptance criteria

- Desde una tabla con datos, "Compartir PDF" en el Android abre el menú de compartir del sistema con el PDF adjunto (por ejemplo, para WhatsApp o el email).
- En el PC, el mismo botón descarga el PDF.
- El PDF muestra la cabecera correcta, los 7 días, los 5 momentos con comida, cantidad y unidad, y las filas de agua, WC y pasos, todo en una página A4 apaisada.
- Tras compartir, el PDF aparece en el historial de esa tabla con su fecha y se puede volver a abrir tal como se envió, aunque después se haya editado la tabla.
- Sin conexión, el botón explica que hace falta conexión y no deja nada a medias.

## Out of scope

- Exportar como imagen (013).
- Enviar el PDF automáticamente a la nutricionista (email o WhatsApp automáticos).
- Peso, km y estadísticas en el PDF (fases posteriores).

## Dependencies

006 (tabla) y 009 (filas de seguimiento). Bucket `sent-pdfs` y tabla `sent_pdfs` de 003.

## Owner split

- agent: todo el desarrollo y los tests.
- human: revisar que el PDF se ve claro (y, si queréis, enseñárselo a la nutricionista).
