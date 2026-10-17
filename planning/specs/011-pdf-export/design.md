# 011 — pdf-export — Design

## Approach

- **Generación**: `@react-pdf/renderer`, cargado bajo demanda (`import()` al pulsar el botón) para no engordar el bundle inicial. Nunito (OFL) en TTF regular y negrita servida desde `public/fonts/` y registrada con `Font.register`.
- **Maquetación** (`SheetPdf.tsx`): A4 apaisado, una página. Cabecera "CONTROL SEMANAL de COMIDAS" + "Semana N" (si N ≥ 1) + rango + "Menú nº" (si hay). Tabla: columna de etiquetas + 7 días; filas Desayuno…Cena con "nombre — cantidad unidad" en orden; filas Agua ("1,5 L"), WC ("Pis 5 · Caca 1"), Pasos ("8.500"); días sin datos en blanco. Fondo crema, bordes y textos carbón, cabeceras con franja salvia (solo paleta; se lee impreso en blanco y negro). Tamaño de letra según la celda más llena: 9 pt → 8 → 7 → 6; si aún no cabe, react-pdf continúa en una segunda página.
- **Dos pasos, por la Web Share API**: compartir exige un gesto reciente del usuario, y generar + subir puede tardar más. Por eso: botón **"Preparar PDF"** (genera y archiva) → cuando está listo, botón **"Compartir"** (móvil, si `navigator.canShare({ files })`) o **"Descargar"** (PC/sin soporte).
- **Archivar** (requiere conexión): sube a `sent-pdfs/{uid}/{sheet_id}/{fecha-hora ISO}.pdf` (sin upsert: no hay política de update) y después inserta la fila en `sent_pdfs`. Sin conexión (o si falla la subida): aviso en línea "Para guardar y enviar el PDF hace falta conexión" y no se ofrece compartir. Si falla el insert tras subir, el archivo queda huérfano e invisible (no hay borrado en Storage); se avisa en línea y se puede reintentar.
- **Nombre**: `control-semanal-semana-NN-AAAA-MM-DD.pdf` (lunes de la semana); semanas anteriores a la 1: `control-semanal-AAAA-MM-DD.pdf`.
- **Historial de PDF enviados**: sección "PDF enviados" bajo la tabla semanal, con fecha y hora y "Abrir" (URL firmada de corta duración, en pestaña nueva). Se abre el archivo tal como se envió.
- Datos: los mismos que pinta la pantalla (`getSheet`), así 010 no cambia nada aquí.

## Deliverables

- Dependencia `@react-pdf/renderer`; `public/fonts/Nunito-Regular.ttf` y `Nunito-Bold.ttf` (de google/fonts, OFL) con su licencia.
- `src/features/pdf/`: `SheetPdf.tsx`, `fileName.ts`, `fontSize.ts`, `api.ts` (`archivePdf`, `listSentPdfs`, `openSentPdf`), `PdfActions.tsx`, `SentPdfList.tsx` + tests.
- Integración en `WeeklySheetScreen`.

## Sequencing

1. Fuentes + `fileName`/`fontSize` + `SheetPdf` (independientes de Storage).
2. `api.ts` (Storage + `sent_pdfs`) → `PdfActions` (preparar/compartir/descargar) → `SentPdfList` → navegador.

## Open questions / deferred

- Compartir de verdad desde Android solo lo puede probar el humano.
