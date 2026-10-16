# Styles

Strength: **HARD** = regla estricta · **DEFAULT** = por defecto, el agente puede desviarse justificándolo.

## Palette — HARD

| Token | Hex | Uso |
|---|---|---|
| `--color-bg` | `#F5EFE6` | Fondo (crema) |
| `--color-surface` | `#EDE8D0` | Superficies, tarjetas (beige) |
| `--color-primary` | `#9CAF88` | Cabeceras, selección (salvia) |
| `--color-accent` | `#E2725B` | Botones de acción, avisos (terracota) |
| `--color-text` | `#36454F` | Texto (carbón) |

- **HARD:** ningún color fuera de esta paleta.
- Contraste objetivo: WCAG AA (verificar combinaciones; salvia/terracota sobre crema pueden no llegar para texto).
- Fuente: opciones investigadas (Figma sage/green-sage, Madegood Designs).

## Typography — DEFAULT

- Nunito (Google Fonts) para toda la UI. Tamaño de texto normal.
- Escala tipográfica: TBD.

## Density & mode — DEFAULT

- Espaciosa: celdas y botones grandes, fáciles de tocar en móvil.
- Solo modo claro.

## Interaction

- **HARD:** sin ventanas emergentes / modales. Añadir o editar comidas con paneles integrados en la página.

## Tone — DEFAULT

- Español, tuteo, cercano y cálido. Emojis escasos.

## Devices & accessibility

- Android (móvil), Edge o Chrome (PC). PWA instalable en los tres.
- Texto tamaño normal, buen contraste (WCAG AA).

## Code conventions — DEFAULT

- Identificadores en inglés; comentarios en español.
- Conventional Commits (`feat: …`, `fix: …`).
- Estructura de carpetas a criterio del agente.

## Brand refs

Ninguna (skipped).
