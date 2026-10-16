// Acceso a datos de las tablas semanales (spec 006).
// Funciones async sobre el cliente único de Supabase; siempre filtran las filas
// borradas (deleted_at is null) salvo restoreSheet. Si Supabase devuelve error,
// se lanza un Error con mensaje en español. La spec 010 sustituirá este módulo
// por dentro (capa offline) sin cambiar su API.

import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'
import { type IsoDate, isMonday, mondayOf, todayIso } from './week'

export type WeeklySheet = Tables<'weekly_sheets'>
export type DailyLog = Tables<'daily_logs'>

export type MealSlot = 'breakfast' | 'mid_morning' | 'lunch' | 'afternoon_snack' | 'dinner'

/** Los 5 momentos del día, en orden, con su etiqueta en español. */
export const MEAL_SLOTS: readonly { slot: MealSlot; label: string }[] = [
  { slot: 'breakfast', label: 'Desayuno' },
  { slot: 'mid_morning', label: 'Media mañana' },
  { slot: 'lunch', label: 'Comida' },
  { slot: 'afternoon_snack', label: 'Media tarde' },
  { slot: 'dinner', label: 'Cena' },
]

const SLOT_ORDER = new Map<string, number>(MEAL_SLOTS.map(({ slot }, i) => [slot, i]))

/** Comida apuntada en una celda, con el nombre del alimento ya resuelto. */
export type MealEntryWithFood = {
  id: string
  day_of_week: number
  meal_slot: MealSlot
  quantity: number | null
  unit: string | null
  position: number
  food_id: string
  food_name: string
}

export type SheetDetail = {
  sheet: WeeklySheet
  meals: MealEntryWithFood[]
  dailyLogs: DailyLog[]
}

export type SheetsByWeek = { monday: IsoDate; sheets: WeeklySheet[] }

type SupabaseError = { message: string } | null

