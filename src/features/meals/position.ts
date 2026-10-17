// Posiciones dispersas de las comidas dentro de una celda (spec 008).
// Funciones puras: un movimiento normal calcula el punto medio entre las vecinas
// y actualiza una sola fila; solo si no queda hueco se renumera la celda entera.
// `meal_entries.position` es `integer` (int4 de Postgres), así que toda posición
// resultante debe caber en ese rango.

/** Separación entre posiciones al crear o renumerar. */
export const POSITION_STEP = 1024

/** Límites de un `integer` (int4) de Postgres. */
export const INT4_MIN = -2147483648
export const INT4_MAX = 2147483647

/** Indica si una posición cabe en la columna `integer` de Postgres. */
export function fitsInt4(position: number): boolean {
  return Number.isInteger(position) && position >= INT4_MIN && position <= INT4_MAX
}

/**
 * Posición para añadir al final de una celda: máximo + STEP (celda vacía → 0).
 * Compatible con datos antiguos en 0, 1, 2…: tras 2 viene 1026.
 * No comprueba int4: para mover al final usa `planMove`, que renumera si hace falta.
 */
export function nextPosition(positions: readonly number[]): number {
  if (positions.length === 0) return 0
  return Math.max(...positions) + POSITION_STEP
}

/**
 * Entero estrictamente entre `before` y `after` (vecinas anterior y siguiente).
 * - Sin vecinas → 0.
 * - Solo `before` → before + STEP; solo `after` → after - STEP (puede ser negativa).
 * - Ambas → punto medio redondeado hacia abajo.
 * Devuelve `null` si no hay hueco (after - before < 2) o si el resultado no cabe
 * en int4: en ese caso hay que renumerar la celda.
 */
export function positionBetween(before: number | null, after: number | null): number | null {
  let position: number
  if (before === null && after === null) position = 0
  else if (after === null) position = (before as number) + POSITION_STEP
  else if (before === null) position = after - POSITION_STEP
  else {
    if (after - before < 2) return null
    position = Math.floor((before + after) / 2)
  }
  return fitsInt4(position) ? position : null
}

/** Renumera en el orden dado: 0, 1024, 2048… */
export function renumber(ids: readonly string[]): Map<string, number> {
  return new Map(ids.map((id, index) => [id, index * POSITION_STEP]))
}

export type CellEntry = { id: string; position: number }

export type MovePlan =
  /** Basta con actualizar la fila que se mueve. */
  | { position: number }
  /**
   * No hay hueco: actualizar todas las filas del mapa. Incluye la entrada que se
   * mueve (con su `movingId`), y `position` es la suya (igual que en el mapa).
   */
  | { renumber: Map<string, number>; position: number }

export type MoveInput = {
  /** Entradas de la celda destino, SIN la que se mueve (en cualquier orden). */
  cellEntries: readonly CellEntry[]
  /** Id de la entrada que se mueve: es su clave en el mapa de renumeración. */
  movingId: string
  /** Insertar antes de esta entrada; ausente (o no encontrada) = al final. */
  beforeId?: string
}

/**
 * Calcula dónde queda la entrada movida en la celda destino. Si cabe entre sus
 * vecinas, devuelve solo su posición; si no hay hueco (o se saldría de int4),
 * devuelve la renumeración de toda la celda en el orden final.
 */
export function planMove({ cellEntries, movingId, beforeId }: MoveInput): MovePlan {
  // Orden actual de la celda (posición y, a igualdad, id, para ser deterministas).
  const sorted = [...cellEntries].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  )
  const found = beforeId === undefined ? -1 : sorted.findIndex((e) => e.id === beforeId)
  const index = found === -1 ? sorted.length : found

  const before = index > 0 ? sorted[index - 1].position : null
  const after = index < sorted.length ? sorted[index].position : null
  const position = positionBetween(before, after)
  if (position !== null) return { position }

  const ids = sorted.map((e) => e.id)
  ids.splice(index, 0, movingId)
  const plan = renumber(ids)
  return { renumber: plan, position: plan.get(movingId) as number }
}
