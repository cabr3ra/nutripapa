// Acceso a datos de las comidas (spec 007): catálogo de comidas y entradas de
// la tabla semanal. Funciones async sobre el cliente único de Supabase; siempre
// filtran las filas borradas (deleted_at is null) salvo restoreEntry. Si Supabase
// devuelve error, se lanza un Error con mensaje en español. La spec 010
// sustituirá este módulo por dentro (capa offline) sin cambiar su API.

import { supabase } from '../../lib/supabase'
import type { Database, Tables } from '../../lib/database.types'
import { MEAL_SLOTS, type MealEntryWithFood, type MealSlot } from '../weekly-sheets/api'
import { type SearchableFood, findExactMatch } from './normalize'
import { planMove } from './position'

export type Food = Tables<'foods'>

/** Veces que se ha apuntado cada comida (por food_id) en cada momento del día. */
export type FoodUsage = Map<string, Partial<Record<MealSlot, number>>>

export type SaveMealEntryInput = {
  /** Si viene, se edita esa entrada; si no, se crea una nueva al final de la celda. */
  entryId?: string
  sheetId: string
  dayOfWeek: number
  mealSlot: MealSlot
  /** Comida elegida del catálogo (exactamente uno de foodId / foodName). */
  foodId?: string
  /** Nombre de una comida nueva (exactamente uno de foodId / foodName). */
  foodName?: string
  quantity: number | null
  unit: string | null
}

/** Resultado de resolveFoodForName: comida existente o nombre para crear una nueva. */
export type ResolvedFood = { foodId: string } | { foodName: string }

type SupabaseError = { message: string; code?: string } | null

