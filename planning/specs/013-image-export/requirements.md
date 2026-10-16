# 013 — image-export — Requirements

## What's being built

Compartir la semana como **imagen** (PNG) además de como PDF, con exactamente el mismo
contenido y aspecto que el PDF de 011, para enviarla cómodamente por WhatsApp.

## Who/what it serves

- El padre y la nutricionista: una imagen se ve directamente en el chat, sin abrir un PDF.

## Hard constraints

- La imagen se obtiene rasterizando la página del PDF de 011 con `pdfjs-dist` en un canvas y `canvas.toBlob('image/png')`, así PDF e imagen nunca divergen _(standard: render de PDF a PNG en el navegador con pdf.js + toBlob — https://zenn.dev/sktt_panda/articles/pdf-to-image-browser-pdfjs, https://scrapbox.io/takker/scrapbox-pdftoimage; secundarias)_
- Resolución suficiente para leerse con zoom en el móvil: escala ≈ 200 DPI (escala = DPI / 72) _(standard: escala base 72 DPI en pdf.js — https://dev.to/sunshey/how-to-convert-pdf-pages-to-images-with-vue-3-and-pdfjs-5h24; secundaria)_ _(judgement, no standard: 200 DPI)_
- Compartir con la Web Share API (archivo PNG) y descargar en el PC si no está disponible, igual que 011.
- Cada imagen enviada se archiva igual que los PDF (bucket `sent-pdfs`, registro en `sent_pdfs` con el formato) _(judgement, no standard: coherencia con "guardar cada envío")_
- Requiere conexión para archivar; aviso en línea sin ventana emergente (HARD).

## Acceptance criteria

- "Compartir imagen" en el Android abre el menú de compartir con un PNG de la semana.
- El PNG muestra lo mismo que el PDF de esa tabla y se lee con zoom en el móvil.
- El PNG enviado aparece en el historial de la tabla junto a los PDF, marcado como imagen.
- En el PC el botón descarga el PNG.

## Out of scope

- Editar o anotar la imagen.
- Otros formatos (JPEG, varias páginas).

## Dependencies

011 (maquetación del PDF y archivo). Requiere una migración menor en `sent_pdfs` para
guardar el formato (png/pdf).

## Owner split

- agent: todo el desarrollo y los tests.
- human: comprobar que se lee bien en WhatsApp.
