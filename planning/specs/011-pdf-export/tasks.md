# 011 — pdf-export — Tasks

Status legend: `todo` · `in_progress` · `blocked` · `interrupted` · `done`
Owner: `agent` (loop-runnable) · `human` (skipped by the loop)

- [ ] T001 [agent] [status:todo] Descargar Nunito Regular/Bold TTF de google/fonts a `public/fonts/` con su licencia OFL
- [ ] T002 [agent] [status:todo] Escribir `fileName.ts` y `fontSize.ts` + tests
- [ ] T003 [agent] [status:todo] Instalar `@react-pdf/renderer` y escribir `SheetPdf.tsx` (A4 apaisado, cabecera, 7×5 + seguimiento) + test de render
- [ ] T004 [agent] [status:todo] Escribir `pdf/api.ts`: subir a `sent-pdfs`, insertar `sent_pdfs`, listar y URL firmada + tests
- [ ] T005 [agent] [status:todo] Escribir `PdfActions`: preparar → compartir/descargar, sin conexión con aviso en línea + tests
- [ ] T006 [agent] [status:todo] Escribir `SentPdfList` en la pantalla de la tabla + tests
- [ ] T007 [agent] [status:todo] Comprobar `pnpm lint`, `pnpm test` y `pnpm build` en verde (y que el bundle inicial no incluye react-pdf)
- [ ] T008 [agent] [status:todo] En el navegador: preparar y descargar el PDF de la tabla actual, revisar su aspecto, verlo en el historial y abrirlo
- [ ] T009 [human] [status:todo] Compartir desde el Android y revisar que se ve claro