/** Lanza un Error en español si la respuesta de Supabase trae error. */
function check(error: SupabaseError, action: string): void {
  if (error) {
    throw new Error(`No se ha podido ${action}: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Catálogo de comidas no borradas, por orden de nombre. */
export async function listFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  check(error, 'cargar tus comidas')
  return data ?? []
}

/** Cuenta cuántas veces se ha apuntado cada comida en cada momento del día. */
export async function getFoodUsage(): Promise<FoodUsage> {
  const { data, error } = await supabase
    .from('meal_entries')
    .select('food_id, meal_slot')
    .is('deleted_at', null)
  check(error, 'cargar las comidas que más tomas')

  const usage: FoodUsage = new Map()
  for (const row of data ?? []) {
    const slot = row.meal_slot as MealSlot
    const counts = usage.get(row.food_id) ?? {}
    counts[slot] = (counts[slot] ?? 0) + 1
    usage.set(row.food_id, counts)
  }
  return usage
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

/**
 * Las comidas más apuntadas en `slot`: de más a menos veces y, a igualdad, por
 * nombre (orden alfabético español). Solo incluye comidas usadas al menos una vez.
 */
export function topFoodsForSlot<T extends { id: string; name: string }>(
  usage: FoodUsage,
  foods: readonly T[],
  slot: MealSlot,
  limit = 6,
): T[] {
  if (limit <= 0) return []
  const timesOf = (food: T) => usage.get(food.id)?.[slot] ?? 0
  return foods
    .filter((food) => timesOf(food) > 0)
    .sort((a, b) => timesOf(b) - timesOf(a) || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}

/**
 * Decide si un nombre escrito corresponde a una comida que ya existe. La BD solo
 * compara sin mayúsculas; aquí además se ignoran tildes y espacios, para que
 * "platano" reutilice "Plátano" en vez de crear un duplicado.
 */
export function resolveFoodForName<T extends { id: string; name: string }>(
  catalog: readonly SearchableFood<T>[],
  name: string,
): ResolvedFood {
  const match = findExactMatch(catalog, name)
  return match ? { foodId: match.id } : { foodName: name.trim() }
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

type SaveMealEntryArgs = Database['public']['Functions']['save_meal_entry']['Args']

/** Guarda (crea o edita) una comida apuntada de forma atómica. Devuelve el id de la entrada. */
export async function saveMealEntry(input: SaveMealEntryInput): Promise<string> {
  const hasId = input.foodId !== undefined && input.foodId !== ''
  const hasName = input.foodName !== undefined && input.foodName.trim() !== ''
  if (hasId === hasName) {
    throw new Error(
      'Indica una comida: elige una del catálogo o escribe su nombre (solo una de las dos).',
    )
  }

  const args = {
    p_entry_id: input.entryId ?? null,
    p_sheet_id: input.sheetId,
    p_day_of_week: input.dayOfWeek,
    p_meal_slot: input.mealSlot,
    p_food_id: hasId ? (input.foodId ?? null) : null,
    p_food_name: hasName ? (input.foodName ?? null) : null,
    p_quantity: input.quantity,
    p_unit: input.unit,
  }
  // Los tipos generados declaran todos los p_* como no nulos (supabase gen types
  // no distingue parámetros opcionales de una función SQL), pero la función
  // acepta null en p_entry_id, p_food_id, p_food_name, p_quantity y p_unit.
  const { data, error } = await supabase.rpc(
    'save_meal_entry',
    args as unknown as SaveMealEntryArgs,
  )
  check(error, 'guardar la comida')
  return data as string
}

/** Borrado suave de una comida apuntada. */
export async function softDeleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('meal_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  check(error, 'quitar la comida')
}

/** Deshace el borrado suave de una comida apuntada. */
export async function restoreEntry(id: string): Promise<void> {
  const { error } = await supabase.from('meal_entries').update({ deleted_at: null }).eq('id', id)
  check(error, 'recuperar la comida')
}

// ---------------------------------------------------------------------------
// Mover comidas (spec 008)
// ---------------------------------------------------------------------------

/** Celda destino de un movimiento: día (1–7), momento y, opcional, antes de qué entrada. */
export type MoveTarget = {
  day: number
  slot: MealSlot
  /** Insertar antes de esta entrada; ausente (o no está en la celda) = al final. */
  beforeId?: string
}

/** Lo necesario para deshacer un movimiento: celda y posición originales de la entrada. */
export type MoveUndo = {
  entryId: string
  day: number
  slot: MealSlot
  position: number
}

const VALID_SLOTS: ReadonlySet<string> = new Set(MEAL_SLOTS.map(({ slot }) => slot))

/** Valida la celda destino; lanza un Error en español si no es válida. */
function validateCell(day: number, slot: string): void {
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    throw new Error('El día tiene que estar entre lunes y domingo.')
  }
  if (!VALID_SLOTS.has(slot)) {
    throw new Error('Elige un momento del día válido.')
  }
}

/** Ordena como planMove: por posición y, a igualdad, por id. */
function byPosition(a: { id: string; position: number }, b: { id: string; position: number }) {
  return a.position - b.position || a.id.localeCompare(b.id)
}

/** Actualiza la celda y la posición de una entrada no borrada (nunca cantidad, unidad ni comida). */
async function updatePlacement(
  id: string,
  day: number,
  slot: MealSlot,
  position: number,
  action: string,
): Promise<void> {
  const { error } = await supabase
    .from('meal_entries')
    .update({ day_of_week: day, meal_slot: slot, position })
    .eq('id', id)
    .is('deleted_at', null)
  check(error, action)
}

/**
 * Mueve una comida apuntada a otra celda (o a otro sitio de la misma celda).
 * `cellEntries` son las entradas actuales de la celda destino; si incluye la que
 * se mueve, se ignora. Caso normal: un único update de la fila movida (punto
 * medio entre sus vecinas). Si no queda hueco, se renumera la celda destino.
 * Devuelve la celda y posición ORIGINALES para poder deshacer.
 */
export async function moveEntry(
  entry: MealEntryWithFood,
  target: MoveTarget,
  cellEntries: readonly MealEntryWithFood[],
): Promise<MoveUndo> {
  validateCell(target.day, target.slot)

  const undo: MoveUndo = {
    entryId: entry.id,
    day: entry.day_of_week,
    slot: entry.meal_slot,
    position: entry.position,
  }

  const others = cellEntries.filter((e) => e.id !== entry.id)
  // beforeId que no está en la celda equivale a "al final" (igual que planMove).
  const beforeId = others.some((e) => e.id === target.beforeId) ? target.beforeId : undefined

  // Misma celda y mismo sitio relativo (o soltar sobre sí misma): no cambia nada.
  const sameCell = entry.day_of_week === target.day && entry.meal_slot === target.slot
  if (sameCell) {
    if (target.beforeId === entry.id) return undo
    const sorted = [...others, entry].sort(byPosition)
    const nextId = sorted[sorted.indexOf(entry) + 1]?.id
    if (nextId === beforeId) return undo
  }

  const plan = planMove({ cellEntries: others, movingId: entry.id, beforeId })
  const action = 'mover la comida'

  if ('renumber' in plan) {
    // Sin hueco: primero se recolocan las demás entradas de la celda destino, una
    // a una y en orden (una celda tiene pocas filas), y al final la que se mueve.
    const renumbered = [...plan.renumber].filter(([id]) => id !== entry.id)
    renumbered.sort((a, b) => a[1] - b[1])
    for (const [id, position] of renumbered) {
      await updatePlacement(id, target.day, target.slot, position, action)
    }
  }

  await updatePlacement(entry.id, target.day, target.slot, plan.position, action)
  return undo
}

/**
 * Deshace el último movimiento: devuelve la entrada a su día, momento y posición
 * originales con un único update. Si entre medias se renumeró la celda original,
 * esa posición puede quedar en otro sitio relativo y el orden variar levemente;
 * es aceptable para "deshacer el último movimiento".
 */
export async function undoMove(undo: MoveUndo): Promise<void> {
  await updatePlacement(undo.entryId, undo.day, undo.slot, undo.position, 'deshacer el movimiento')
}

/** Marca o desmarca una comida del catálogo como favorita. */
export async function setFavorite(foodId: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('foods')
    .update({ is_favorite: isFavorite })
    .eq('id', foodId)
    .is('deleted_at', null)
  check(error, 'guardar la favorita')
}

/** Corrige el nombre de una comida del catálogo. */
export async function renameFood(foodId: string, newName: string): Promise<void> {
  const name = newName.trim()
  if (name === '') {
    throw new Error('Escribe un nombre para la comida.')
  }
  const { error } = await supabase
    .from('foods')
    .update({ name })
    .eq('id', foodId)
    .is('deleted_at', null)
  // 23505 = violación de unicidad: ya hay otra comida con ese nombre
  if (error?.code === '23505') {
    throw new Error('Ya tienes una comida con ese nombre')
  }
  check(error, 'cambiar el nombre de la comida')
}
