# 010 — offline-sync — Requirements

## What's being built

Que la app funcione sin conexión y sincronice sola: tu padre puede abrir la app, ver sus
tablas y apuntar comidas, agua, WC y pasos sin internet; los cambios se guardan en el
dispositivo y se envían a Supabase al volver la conexión, de modo que el móvil y el PC
acaban con los mismos datos. Un indicador discreto muestra siempre el estado: sincronizado,
pendiente, sin conexión o error.

## Who/what it serves

- El padre: nunca pierde un dato por falta de cobertura, y ve lo mismo en el móvil y en el PC.
- El usuario: el indicador de estado es el mecanismo de "observabilidad" acordado (sin servicios externos).
- 011–016 leen los datos a través de esta capa.

## Hard constraints

- Base local en IndexedDB mediante Dexie.js como fuente de verdad en el dispositivo; la UI lee de ella _(standard: IndexedDB para datos estructurados offline — https://web.dev/learn/pwa/offline-data; Dexie como envoltorio — secundaria https://skills.sh/agents-inc/skills/web-pwa-offline-first)_
- Cola de salida (outbox) con cada cambio local; se vacía al recuperar conexión (`online`), al volver la app a primer plano y con un temporizador, con reintentos con espera exponencial y jitter. No depende de la Background Sync API _(standard: Background Sync solo en Chrome/Edge; reintentos con backoff + jitter — https://skills.sh/agents-inc/skills/web-pwa-offline-first; secundaria)_
- Conflictos: gana la última escritura por fila según `updated_at` (un solo usuario, conflictos raros); los borrados viajan como `deleted_at` (003) _(standard: last-write-wins + tombstones — https://slicker.me/webdev/pwas-offline-first.html; secundaria)_ _(judgement, no standard: aceptar el riesgo de desfase de reloj entre dispositivos por ser un único usuario)_
- Al arrancar y periódicamente, descarga los cambios remotos posteriores a la última sincronización.
- Solicitar almacenamiento persistente (`navigator.storage.persist()`) para que el navegador no borre los datos locales _(standard: https://web.dev/learn/pwa/offline-data; https://learn.microsoft.com/en-nz/Microsoft-edge/progressive-web-apps/how-to/offline)_
- La app (shell) se abre sin conexión gracias al service worker de 001.
- Indicador de estado siempre visible y discreto, en línea, sin ventana emergente (HARD); textos cercanos ("Sin conexión, lo guardo y lo envío luego").
- Nada se borra en remoto salvo por un borrado lógico explícito del usuario (regla: nunca borrar datos reales).

## Acceptance criteria

- Con el móvil en modo avión, la app se abre, muestra las tablas y permite añadir una comida y agua; el indicador dice "sin conexión / pendiente".
- Al quitar el modo avión, los cambios llegan a Supabase en menos de un minuto sin hacer nada, y el indicador pasa a "sincronizado".
- Un cambio hecho en el PC aparece en el móvil al abrir o volver a la app.
- Si el mismo dato se edita sin conexión en los dos dispositivos, al sincronizar queda la edición más reciente y no se pierde ninguna otra fila.
- Si el envío falla por un error del servidor, el indicador muestra "error" y el cambio sigue en la cola para reintentarse.

## Out of scope

- Edición colaborativa en tiempo real o fusión campo a campo (CRDT).
- Generar o subir PDF sin conexión: en 011 requiere conexión.
- Sincronizar datos de peso o km (se añaden a esta capa en 012 y 014).

## Dependencies

007 y 009 (las entidades que se editan). Usa `updated_at` y `deleted_at` de 003 y el service worker de 001.

## Owner split

- agent: todo el desarrollo y los tests (cola, reintentos, conflictos).
- human: probar en el móvil con modo avión y con dos dispositivos.
