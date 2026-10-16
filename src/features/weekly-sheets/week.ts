// Utilidades de fechas para las tablas semanales.
// Las fechas se manejan como texto ISO `YYYY-MM-DD` y se interpretan como día
// LOCAL sin hora. Toda la aritmética se hace con Date.UTC / getUTC*, así ni la
// zona horaria ni el cambio de hora (p. ej. 25-oct-2026) desplazan ningún día.

/** Fecha local sin hora en formato `YYYY-MM-DD`. */
export type IsoDate = string

/** Día de la semana ISO: 1 = lunes … 7 = domingo. */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Lunes de la semana 1 (inicio del uso de la app). */
export const WEEK_ONE_START: IsoDate = '2026-10-19'

const MS_PER_DAY = 86_400_000
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const
const DAY_NAMES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const
// Abreviaturas fijas (sin punto) para no depender de la versión de ICU
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

const monthLongFormat = new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', month: 'long' })

/** Convierte `YYYY-MM-DD` en milisegundos UTC de la medianoche de ese día. Lanza si es inválida. */
function toUtcMs(date: IsoDate): number {
  const match = typeof date === 'string' ? ISO_RE.exec(date) : null
  if (!match) {
    throw new Error(`Fecha no válida: "${String(date)}" (se esperaba YYYY-MM-DD)`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const ms = Date.UTC(year, month - 1, day)
  const check = new Date(ms)
  // Rechaza fechas inexistentes como 2026-02-30 (Date.UTC las desbordaría)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Fecha no válida: "${date}" (ese día no existe)`)
  }
  return ms
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function fromUtcMs(ms: number): IsoDate {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

function assertMonday(monday: IsoDate): void {
  if (!isMonday(monday)) {
    throw new Error(`Se esperaba un lunes: "${monday}"`)
  }
}

function assertDayOfWeek(day: number): asserts day is DayOfWeek {
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    throw new Error(`Día de la semana no válido: ${day} (se esperaba 1–7)`)
  }
}

/** Fecha de hoy según el reloj y la zona local del navegador. */
export function todayIso(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** Suma (o resta, si n < 0) días enteros a una fecha. */
export function addDays(date: IsoDate, n: number): IsoDate {
  if (!Number.isInteger(n)) {
    throw new Error(`Número de días no válido: ${n}`)
  }
  return fromUtcMs(toUtcMs(date) + n * MS_PER_DAY)
}

/** Día de la semana ISO (lunes = 1, domingo = 7). */
export function dayOfWeek(date: IsoDate): DayOfWeek {
  const jsDay = new Date(toUtcMs(date)).getUTCDay() // 0 = domingo
  return (jsDay === 0 ? 7 : jsDay) as DayOfWeek
}

/** Lunes de la semana (ISO) a la que pertenece la fecha. */
export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, 1 - dayOfWeek(date))
}

export function isMonday(date: IsoDate): boolean {
  return dayOfWeek(date) === 1
}

/** Diferencia en días enteros `to - from`. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY)
}

/**
 * Número de semana contando desde WEEK_ONE_START (semana 1).
 * Las semanas anteriores dan 0 o negativo. Acepta cualquier día de la semana.
 */
export function weekNumber(monday: IsoDate): number {
  return Math.floor(daysBetween(WEEK_ONE_START, mondayOf(monday)) / 7) + 1
}

/** Lunes de la semana con ese número (inverso de weekNumber). */
export function mondayOfWeekNumber(n: number): IsoDate {
  if (!Number.isInteger(n)) {
    throw new Error(`Número de semana no válido: ${n}`)
  }
  return addDays(WEEK_ONE_START, (n - 1) * 7)
}

/** Las 7 fechas de la semana, de lunes a domingo. */
export function weekDays(monday: IsoDate): IsoDate[] {
  assertMonday(monday)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function parts(date: IsoDate): { day: number; month: number; year: number; ms: number } {
  const ms = toUtcMs(date)
  const d = new Date(ms)
  return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear(), ms }
}

function monthLong(ms: number): string {
  return monthLongFormat.format(new Date(ms))
}

/**
 * Rango largo en español:
 * - mismo mes: "del 19 al 25 de octubre de 2026"
 * - cruza mes: "del 26 de octubre al 1 de noviembre de 2026"
 * - cruza año: "del 28 de diciembre de 2026 al 3 de enero de 2027"
 */
export function weekRangeLabel(monday: IsoDate): string {
  assertMonday(monday)
  const a = parts(monday)
  const b = parts(addDays(monday, 6))
  if (a.year !== b.year) {
    return `del ${a.day} de ${monthLong(a.ms)} de ${a.year} al ${b.day} de ${monthLong(b.ms)} de ${b.year}`
  }
  if (a.month !== b.month) {
    return `del ${a.day} de ${monthLong(a.ms)} al ${b.day} de ${monthLong(b.ms)} de ${b.year}`
  }
  return `del ${a.day} al ${b.day} de ${monthLong(b.ms)} de ${b.year}`
}

/** Rango corto para el historial: "19–25 oct" o "26 oct–1 nov" (sin año). */
export function weekShortLabel(monday: IsoDate): string {
  assertMonday(monday)
  const a = parts(monday)
  const b = parts(addDays(monday, 6))
  if (a.month === b.month) {
    return `${a.day}–${b.day} ${MONTH_SHORT[b.month]}`
  }
  return `${a.day} ${MONTH_SHORT[a.month]}–${b.day} ${MONTH_SHORT[b.month]}`
}

/**
 * Título "Semana N". Para semanas anteriores a la 1 (N ≤ 0) devuelve cadena
 * vacía: el diseño indica mostrarlas solo con el rango, y una cadena vacía es
 * falsy, así que la UI puede hacer `{title && <h2>{title}</h2>}` sin más.
 */
export function weekTitle(monday: IsoDate): string {
  const n = weekNumber(monday)
  return n >= 1 ? `Semana ${n}` : ''
}

/** Letra del día para la tira móvil: L M X J V S D. */
export function dayShortLetter(day: number): string {
  assertDayOfWeek(day)
  return DAY_LETTERS[day - 1]
}

/** Nombre del día en minúscula: lunes … domingo. */
export function dayName(day: number): string {
  assertDayOfWeek(day)
  return DAY_NAMES[day - 1]
}
