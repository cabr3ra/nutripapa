// Formato de textos de la cuadrícula semanal (es-ES).
// Funciones puras, sin React, para poder testearlas y reutilizarlas.

import type { DailyLog, MealEntryWithFood } from './api'
import type { IsoDate } from './week'

// Abreviaturas fijas (sin punto), igual que en week.ts, para no depender de ICU
const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

const MONTH_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

// Cantidades: hasta 2 decimales con coma ("1,5")
const quantityFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })
// Pasos: 'always' para que también agrupe los de 4 cifras ("8.000"); es-ES por
// defecto no separa los miles por debajo de 10.000
const stepsFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
})

function dateParts(date: IsoDate): { day: number; month: number } {
  const [, month, day] = date.split('-').map(Number)
  return { day, month: month - 1 }
}

/** Fecha corta para cabeceras: "19 oct". */
export function dayMonthShort(date: IsoDate): string {
  const { day, month } = dateParts(date)
  return `${day} ${MONTH_SHORT[month]}`
}

/** Fecha larga para lectores de pantalla: "19 de octubre". */
export function dayMonthLong(date: IsoDate): string {
  const { day, month } = dateParts(date)
  return `${day} de ${MONTH_LONG[month]}`
}

export function formatQuantity(n: number): string {
  return quantityFormat.format(n)
}

/** "Tostada · 2 unidades"; si falta cantidad o unidad, muestra lo que haya. */
export function formatMealEntry(
  entry: Pick<MealEntryWithFood, 'food_name' | 'quantity' | 'unit'>,
): string {
  const amount = [
    entry.quantity != null ? formatQuantity(entry.quantity) : '',
    entry.unit?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return amount ? `${entry.food_name} · ${amount}` : entry.food_name
}

/** Agua en litros: "1,5 L". Vacío si no hay dato. */
export function formatWater(log: DailyLog | undefined): string {
  if (log?.water_liters == null) return ''
  return `${quantityFormat.format(log.water_liters)} L`
}

/** WC: "Pis 4 · Caca 1" (solo las partes que tengan dato). */
export function formatWc(log: DailyLog | undefined): string {
  if (!log) return ''
  const parts: string[] = []
  if (log.pee_count != null) parts.push(`Pis ${quantityFormat.format(log.pee_count)}`)
  if (log.poop_count != null) parts.push(`Caca ${quantityFormat.format(log.poop_count)}`)
  return parts.join(' · ')
}

/** Pasos con separador de miles: "8.000". */
export function formatSteps(log: DailyLog | undefined): string {
  if (log?.steps == null) return ''
  return stepsFormat.format(log.steps)
}
