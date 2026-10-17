// Lectura, formato y avisos de los datos diarios (agua, WC, pasos).
// Funciones puras, sin red ni React.

import type { DailyLog } from '../weekly-sheets/api'
import { formatSteps } from '../weekly-sheets/gridFormat'

/** Cuánto suman/restan los botones del agua: un vaso (0,25 L). */
export const WATER_STEP = 0.25
/** Límite duro del agua: la columna es numeric(4,2). */
export const WATER_MAX = 99.99
/** Por encima de esto se muestra un aviso suave (se puede guardar igual). */
export const WATER_WARN_ABOVE = 10
/** Por encima de esto se muestra un aviso suave (se puede guardar igual). */
export const STEPS_WARN_ABOVE = 100_000
// Límite de la columna integer de Postgres
const STEPS_MAX = 2_147_483_647

export type ParseStepsResult = { value: number | null } | { error: string }

// Entero sin separadores ("8500") o con miles es-ES en grupos de 3 ("8.500", "8 500")
const INTEGER_RE = /^(\d+|\d{1,3}([. ]\d{3})+)$/
// Algo que parece número pero no es un entero válido (decimales, signo)
const NUMBER_LIKE_RE = /^[+-]?(\d+([., ]\d+)*([.,]\d*)?|[.,]\d+)$/

/**
 * Lee los pasos escritos a mano. Vacío → null (sin dato).
 * Acepta "8500", "8.500" y "8 500"; rechaza decimales y negativos.
 */
export function parseSteps(text: string): ParseStepsResult {
  // Espacios duros (\u00a0, \u202f) que pueden venir al pegar un número formateado
  const trimmed = text.replace(/[\u00a0\u202f]/g, ' ').trim()
  if (trimmed === '') return { value: null }
  if (INTEGER_RE.test(trimmed)) {
    const value = Number(trimmed.replace(/[. ]/g, ''))
    if (value > STEPS_MAX) return { error: 'Ese número de pasos es demasiado grande' }
    return { value }
  }
  if (NUMBER_LIKE_RE.test(trimmed)) return { error: 'Escribe un número entero de pasos' }
  return { error: 'Escribe un número' }
}

/** Pasos para el campo editable: "8.500"; null → "". */
export function formatStepsInput(value: number | null): string {
  return value == null ? '' : formatSteps({ steps: value })
}

/** Error duro del agua (no deja guardar); null si el valor es válido o no hay dato. */
export function validateWater(value: number | null): string | null {
  if (value == null) return null
  if (!Number.isFinite(value) || value < 0 || value > WATER_MAX) {
    return 'El agua tiene que estar entre 0 y 99,99 L'
  }
  return null
}

/** Avisos suaves en línea para valores poco habituales; nunca bloquean el guardado. */
export function warningsFor(
  log: Pick<DailyLog, 'water_liters' | 'pee_count' | 'poop_count' | 'steps'>,
): string[] {
  const warnings: string[] = []
  if (log.water_liters != null && log.water_liters > WATER_WARN_ABOVE) {
    warnings.push('Más de 10 litros es mucho: revisa que esté bien apuntado.')
  }
  if (log.steps != null && log.steps > STEPS_WARN_ABOVE) {
    warnings.push('Más de 100.000 pasos es mucho: revisa que esté bien apuntado.')
  }
  return warnings
}
