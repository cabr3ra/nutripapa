/*
 * Unidades de cantidad compartidas (007 comidas). Va en un .ts aparte de
 * UnitPicker.tsx por la regla react-refresh/only-export-components.
 */

/** Lista corta de unidades que ofrece el selector (en este orden). */
export const UNITS = [
  'unidad',
  'rebanada',
  'taza',
  'cucharada',
  'vaso',
  'g',
  'ml',
  'ración',
] as const

export type ListedUnit = (typeof UNITS)[number]

/** Unidades que se miden de 10 en 10 con los botones + y −. */
const TEN_STEP_UNITS = new Set(['g', 'ml'])

/** ¿La unidad es una de la lista corta? */
export function isListedUnit(unit: string | null | undefined): unit is ListedUnit {
  return unit != null && (UNITS as readonly string[]).includes(unit)
}

/** Paso del Stepper según la unidad: 10 para g/ml, 1 para el resto. */
export function stepForUnit(unit: string | null | undefined): number {
  const normalized = (unit ?? '').trim().toLowerCase()
  return TEN_STEP_UNITS.has(normalized) ? 10 : 1
}
