# Interview ledger

## Phase A — Type & vision

| dimension | status | answer summary or skip reason |
|---|---|---|
| idea-detail | covered | VERBATIM: "El dia a dia de mi padre es que cada vez que va a comer debe apuntarse en un papel y boli, y a veces debe cambiar las cosas y no tiene un control comodo para apuntar las cosas, dependiendo del dia debe modificar comidas y quiero que sea para él rapido y simple,a gregar comida nueva y comida repetida apra apuntar que ah comido en ese tiempo. Me gustaria que el mediante mobil o mediante ordenador para que se peuda rellenar en ambos sitios tenga acceso y opcion a ñadir la comida y tener ese control accesible en ambos dispositivos.Me imagino que el abre una app y le sale el dashboard, y para rellenar la comida tiene visualmente al opcion de escoger dia y momento del dia, y ahi rellena los datos. Que el puedo oescribir con sus propias palabras la comida y si se detecta que es comida ya se ha añadido simplemente deba escoger esa opcion o simplemente modificar el dato especifico qeu peude ser en vez de comer dos tostadas, pues poner 3 tostadas. el numero de menu se puede omitir. cada visita con la nutricionista debe darle el dashboard o tabal de control semanal de comidas y hacer una evalucion para que la siguientes semanas cambie su dieta. lo de la agua wc y ejericio es informacion extra que ayuda a la nutricionista a ver como su cuerpo se adapta a estos cambios con su cuerpo, incluso añadiria el peso, para ver una evalucion en algun modulo o acceso para ver su evalucion de forma simple que se entienda y ver si va bien o mal. En agua se mide en litros. Wc se apunta las veces que hace pis y las veces que hace caca, dentro de la fila wc. se podria estructurar mejor pero la idea es esa. y leugo ejercicio se mide por los pasos que ahce cada dia, entonces el lo mira en su mobil los pasos que ha hecho al dia y lo apunta en pasos. estaria bien poner km para tenr una referencia, que lo pueda poner él o que se calculara, como lo hace su mobil. Ahora mismo s elo ahce llegar mediante un papel escrito en boli, y se lo da cada semana los jueves de cada semana. No he visto ninguna app parecida, es de uso local y personal, el objetivo es que sea comfy estilo minimalista y organic y bonito, facil de usar e intuitivo." + IDEA.md (tabla L–D × desayuno/media mañana/comida/media tarde/cena + agua/WC/ejercicio; cabecera título/nº semana/fecha; compartir PDF/imagen). STRUCTURE — Problem: registro en papel/boli, incómodo de modificar. Users: el padre (registra); nutricionista (recibe tabla, evalúa, ajusta dieta). Flow: abre app → dashboard semanal → elige día + momento → escribe comida en texto libre → si ya existe, la elige o ajusta cantidad (2→3 tostadas) → visita los jueves → entrega tabla (PDF/imagen). Entities: semana (título, nº semana, fecha; nº menú omitible), día, momento (5), entrada de comida (texto + cantidad), comida reutilizable, agua (litros), WC (nº pis, nº caca), ejercicio (pasos; km introducido o calculado), peso (nuevo), evaluación/progreso simple (va bien/mal). Integrations: ninguna explícita (pasos los lee del móvil y los apunta a mano). Devices: móvil y PC con los mismos datos. Style: comfy, minimalista, orgánico, bonito, intuitivo. "Uso local y personal". |
| project-type | covered | software — web app instalable (PWA), usada en móvil y PC (elegido de opciones cerradas) |
| goal | covered | Confirmado ("sí, así está bien"): NutriPapa es una web app instalable (móvil y PC) donde tu padre registra de forma rápida y visual lo que come cada semana: 5 momentos al día, agua, WC, pasos y peso. Puede reutilizar comidas que ya apuntó antes y comparte la semana con su nutricionista en PDF o imagen. Sustituye al papel y boli, y le enseña de forma sencilla si su evolución va bien o mal. |
| audience | covered | "solo mi padre, a la nutricionista le llega el PDF. sabe de mobil pero me gustaria que fuera facil para cualquier persona." → Único usuario: el padre (maneja el móvil). Nutricionista = receptora del PDF, no usa la app. Usabilidad: fácil para cualquier persona. |
| mvp | covered | VERBATIM: "Lo quiero todo, si vmaos por fases lo que has dicho de primera fase de una tabla y que la informacion sea flexible se peuda mover en dsiitntos sitios y luego que si repita allá la opcion de repetir la comida y modificar la cantidad, vamos a ahce runa base simple pero muy funcional y flexible. y luego ya hacemos una evaluacion. lo importante es la tabla flexible y que se pueda tenr en pdf y que tenga el historial por si a caso de cada tabla que genera en pdf, para que en cualquier momento pueda corregirlo cuando le apetezca. Para ahcerlo optimo puede duplicar y peude modificar, y puede eliminar, pero que al menos tenga una tabal por semana, minimo." → Fase 1: tabla semanal flexible (info movible entre celdas), repetir comida + modificar cantidad, exportar PDF, historial de tablas/PDF generados editable en cualquier momento, duplicar/modificar/eliminar semanas, mínimo una tabla por semana. Después: evaluación. Producto final = todo. Follow-up: "arrastrar entre celdas; agua, WC, pasos y sync en fase 1". RESUMEN — Fase 1 (MVP): tabla semanal; arrastrar comidas entre celdas; repetir comida + modificar cantidad; agua (L), WC (pis/caca), pasos; sync móvil↔PC; exportar PDF; historial de semanas editable; duplicar/modificar/eliminar semanas (mín. 1 por semana). NO en fase 1 (no elegidos para fase 1): peso, exportar imagen, km calculados, evaluación. |
| done-when | covered | VERBATIM: "cuando lo tenga todo lo mencionado con lo del peso, ya que casi cada dia se pesa, por eso lo decia, y ver un dashbaord especifico de datos sobre sus comidaas, o cuanto agua lleva bebeindo durante semanas dias y meses, lo mismo con wc agua, ejercicio, y comidas, que sea como un juego de datos para poder ver todo." → Terminado cuando: todo lo de fase 1 + peso (registro casi diario) + dashboard de estadísticas (comidas, agua, WC, ejercicio, peso) por días/semanas/meses, explorable "como un juego de datos". |
| constraints-hard | covered | "gratis, sin fecha límite, sin crear cuentas complicadas" → coste 0 (servicios gratuitos), sin deadline, nada de registros/cuentas complicadas para el padre. |
| stakeholders | covered | "lo decido yo, y mi padre lo prueba" → decide el usuario (hijo); el padre hace pruebas de uso. Nutricionista no aprueba nada. |
| history (sweep) | covered | "B, guardar también cada PDF enviado" → historial = tablas semanales editables + copia archivada de cada PDF tal como se envió. |
| week-header (sweep) | covered | "título fijo sin su nombre "CONTROL SEMANAL de COMIDAS", rango lunes–domingo, semana desde inicio dieta" → título fijo "CONTROL SEMANAL de COMIDAS"; fecha = rango lunes–domingo; nº semana contado desde el inicio de la dieta. Follow-up: "B, empieza el lunes 19 de octubre" → se muestran rango de fechas (semanas empiezan en lunes) + nº semana; semana 1 = lunes 19-oct-2026 a domingo 25-oct-2026. |
| food-entry (sweep) | covered | "B, nombre y cantidad con botones + y −" → cada comida = nombre + cantidad numérica separada, ajustable con botones + / −. |
| automatability | covered | "el agente todo el código, yo cuentas, diseño y pruebas" → agent: todo el código. human: crear cuentas en servicios, decisiones de diseño, pruebas. |