/** Lanza un Error en español si la respuesta de Supabase trae error. */
function check(error: SupabaseError, action: string): void {
  if (error) {
    throw new Error(`No se ha podido ${action}: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Tabla de la semana actual
// ---------------------------------------------------------------------------

// Promesas en curso por lunes: evita crear dos tablas si se llama dos veces a
// la vez (p. ej. el doble montaje de React StrictMode).
const inFlight = new Map<IsoDate, Promise<WeeklySheet>>()

/** Solo para tests: olvida las promesas en curso. */
export function __resetForTests(): void {
  inFlight.clear()
}

/** La tabla más reciente de la semana de `today`; si no hay ninguna, crea una vacía. */
export function getOrCreateCurrentSheet(today: IsoDate = todayIso()): Promise<WeeklySheet> {
  const monday = mondayOf(today)
  const pending = inFlight.get(monday)
  if (pending) return pending

  const promise = (async () => {
    const { data, error } = await supabase
      .from('weekly_sheets')
      .select('*')
      .eq('start_date', monday)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
    check(error, 'cargar la tabla de esta semana')
    if (data && data.length > 0) return data[0]

    const inserted = await supabase
      .from('weekly_sheets')
      .insert({ start_date: monday })
      .select()
      .single()
    check(inserted.error, 'crear la tabla de esta semana')
    return inserted.data as WeeklySheet
  })()

  inFlight.set(monday, promise)
  // Se limpia tanto si sale bien como si falla (para poder reintentar)
  const clear = () => {
    if (inFlight.get(monday) === promise) inFlight.delete(monday)
  }
  promise.then(clear, clear)
  return promise
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

/** Una tabla con sus comidas (con nombre) y sus registros diarios. null si no existe o está borrada. */
export async function getSheet(id: string): Promise<SheetDetail | null> {
  const sheetRes = await supabase
    .from('weekly_sheets')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  check(sheetRes.error, 'cargar la tabla')
  if (!sheetRes.data) return null

  const [mealsRes, logsRes] = await Promise.all([
    supabase
      .from('meal_entries')
      .select('id, day_of_week, meal_slot, quantity, unit, position, food_id, foods(name)')
      .eq('sheet_id', id)
      .is('deleted_at', null)
      .order('day_of_week')
      .order('meal_slot')
      .order('position'),
    supabase
      .from('daily_logs')
      .select('*')
      .eq('sheet_id', id)
      .is('deleted_at', null)
      .order('day_of_week'),
  ])
  check(mealsRes.error, 'cargar las comidas de la tabla')
  check(logsRes.error, 'cargar el agua, WC y pasos de la tabla')

  const meals: MealEntryWithFood[] = (mealsRes.data ?? []).map((row) => {
    const { foods, ...rest } = row
    return { ...rest, meal_slot: rest.meal_slot as MealSlot, food_name: foods?.name ?? '' }
  })
  // meal_slot es texto: en la BD se ordena alfabéticamente. Aquí se reordena
  // por el orden real de los momentos del día (sort estable: respeta position).
  meals.sort(
    (a, b) =>
      a.day_of_week - b.day_of_week ||
      (SLOT_ORDER.get(a.meal_slot) ?? 99) - (SLOT_ORDER.get(b.meal_slot) ?? 99) ||
      a.position - b.position,
  )

  return { sheet: sheetRes.data, meals, dailyLogs: logsRes.data ?? [] }
}

/** Todas las tablas no borradas, de la más reciente a la más antigua. */
export async function listSheets(): Promise<WeeklySheet[]> {
  const { data, error } = await supabase
    .from('weekly_sheets')
    .select('*')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false })
  check(error, 'cargar el historial de tablas')
  return data ?? []
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

/** Cambia el nº de menú (entero > 0) o lo quita (null). */
export async function updateMenuNumber(id: string, menuNumber: number | null): Promise<void> {
  if (menuNumber !== null && (!Number.isInteger(menuNumber) || menuNumber <= 0)) {
    throw new Error('El número de menú debe ser un número entero mayor que 0.')
  }
  const { error } = await supabase
    .from('weekly_sheets')
    .update({ menu_number: menuNumber })
    .eq('id', id)
    .is('deleted_at', null)
  check(error, 'guardar el número de menú')
}

/** Crea una tabla vacía en la semana que empieza en `monday`. */
export async function createSheet(monday: IsoDate): Promise<WeeklySheet> {
  if (!isMonday(monday)) {
    throw new Error(`La semana debe empezar en lunes (recibido: ${monday}).`)
  }
  const { data, error } = await supabase
    .from('weekly_sheets')
    .insert({ start_date: monday })
    .select()
    .single()
  check(error, 'crear la tabla')
  return data as WeeklySheet
}

/** Duplica una tabla (nº de menú y comidas, no agua/WC/pasos) en la semana `monday`. Devuelve el id nuevo. */
export async function duplicateSheet(id: string, monday: IsoDate): Promise<string> {
  const { data, error } = await supabase.rpc('duplicate_weekly_sheet', {
    source_id: id,
    target_start: monday,
  })
  check(error, 'duplicar la tabla')
  return data as string
}

/** Borrado suave. No deja eliminar la única tabla de su semana. */
export async function softDeleteSheet(id: string): Promise<void> {
  const sheetRes = await supabase
    .from('weekly_sheets')
    .select('id, start_date')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  check(sheetRes.error, 'eliminar la tabla')
  if (!sheetRes.data) {
    throw new Error('No se encuentra la tabla que quieres eliminar.')
  }

  const weekRes = await supabase
    .from('weekly_sheets')
    .select('id')
    .eq('start_date', sheetRes.data.start_date)
    .is('deleted_at', null)
  check(weekRes.error, 'eliminar la tabla')
  if ((weekRes.data ?? []).length <= 1) {
    throw new Error('Es la única tabla de esta semana')
  }

  const { error } = await supabase
    .from('weekly_sheets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  check(error, 'eliminar la tabla')
}

/** Deshace un borrado suave. */
export async function restoreSheet(id: string): Promise<void> {
  const { error } = await supabase.from('weekly_sheets').update({ deleted_at: null }).eq('id', id)
  check(error, 'recuperar la tabla')
}

// ---------------------------------------------------------------------------
// Helpers puros (historial)
// ---------------------------------------------------------------------------

/**
 * Agrupa las tablas por semana, de la más reciente a la más antigua. Dentro de
 * cada semana, la más reciente (created_at) primero.
 */
export function groupSheetsByWeek(sheets: readonly WeeklySheet[]): SheetsByWeek[] {
  const groups = new Map<IsoDate, WeeklySheet[]>()
  for (const sheet of sheets) {
    const list = groups.get(sheet.start_date)
    if (list) list.push(sheet)
    else groups.set(sheet.start_date, [sheet])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([monday, list]) => ({
      monday,
      sheets: [...list].sort((a, b) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      ),
    }))
}

/** true si `sheet` es la única tabla no borrada de su semana dentro de `sheets`. */
export function isOnlySheetOfWeek(sheet: WeeklySheet, sheets: readonly WeeklySheet[]): boolean {
  return !sheets.some(
    (other) =>
      other.id !== sheet.id && other.start_date === sheet.start_date && other.deleted_at === null,
  )
}
