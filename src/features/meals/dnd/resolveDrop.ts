// Lógica pura de "soltar" del drag-and-drop de comidas (spec 008): traduce el
// destino de dnd-kit (overId) a un MoveTarget de meals/api.ts. Se prueba sin
// simular el arrastre.
import type { MealEntryWithFood, MealSlot } from '../../weekly-sheets/api'
import type { MoveTarget } from '../api'
import { parseDropId } from './ids'

/** Comida de la tabla; `deleted_at` es opcional por si la lista trae borradas (p. ej. 010). */
export type DndMealEntry = MealEntryWithFood & { deleted_at?: string | null }

export type ResolveDropInput = {
  /** Comida que se está arrastrando. */
  activeEntry: MealEntryWithFood
  /** Id de dnd-kit de la zona sobre la que se suelta. */
  overId: string | number
  /** Todas las comidas de la tabla. */
  meals: readonly DndMealEntry[]
}

export type ResolvedDrop = {
  target: MoveTarget
  /** Entradas no borradas de la celda destino, ordenadas por posición, sin la activa. */
  cellEntries: MealEntryWithFood[]
}

/** Orden dentro de una celda: posición y, a igualdad, id (igual que planMove). */
function byPosition(a: MealEntryWithFood, b: MealEntryWithFood): number {
  return a.position - b.position || a.id.localeCompare(b.id)
}

function isLive(entry: DndMealEntry): boolean {
  return entry.deleted_at === undefined || entry.deleted_at === null
}

/**
 * Calcula a dónde va la comida al soltarla:
 * - sobre una celda → al final de esa celda;
 * - sobre otra comida → antes de ella, en SU celda. Excepción dentro de la misma
 *   celda: si la comida de destino está por debajo de la activa, queda justo
 *   después de ella (es lo que enseña la animación de `@dnd-kit/sortable` al bajar);
 * - sobre un día de la tira → mismo momento que la activa, al final de ese día.
 * Devuelve null si el destino no es válido, es la propia comida o el movimiento
 * no cambiaría nada.
 */
export function resolveDrop({ activeEntry, overId, meals }: ResolveDropInput): ResolvedDrop | null {
  const parsed = parseDropId(overId)
  if (parsed === null) return null

  let day: number
  let slot: MealSlot
  let overEntryId: string | undefined

  if (parsed.kind === 'cell') {
    day = parsed.day
    slot = parsed.slot
  } else if (parsed.kind === 'strip-day') {
    day = parsed.day
    slot = activeEntry.meal_slot
  } else {
    if (parsed.entryId === activeEntry.id) return null
    const over = meals.find((e) => e.id === parsed.entryId)
    if (over === undefined || !isLive(over)) return null
    day = over.day_of_week
    slot = over.meal_slot
    overEntryId = over.id
  }

  // Celda destino tal y como está ahora (con la activa si ya estaba en ella).
  const cell = meals
    .filter((e) => isLive(e) && e.day_of_week === day && e.meal_slot === slot)
    .sort(byPosition)
  const cellEntries = cell.filter((e) => e.id !== activeEntry.id)
  const sameCell = activeEntry.day_of_week === day && activeEntry.meal_slot === slot
  const activeIndex = sameCell ? cell.findIndex((e) => e.id === activeEntry.id) : -1

  let beforeId = overEntryId
  if (overEntryId !== undefined && activeIndex !== -1) {
    const overIndex = cell.findIndex((e) => e.id === overEntryId)
    // Bajando dentro de la celda: queda justo después de la comida de destino.
    if (activeIndex < overIndex) beforeId = cell[overIndex + 1]?.id
  }

  // Sin cambios si detrás quedaría la misma comida que ya tiene detrás.
  if (activeIndex !== -1 && cell[activeIndex + 1]?.id === beforeId) return null

  const target: MoveTarget = beforeId === undefined ? { day, slot } : { day, slot, beforeId }
  return { target, cellEntries }
}
