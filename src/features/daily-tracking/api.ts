// Acceso a datos del seguimiento diario (spec 009): agua, WC y pasos de cada día
// de una tabla semanal. Un registro por tabla y día (único en BD por
// sheet_id + day_of_week), así que guardar es siempre un upsert. Si Supabase
// devuelve error, se lanza un Error con mensaje en español. La spec 010
// sustituirá este módulo por dentro (capa offline) sin cambiar su API.

import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'
import { WATER_MAX } from './parse'

export type DailyLog = Tables<'daily_logs'>

/** Datos editables de un día; null = "no apuntado" (distinto de 0). */
export type DailyLogValues = {
  water_liters: number | null
  pee_count: number | null
  poop_count: number | null
  steps: number | null
}

/** Máximo que cabe en la columna water_liters (numeric(4,2)); definido en parse.ts. */
export const MAX_WATER_LITERS = WATER_MAX

type SupabaseError = { message: string; code?: string } | null

/** Lanza un Error en español si la respuesta de Supabase trae error. */
function check(error: SupabaseError, action: string): void {
  if (error) {
    throw new Error(`No se ha podido ${action}: ${error.message}`)
  }
}

/** Comprueba en cliente lo mismo que los check de la BD, con mensajes claros. */
function validate(dayOfWeek: number, values: DailyLogValues): void {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    throw new Error('El día tiene que estar entre el lunes (1) y el domingo (7).')
  }

  const water = values.water_liters
  if (water !== null) {
    if (!Number.isFinite(water) || water < 0) {
      throw new Error('El agua no puede ser negativa.')
    }
    if (water > MAX_WATER_LITERS) {
      throw new Error('El agua no puede pasar de 99,99 litros.')
    }
  }

  const counters: [number | null, string][] = [
    [values.pee_count, 'Las veces de pis'],
    [values.poop_count, 'Las veces de caca'],
    [values.steps, 'Los pasos'],
  ]
  for (const [value, label] of counters) {
    if (value !== null && (!Number.isInteger(value) || value < 0)) {
      throw new Error(`${label} tienen que ser un número entero, 0 o más.`)
    }
  }
}

/**
 * Guarda los datos de un día de una tabla: crea el registro o lo actualiza si
 * ya existía (y lo recupera si estaba borrado, deleted_at = null).
 *
 * owner_id no se envía: lo pone la BD por defecto (auth.uid()). El upsert hace
 * INSERT … ON CONFLICT (sheet_id, day_of_week) DO UPDATE; las políticas RLS de
 * insert y update exigen que la tabla semanal sea del mismo dueño, así que una
 * fila de otro usuario en ese hueco no puede darse (fallaría por RLS).
 */
export async function saveDailyLog(
  sheetId: string,
  dayOfWeek: number,
  values: DailyLogValues,
): Promise<DailyLog> {
  validate(dayOfWeek, values)

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        sheet_id: sheetId,
        day_of_week: dayOfWeek,
        water_liters: values.water_liters,
        pee_count: values.pee_count,
        poop_count: values.poop_count,
        steps: values.steps,
        deleted_at: null,
      },
      { onConflict: 'sheet_id,day_of_week' },
    )
    .select()
    .single()
  check(error, 'guardar el seguimiento del día')
  return data as DailyLog
}