Phase A sweep: "no, sigue con lo técnico" → clean. Phase A closed.

## Phase B — Technologies (B-software)

| dimension | status | answer summary or skip reason |
|---|---|---|
| runtime | covered | Opción 1 elegida ("1, pero dime que cuentas debo crear antes de seguir"), resuelto vía opciones investigadas: TypeScript en navegador (sin backend propio; Python descartado para servidor). Usuario: le gustan Python, SQL, React. |
| framework | covered | Opción 1 (vía opciones investigadas): React + Vite + TypeScript, PWA. |
| toolchain | covered | Propuesta del agente aceptada ("me vale"): pnpm · Vitest · ESLint + Prettier · comandos pnpm test / pnpm lint / pnpm build. |
| datastore | covered | Opción 1 (vía opciones investigadas): Supabase (Postgres) + Supabase Storage para PDFs archivados. Plan gratuito: pausa tras 7 días sin actividad. Migraciones: archivos SQL en supabase/migrations/ (Supabase CLI); el agente las aplica directamente al proyecto remoto ("quiero que el agente lo aplique directamente"). Proyecto Supabase 'NutriPapa' ya creado: ref jojumjyqxpqzaslbxrso, región eu-west-1 (Irlanda), Postgres 17.11, plan gratuito (https://supabase.com/dashboard/project/jojumjyqxpqzaslbxrso). |
| data-model | covered | Borrador mostrado y aceptado + "cantidad con unidad, y favoritos sí". Entidades: Semana (nº desde 19-oct-2026, lunes inicio, título fijo, nº menú opcional) · Comida de catálogo (nombre, favorita sí/no) · Entrada de comida (semana, día, momento ∈ {desayuno, media mañana, comida, media tarde, cena}, comida de catálogo, cantidad + unidad) · Registro diario (agua L, nº pis, nº caca, pasos; luego peso, km) · PDF enviado (semana, fecha generación, archivo). Sugerencias al escribir + favoritos. |
| interface | covered | "sí, directo a Supabase sin API propia" → cliente supabase-js desde el navegador; seguridad por RLS; sin API propia ni versionado. |
| identity | covered | Previo: Google OAuth con la cuenta Google del usuario (email omitido). Luego: "mi padre entra con su cuenta, o mejor que no entre con ninguna cuenta al final solo lo va usar él" → quiere sin cuenta; conflicto con sync (datos de salud expuestos sin auth). Elegido (opción cerrada): "Código una vez" → acceso único fijo creado por el usuario (hijo) en Supabase; el padre introduce un código/contraseña una vez por dispositivo, sesión persistente; sin cuentas para él; solo ese acceso puede leer/escribir (RLS). Google OAuth descartado. |
| hosting | covered | Opción 1 (vía opciones investigadas): Cloudflare Pages (estático, gratis). Despliegue: "main, con despliegue automático" → Cloudflare Pages conectado al repo GitHub; push a main = deploy a producción; ramas = URLs de preview. Rama principal: main (hoy local es master → renombrar). Offline: la opción 1 elegida incluía funcionar sin conexión y sincronizar al volver. |
| ci | covered | "sí, con GitHub Actions, pero que no sea bloqueante" → GitHub Actions ejecuta pnpm lint + pnpm test + pnpm build en cada push; informativo, NO bloquea merge/deploy. |
| env-secrets | covered | Propuesta aceptada (usuario facilitó claves en chat — valores NO registrados en ningún archivo). VITE_SUPABASE_URL + clave publishable (sb_publishable_…) en .env.local (gitignored) + .env.example sin valores. Clave secret (sb_secret_…), access token Supabase CLI y contraseña BD solo en la máquina local, nunca en repo ni en la app. Código de acceso del padre nunca en repo. |
| verification | covered | "me vale, sin Playwright por ahora" → Vitest unitarios para lógica (semanas, sugerencias, duplicar, PDF) + verificación manual visual/UX por el usuario y prueba del padre. Playwright/E2E: no por ahora. |
| third-party | covered | Supabase + Cloudflare (+ GitHub para repo). Cuentas las crea el usuario (owner human). |
| observability | covered | "B, aviso en la app sin servicios externos" → indicador visible en la app del estado de sincronización (sin conexión / pendiente / error al guardar) para no perder datos sin saberlo. Sin Sentry ni servicios externos. |

Phase B sweep: "no, sigue con las herramientas y el estilo" → clean. Phase B closed. Written to planning/architecture.md + AGENTS.md.

## Phase C — Helper skills & agent tooling

| dimension | status | answer summary or skip reason |
|---|---|---|
| helper-skills | covered | "todas, y añade el MCP de Supabase al roadmap" → usar (ya disponibles en sesión): run, claude-in-chrome, dataviz, code-review, security-review. Supabase MCP server: no disponible en sesión → entrada de roadmap (owner human). |
| worker-cli | covered | "claude, solo Claude Code" → workers: claude (flags del known-flags map de loop-setup). |
| agent-rules | covered | "nunca borrar datos reales de Supabase, comentarios en español" |

## Phase D — Styles & preferences

| dimension | status | answer summary or skip reason |
|---|---|---|
| visual-surface | covered | Sí: UI de la PWA + PDF semanal. Usuario (idea-detail): "comfy estilo minimalista y organic y bonito, facil de usar e intuitivo". |
| palette | covered | "la 1, salvia y crema" (resuelto vía opciones investigadas): fondo #F5EFE6 crema · superficie #EDE8D0 beige · principal #9CAF88 salvia · acento #E2725B terracota · texto #36454F carbón. Contraste a verificar. |
| typography | covered | "la 1, Nunito" (resuelto vía opciones investigadas): Nunito (Google Fonts) para toda la UI. Escala tipográfica: TBD. |
| density-mode | covered | "espaciosa, solo modo claro" |
| brand-refs | skipped | "ninguna en concreto" — sin referencias ni marca previa. |
| tone | covered | "español, cercano y cálido, con pocos emojis" → idioma es; tuteo cercano y cálido; emojis escasos. |
| accessibility | covered | "android, edge o chrome" → móvil Android; PC con Edge o Chrome. + "tamaño normal con buen contraste" → texto tamaño normal; contraste WCAG AA como referencia. |
| code-conventions | covered | "código en inglés, Conventional Commits, carpetas las propone el agente" → identificadores en inglés; comentarios en español (agent-rules); Conventional Commits; estructura de carpetas a criterio del agente. WCAG AA como referencia de contraste (propuesto, no objetado). |
| anti-preferences | covered | "ventanas emergentes y demasiados colores" → evitar popups/modales; ceñirse a la paleta, sin colores extra. |
| preference-strength | covered | "estrictas la 1, 8 y 9; el resto por defecto" → HARD: paleta salvia y crema, sin popups, sin colores fuera de paleta. DEFAULT: Nunito, espaciosa, solo claro, tono, código inglés/comentarios español, Conventional Commits. |

Phase D sweep: "no, sigue con el roadmap" → clean. Phase D closed.

## Phase 6 — Roadmap

Propuesta de 16 specs confirmada ("confirmado, guarda el orden como prioridad"). Fase 1 (MVP): 001–011. Posteriores: 012–016. Priority = orden de fila.

## Phase 7 — Spec requirements

Elección: "B, que las redacte advance" → requirements de 001–016 los redacta specloop:advance (Phase 0.5). Phase 7 Q&A no ejecutada.

Open/skipped al cierre: brand-refs (skipped). Sub-detalles TBD: escala tipográfica; aspecto del PDF.

### 001 — project-setup

| dimension | status | answer summary or skip reason |
|---|---|---|
| 001.what | covered | Base repo: main, React+Vite+TS PWA, pnpm, ESLint/Prettier, Vitest, .env.example, CI, tokens paleta + Nunito (drafted by advance; standard-derived: no) |
| 001.serves | covered | Agente en specs 003,005,006–016; usuario (dev local + CI) (drafted by advance; standard-derived: no) |
| 001.constraints | covered | Node 24 LTS; vite-plugin-pwa manifest/iconos/HTTPS; CI continue-on-error; setup-node + pnpm/action-setup; sin secretos (drafted by advance; standard-derived: yes) |
| 001.acceptance | covered | main por defecto; lint/test/build ok; pantalla crema+Nunito; instalable en Chrome; CI no bloqueante (drafted by advance; standard-derived: yes) |
| 001.out-of-scope | covered | Supabase, acceso, Cloudflare, pantallas, iconos definitivos (drafted by advance; standard-derived: no) |
| 001.dependencies | covered | Ninguna; requiere repo GitHub remoto (usuario) (drafted by advance; standard-derived: no) |
| 001.owner-split | covered | human: repo GitHub + iconos definitivos; agent: resto (drafted by advance; standard-derived: no) |

### 002 — supabase-tooling

| dimension | status | answer summary or skip reason |
|---|---|---|
| 002.what | covered | Supabase CLI enlazada (db push) + MCP Supabase en Claude Code (drafted by advance; standard-derived: no) |
| 002.serves | covered | Agente (003+ migraciones, consultas); usuario no aplica migraciones a mano (drafted by advance; standard-derived: no) |
| 002.constraints | covered | Solo proyecto jojumjyqxpqzaslbxrso; CLI por env vars no interactiva; secretos solo locales; MCP project_ref + read_only (drafted by advance; standard-derived: yes) |
| 002.acceptance | covered | CLI sin login interactivo; link + config.toml; /mcp conectado + lectura ok; escritura rechazada; sin secretos en git (drafted by advance; standard-derived: yes) |
| 002.out-of-scope | covered | Tablas/migraciones reales (003); .env.local app; MCP fuera del repo (drafted by advance; standard-derived: no) |
| 002.dependencies | covered | Ninguna en roadmap; proyecto creado + access token (drafted by advance; standard-derived: no) |
| 002.owner-split | covered | human: token, contraseña BD, env vars, aprobar/autenticar MCP; agent: init, link, registrar, verificar (drafted by advance; standard-derived: no) |

### 003 — database-schema

| dimension | status | answer summary or skip reason |
|---|---|---|
| 003.sheets-per-week (escape hatch) | covered | "B, puede haber varias por semana" → varias tablas por semana, cada una con sus comidas y su propio registro de agua/WC/pasos. |
| 003.what | covered | Migraciones: weekly_sheets, foods, meal_entries, daily_logs, sent_pdfs + RLS + bucket privado sent-pdfs (drafted by advance; standard-derived: no) |
| 003.serves | covered | 004, 006–016; protección datos del padre (drafted by advance; standard-derived: no) |
| 003.constraints | covered | owner_id/auth.uid RLS, updated_at, deleted_at, bucket privado por carpeta uid, db push, no destructivo, sin service_role en cliente (drafted by advance; standard-derived: yes) |
| 003.acceptance | covered | db push ok; 5 tablas RLS; anónimo sin acceso; aislamiento por usuario; 2 sheets mismo lunes (drafted by advance; standard-derived: no) |
| 003.out-of-scope | covered | Acceso (004), peso/km (012/014), sync (010), PDF (011), seed prod (drafted by advance; standard-derived: no) |
| 003.dependencies | covered | 001, 002; .env.local (drafted by advance; standard-derived: no) |
| 003.owner-split | covered | agent: migraciones+verificación; human: .env.local (drafted by advance; standard-derived: no) |

### 004 — access-code

| dimension | status | answer summary or skip reason |
|---|---|---|
| 004.what | covered | Pantalla de código único; 1 usuario Supabase Auth (email fijo + código); sesión persistente (drafted by advance; standard-derived: no) |
| 004.serves | covered | Padre; 006–016 y RLS (drafted by advance; standard-derived: no) |
| 004.constraints | covered | VITE_ACCESS_EMAIL; signup desactivado; código ≥8 (NIST); persistSession + onAuthStateChange, cliente único; sin popups; rutas protegidas (drafted by advance; standard-derived: yes) |
| 004.acceptance | covered | Código ok/ko; persiste tras reinicio; móvil+PC; signUp rechazado; cerrar sesión discreto (drafted by advance; standard-derived: no) |
| 004.out-of-scope | covered | Recuperar/cambiar código en app; OAuth; multiusuario (drafted by advance; standard-derived: no) |
| 004.dependencies | covered | 003 (drafted by advance; standard-derived: no) |
| 004.owner-split | covered | human: crear usuario, código, desactivar signup, env; agent: resto (drafted by advance; standard-derived: no) |

### 005 — cloudflare-deploy

| dimension | status | answer summary or skip reason |
|---|---|---|
| 005.what | covered | Cloudflare Pages + Git: main→prod, ramas→preview, HTTPS (drafted by advance; standard-derived: no) |
| 005.serves | covered | Padre (URL instalable), usuario (previews), 006–016 (drafted by advance; standard-derived: no) |
| 005.constraints | covered | Free; Git integration; pnpm build→dist; Node 24 (.nvmrc/NODE_VERSION, unverified); VITE_* vars en panel; _redirects SPA; sin secretos (drafted by advance; standard-derived: yes) |
| 005.acceptance | covered | Auto-deploy main; preview por rama; HTTPS + instalable Android; sin 404 en rutas; sin sb_secret en bundle (drafted by advance; standard-derived: no) |
| 005.out-of-scope | covered | Dominio propio; CI bloqueante; funcionalidad (drafted by advance; standard-derived: no) |
| 005.dependencies | covered | 001 (drafted by advance; standard-derived: no) |
| 005.owner-split | covered | human: cuenta, GitHub auth, proyecto Pages, variables; agent: _redirects, docs, verificación (drafted by advance; standard-derived: no) |

### 006 — weekly-table

| dimension | status | answer summary or skip reason |
|---|---|---|
| 006.what | covered | Dashboard semanal: cabecera, 7×5 + filas seguimiento, historial, crear/duplicar/eliminar (drafted by advance; standard-derived: no) |
| 006.serves | covered | Padre; 007, 008, 009, 011 (drafted by advance; standard-derived: no) |
| 006.constraints | covered | Auto-crear semana actual; no borrar única; duplicar solo comidas; soft delete + deshacer sin popup; móvil 1 día + tira, PC 7 cols; táctil 48dp; estilo (drafted by advance; standard-derived: yes) |
| 006.acceptance | covered | Semana actual correcta; responsive sin scroll horizontal; editar menú en historial; duplicar; eliminar/deshacer (drafted by advance; standard-derived: no) |
| 006.out-of-scope | covered | 007, 008, 009 edición, 010, 011 (drafted by advance; standard-derived: no) |
| 006.dependencies | covered | 004; tablas 003 (drafted by advance; standard-derived: no) |
| 006.owner-split | covered | agent: desarrollo; human: revisión visual y prueba (drafted by advance; standard-derived: no) |

### 007 — meal-entry

| dimension | status | answer summary or skip reason |
|---|---|---|
| 007.what | covered | Panel integrado para añadir/editar comidas: nombre+cantidad+unidad, +/−, sugerencias, catálogo, favoritos (drafted by advance; standard-derived: no) |
| 007.serves | covered | Padre; 008, 011, 015 (drafted by advance; standard-derived: no) |
| 007.constraints | covered | Sin modal; combobox APG; búsqueda sin tildes; favoritos/más usadas; sin duplicados; pasos +/−; lista de unidades; varias por celda; deshacer (drafted by advance; standard-derived: yes) |
| 007.acceptance | covered | Añadir y persistir; sugerencia + ajustar cantidad; búsqueda sin tilde; favoritos primero; quitar con deshacer sin popup (drafted by advance; standard-derived: no) |
| 007.out-of-scope | covered | Arrastrar (008); nutrición/fotos; borrar del catálogo; offline (010) (drafted by advance; standard-derived: no) |
| 007.dependencies | covered | 006; tablas foods/meal_entries (drafted by advance; standard-derived: no) |
| 007.owner-split | covered | agent: desarrollo; human: prueba con el padre (drafted by advance; standard-derived: no) |

### 008 — drag-and-drop

| dimension | status | answer summary or skip reason |
|---|---|---|
| 008.what | covered | Arrastrar comidas entre celdas y reordenar; alternativa "Mover a…" (drafted by advance; standard-derived: no) |
| 008.serves | covered | Padre; 011, 015 (drafted by advance; standard-derived: no) |
| 008.constraints | covered | WCAG 2.5.7 alternativa; dnd-kit 250ms/5px touch-action; soltar en tira de días; actualiza day/slot/position; deshacer; paleta (drafted by advance; standard-derived: yes) |
| 008.acceptance | covered | PC drag; Android long-press a otro día sin romper scroll; Mover a…; reordenar; deshacer (drafted by advance; standard-derived: no) |
| 008.out-of-scope | covered | Entre tablas/semanas; filas seguimiento; copiar arrastrando (drafted by advance; standard-derived: no) |
| 008.dependencies | covered | 007 (drafted by advance; standard-derived: no) |
| 008.owner-split | covered | agent: desarrollo; human: prueba en móvil (drafted by advance; standard-derived: no) |

### 009 — daily-tracking

| dimension | status | answer summary or skip reason |
|---|---|---|
| 009.what | covered | Agua (L), WC (pis/caca), pasos por día de la tabla (drafted by advance; standard-derived: no) |
| 009.serves | covered | Padre; nutricionista vía 011; 012, 014, 015 (drafted by advance; standard-derived: no) |
| 009.constraints | covered | Por tabla y día; agua ±0,25 L coma decimal; WC dos contadores; pasos inputmode numeric con miles; vacío≠0; aviso suave fuera de rango; 48dp sin popup (drafted by advance; standard-derived: yes) |
| 009.acceptance | covered | Agua 1,5 L persiste; WC 5/1; pasos 8.500 con teclado numérico; vacío; independencia entre tablas (drafted by advance; standard-derived: no) |
| 009.out-of-scope | covered | Peso, km, lectura automática de pasos, objetivos (drafted by advance; standard-derived: no) |
| 009.dependencies | covered | 006; daily_logs (drafted by advance; standard-derived: no) |
| 009.owner-split | covered | agent: desarrollo; human: prueba (drafted by advance; standard-derived: no) |

### 010 — offline-sync

| dimension | status | answer summary or skip reason |
|---|---|---|
| 010.what | covered | Offline + sync automático + indicador de estado (drafted by advance; standard-derived: no) |
| 010.serves | covered | Padre; usuario (observabilidad); 011–016 (drafted by advance; standard-derived: no) |
| 010.constraints | covered | Dexie/IndexedDB; outbox con backoff+jitter sin Background Sync; LWW updated_at + tombstones; pull incremental; storage.persist; indicador sin popup (drafted by advance; standard-derived: yes) |
| 010.acceptance | covered | Modo avión funciona; sync <1 min; PC→móvil; conflicto LWW sin pérdidas; error visible y reintento (drafted by advance; standard-derived: no) |
| 010.out-of-scope | covered | Realtime/CRDT; PDF offline; peso/km (drafted by advance; standard-derived: no) |
| 010.dependencies | covered | 007, 009; 003, 001 (drafted by advance; standard-derived: no) |
| 010.owner-split | covered | agent: desarrollo; human: pruebas modo avión/2 dispositivos (drafted by advance; standard-derived: no) |

### 011 — pdf-export

| dimension | status | answer summary or skip reason |
|---|---|---|
| 011.what | covered | PDF de la tabla (réplica del papel), compartir/descargar, archivo de cada PDF enviado (drafted by advance; standard-derived: no) |
| 011.serves | covered | Nutricionista; padre; 013 (drafted by advance; standard-derived: no) |
| 011.constraints | covered | @react-pdf/renderer + Nunito; A4 apaisado 1 página; legible en B/N; Web Share con fallback descarga; subida a sent-pdfs + sent_pdfs; nombre legible; requiere conexión (drafted by advance; standard-derived: yes) |
| 011.acceptance | covered | Share Android; descarga PC; contenido completo A4; historial inmutable; sin conexión avisa (drafted by advance; standard-derived: no) |
| 011.out-of-scope | covered | Imagen (013); envío automático; peso/km/estadísticas (drafted by advance; standard-derived: no) |
| 011.dependencies | covered | 006, 009; 003 (drafted by advance; standard-derived: no) |
| 011.owner-split | covered | agent: desarrollo; human: revisión del PDF (drafted by advance; standard-derived: no) |

### 012 — weight-tracking

| dimension | status | answer summary or skip reason |
|---|---|---|
| 012.what | covered | Peso por fecha (kg), fila Peso, media semanal (drafted by advance; standard-derived: no) |
| 012.serves | covered | Padre; nutricionista (PDF); 015, 016 (drafted by advance; standard-derived: no) |
| 012.constraints | covered | weight_logs por fecha; kg 1 decimal ±0,1, inputmode decimal, último por defecto; recordatorio pesaje matinal; tendencia semanal; PDF + sync; no destructivo (drafted by advance; standard-derived: yes) |
| 012.acceptance | covered | Por fecha en todas las tablas; propone último; media semanal; PDF; offline (drafted by advance; standard-derived: no) |
| 012.out-of-scope | covered | Gráficas (015), evaluación (016), básculas, otras medidas (drafted by advance; standard-derived: no) |
| 012.dependencies | covered | 009; en la práctica 010 y 011 (no en roadmap) (drafted by advance; standard-derived: no) |
| 012.owner-split | covered | agent: todo; human: prueba (drafted by advance; standard-derived: no) |

### 013 — image-export

| dimension | status | answer summary or skip reason |
|---|---|---|
| 013.what | covered | Compartir semana como PNG idéntico al PDF (drafted by advance; standard-derived: no) |
| 013.serves | covered | Padre y nutricionista (WhatsApp) (drafted by advance; standard-derived: no) |
| 013.constraints | covered | pdfjs-dist + toBlob; ~200 DPI; Web Share/descarga; archivar en sent-pdfs con formato; requiere conexión (drafted by advance; standard-derived: yes) |
| 013.acceptance | covered | Share PNG Android; igual al PDF legible; en historial como imagen; descarga PC (drafted by advance; standard-derived: no) |
| 013.out-of-scope | covered | Anotar; otros formatos (drafted by advance; standard-derived: no) |
| 013.dependencies | covered | 011; migración formato en sent_pdfs (drafted by advance; standard-derived: no) |
| 013.owner-split | covered | agent: desarrollo; human: comprobar en WhatsApp (drafted by advance; standard-derived: no) |

### 014 — steps-km

| dimension | status | answer summary or skip reason |
|---|---|---|
| 014.what | covered | Km junto a pasos: estimado por altura o manual (drafted by advance; standard-derived: no) |
| 014.serves | covered | Padre, nutricionista; 015 (drafted by advance; standard-derived: no) |
| 014.constraints | covered | Paso = altura×0,415; altura en Ajustes; manual sustituye, ≈ para estimado; km_manual + ajustes; PDF + sync (drafted by advance; standard-derived: yes) |
| 014.acceptance | covered | 175cm/8500 → ≈6,2; manual 6,4; sin altura invita; PDF (drafted by advance; standard-derived: no) |
| 014.out-of-scope | covered | Lectura automática; calorías (drafted by advance; standard-derived: no) |
| 014.dependencies | covered | 009; en la práctica 010, 011 (drafted by advance; standard-derived: no) |
| 014.owner-split | covered | agent: desarrollo; human: altura y comparación (drafted by advance; standard-derived: no) |

### 015 — stats-dashboard

| dimension | status | answer summary or skip reason |
|---|---|---|
| 015.what | covered | Dashboard de estadísticas día/semana/mes: peso, agua, WC, ejercicio, comidas; explorable (drafted by advance; standard-derived: no) |
| 015.serves | covered | Padre; 016 (drafted by advance; standard-derived: no) |
| 015.constraints | covered | Selector periodo + flechas; secciones; recharts; ≤2 series paleta HARD; mobile-first; detalle en línea; offline; huecos≠0 (drafted by advance; standard-derived: yes) |
| 015.acceptance | covered | Peso mes + punto; agua semana; top 5 comidas; navegación; Android legible offline (drafted by advance; standard-derived: no) |
| 015.out-of-scope | covered | Evaluación (016); exportar; nutrición (drafted by advance; standard-derived: no) |
| 015.dependencies | covered | 012; en la práctica 009, 010, 014 (drafted by advance; standard-derived: no) |
| 015.owner-split | covered | agent: desarrollo; human: revisión con el padre (drafted by advance; standard-derived: no) |

### 016 — progress-evaluation

| dimension | status | answer summary or skip reason |
|---|---|---|
| 016.evaluation-criteria (escape hatch) | covered | "C, objetivos de la nutricionista y referencias por defecto" → objetivos en Ajustes (de la nutricionista); si falta alguno, referencias generales orientativas. |
| 016.what | covered | Semáforo bien/regular/a mejorar vs objetivos de la nutricionista o referencias generales (drafted by advance; standard-derived: no) |
| 016.serves | covered | Padre; cierre de done-when (drafted by advance; standard-derived: no) |
| 016.constraints | covered | Objetivos en Ajustes; defaults NHS 0,5–1 kg/sem, EFSA→2 L, 8.000 pasos; medias semanales; WC/comidas sin juicio; tono amable; no solo color; offline (drafted by advance; standard-derived: yes) |
| 016.acceptance | covered | Peso bien con referencia; objetivo agua sustituye; pasos a mejorar; día malo no cambia semana; texto/icono (drafted by advance; standard-derived: no) |
| 016.out-of-scope | covered | Consejos médicos; notificaciones; juzgar comidas (drafted by advance; standard-derived: no) |
| 016.dependencies | covered | 015; datos 009, 012, 014 (drafted by advance; standard-derived: no) |
| 016.owner-split | covered | human: objetivos + tono; agent: desarrollo (drafted by advance; standard-derived: no) |
