// Ids de arrastre y de destino del drag-and-drop de comidas (spec 008).
// Funciones puras: codifican y decodifican qué es cada elemento arrastrable o
// zona de destino a partir de su id de dnd-kit.
import { MEAL_SLOTS, type MealSlot } from '../../weekly-sheets/api'

const VALID_SLOTS: ReadonlySet<string> = new Set(MEAL_SLOTS.map(({ slot }) => slot))

/** Id de una comida apuntada (arrastrable y, a la vez, destino dentro de su celda). */
export function entryDragId(entryId: string): string {
  return `entry:${entryId}`
}

/** Id de una celda de la tabla (día + momento). */
export function cellDropId(day: number, slot: MealSlot): string {
  return `cell:${day}:${slot}`
}

/** Id de un botón de día de la tira L–D (móvil). */
export function stripDayDropId(day: number): string {
  return `strip-day:${day}`
}

export type ParsedDropId =
  | { kind: 'entry'; entryId: string }
  | { kind: 'cell'; day: number; slot: MealSlot }
  | { kind: 'strip-day'; day: number }

/** Día ISO válido (1 = lunes … 7 = domingo) a partir de texto; si no, null. */
function parseDay(text: string): number | null {
  return /^[1-7]$/.test(text) ? Number(text) : null
}

/** Decodifica un id de dnd-kit; devuelve null si no es de este módulo o no es válido. */
export function parseDropId(id: string | number): ParsedDropId | null {
  const text = String(id)

  if (text.startsWith('entry:')) {
    const entryId = text.slice('entry:'.length)
    return entryId === '' ? null : { kind: 'entry', entryId }
  }

  if (text.startsWith('cell:')) {
    const parts = text.slice('cell:'.length).split(':')
    if (parts.length !== 2) return null
    const day = parseDay(parts[0])
    const slot = parts[1]
    if (day === null || !VALID_SLOTS.has(slot)) return null
    return { kind: 'cell', day, slot: slot as MealSlot }
  }

  if (text.startsWith('strip-day:')) {
    const day = parseDay(text.slice('strip-day:'.length))
    return day === null ? null : { kind: 'strip-day', day }
  }

  return null
}
