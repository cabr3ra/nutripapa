// Cuadrícula semanal: 5 momentos de comida + agua, WC y pasos.
// Es una <table> real (caption, th de columna y de fila) para que los lectores
// de pantalla anuncien día y momento en cada celda. El responsive es solo CSS:
// se pintan siempre las 7 columnas y en móvil (< 48rem) se ocultan las de los
// días no elegidos con display:none (que también las saca del árbol accesible).
// Así no hace falta window.matchMedia (no existe en jsdom) ni hay saltos al
// cargar.
//
// Edición (spec 007): si llega onCellActivate, cada comida apuntada es un botón
// para editarla y cada celda de comida tiene un botón "+" para añadir. Sin esa
// prop, la tabla sigue siendo de solo lectura. El panel de edición NO lo pinta
// la tabla: el contenedor indica la celda activa (activeCell) y su contenido
// (renderPanel), y la tabla lo inserta como una fila integrada justo debajo de
// la fila de esa celda, con un único td que ocupa todas las columnas
// (colSpan 8), en móvil y en PC. El mecanismo es genérico por fila
// (activeCell.row puede ser un momento o 'water' | 'wc' | 'steps'), para que
// la spec 009 lo reutilice en las filas de seguimiento.
//
// Móvil y tira de días: solo se ven las celdas del día elegido, así que no se
// puede activar otro día. Al activar una celda, la tabla elige ese día (por si
// la ventana pasa de PC a móvil). Al cambiar de día con la tira se avisa con
// onDayChange y es el contenedor quien decide (WeeklySheetScreen cierra el
// panel, porque pertenecía al día anterior).

import { Fragment, useId, useState, type ReactNode } from 'react'
import { type DailyLog, MEAL_SLOTS, type MealEntryWithFood, type MealSlot } from './api'
import { DayStrip } from './DayStrip'
import { dayMonthShort, formatMealEntry, formatSteps, formatWater, formatWc } from './gridFormat'
import {
  type DayOfWeek,
  type IsoDate,
  dayName,
  dayOfWeek,
  mondayOf,
  todayIso,
  weekDays,
  weekRangeLabel,
} from './week'
import './WeekGrid.css'

/** Filas de seguimiento (solo lectura hasta la spec 009). */
export type TrackingRowKey = 'water' | 'wc' | 'steps'

/** Cualquier fila de la tabla: un momento de comida o una fila de seguimiento. */
export type GridRowKey = MealSlot | TrackingRowKey

/**
 * Celda con el panel abierto. entryId indica qué comida se edita (si falta,
 * se abrió con "+"); sirve para marcar con aria-expanded el botón que lo abrió.
 */
export type ActiveCell = { day: number; row: GridRowKey; entryId?: string }

/** Celda de comida que se quiere editar o en la que se quiere añadir. */
export type MealCellTarget = { day: number; row: MealSlot }

type WeekGridProps = {
  monday: IsoDate
  meals: MealEntryWithFood[]
  dailyLogs: DailyLog[]
  /** Fecha de hoy; por defecto, la del navegador. */
  today?: IsoDate
  /**
   * Si llega, las celdas de comida son interactivas: "+" llama sin entryId
   * (añadir) y cada comida apuntada, con su id (editar). Sin ella, la tabla
   * es de solo lectura.
   */
  onCellActivate?: (target: MealCellTarget, entryId?: string) => void
  /** Celda con el panel abierto (resaltada); null o ausente si no hay panel. */
  activeCell?: ActiveCell | null
  /** Contenido de la fila de panel bajo la fila de activeCell (null: sin fila). */
  renderPanel?: () => ReactNode
  /** Aviso al cambiar de día con la tira (móvil); el contenedor decide qué hacer. */
  onDayChange?: (day: DayOfWeek) => void
}

type TrackingRow = { key: TrackingRowKey; label: string; format: (log?: DailyLog) => string }

const TRACKING_ROWS: readonly TrackingRow[] = [
  { key: 'water', label: 'Agua', format: formatWater },
  { key: 'wc', label: 'WC', format: formatWc },
  { key: 'steps', label: 'Pasos', format: formatSteps },
]

/** Día por defecto en móvil: hoy si cae en la semana, si no el lunes. */
function defaultDay(monday: IsoDate, today: IsoDate): DayOfWeek {
  return mondayOf(today) === monday ? dayOfWeek(today) : 1
}

/** Nombre corto visible en la cabecera: "Lun", "Mié"… */
function shortDayName(day: DayOfWeek): string {
  const name = dayName(day).slice(0, 3)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function WeekGrid({
  monday,
  meals,
  dailyLogs,
  today = todayIso(),
  onCellActivate,
  activeCell = null,
  renderPanel,
  onDayChange,
}: WeekGridProps) {
  const panelId = useId()
  // El día elegido va ligado a su lunes: si cambia la semana, vuelve al de por defecto
  const [selection, setSelection] = useState<{ monday: IsoDate; day: DayOfWeek } | null>(null)
  const selectedDay =
    selection && selection.monday === monday ? selection.day : defaultDay(monday, today)

  const days = weekDays(monday)

  // Comidas agrupadas por "día|momento", en orden de position
  const mealsByCell = new Map<string, MealEntryWithFood[]>()
  for (const meal of [...meals].sort((a, b) => a.position - b.position)) {
    const key = `${meal.day_of_week}|${meal.meal_slot}`
    const list = mealsByCell.get(key)
    if (list) list.push(meal)
    else mealsByCell.set(key, [meal])
  }
  const logsByDay = new Map<number, DailyLog>(dailyLogs.map((log) => [log.day_of_week, log]))

  // Clases comunes de una columna de día (la elegida se ve también en móvil)
  const dayClass = (day: DayOfWeek, base: string) =>
    `${base} week-grid__day${day === selectedDay ? ' week-grid__day--selected' : ''}`

  const isActive = (day: number, row: string) =>
    activeCell !== null && activeCell.day === day && activeCell.row === row

  // Clases de una celda de datos (resaltada si tiene el panel abierto)
  const cellClass = (day: DayOfWeek, row: string) =>
    dayClass(day, `week-grid__cell${isActive(day, row) ? ' week-grid__cell--active' : ''}`)

  function activate(target: MealCellTarget, entryId?: string) {
    // La tabla elige ese día: si la ventana pasa a móvil, se ve la celda activa
    setSelection({ monday, day: target.day as DayOfWeek })
    // "+" llama sin segundo argumento (añadir); una comida, con su id (editar)
    if (entryId === undefined) onCellActivate?.(target)
    else onCellActivate?.(target, entryId)
  }

  // Contenido de la fila de panel (null o undefined: no hay fila)
  const panelContent = activeCell && renderPanel ? renderPanel() : null
  const hasPanel = panelContent !== null && panelContent !== undefined

  /** Fila de panel integrada bajo la fila `row`, si es la de la celda activa. */
  function panelRow(row: string) {
    if (!activeCell || activeCell.row !== row || !hasPanel) return null
    return (
      <tr className="week-grid__panel-row">
        <td className="week-grid__panel-cell" colSpan={8} id={panelId}>
          {panelContent}
        </td>
      </tr>
    )
  }

  /** aria-expanded / aria-controls del botón que abrió (o abriría) el panel. */
  function expandedProps(day: number, row: string, entryId?: string) {
    const expanded = hasPanel && isActive(day, row) && activeCell?.entryId === entryId
    return {
      'aria-expanded': expanded,
      'aria-controls': expanded ? panelId : undefined,
    }
  }

  return (
    <div className="week-grid">
      <div className="week-grid__strip">
        <DayStrip
          monday={monday}
          selectedDay={selectedDay}
          onSelect={(day) => {
            setSelection({ monday, day })
            onDayChange?.(day)
          }}
          today={today}
        />
      </div>

      <table className="week-grid__table">
        <caption className="week-grid__sr-only">
          Comidas y seguimiento de la semana {weekRangeLabel(monday)}
        </caption>
        <thead>
          <tr>
            <td className="week-grid__corner" />
            {days.map((date, i) => {
              const day = (i + 1) as DayOfWeek
              const isToday = date === today
              return (
                <th
                  key={date}
                  scope="col"
                  className={dayClass(
                    day,
                    `week-grid__head${isToday ? ' week-grid__head--today' : ''}`,
                  )}
                >
                  <span className="week-grid__head-name" aria-hidden="true">
                    {shortDayName(day)}
                  </span>
                  <span className="week-grid__sr-only">{dayName(day)}</span>{' '}
                  <span className="week-grid__head-date">{dayMonthShort(date)}</span>
                  {isToday && <span className="week-grid__today">hoy</span>}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {MEAL_SLOTS.map(({ slot, label }) => (
            <Fragment key={slot}>
              <tr>
                <th scope="row" className="week-grid__row-label">
                  {label}
                </th>
                {days.map((date, i) => {
                  const day = (i + 1) as DayOfWeek
                  const entries = mealsByCell.get(`${day}|${slot}`) ?? []
                  // "martes, media mañana" para las etiquetas accesibles
                  const where = `${dayName(day)}, ${label.toLowerCase()}`
                  return (
                    <td key={date} className={cellClass(day, slot)} data-day={day} data-row={slot}>
                      {entries.length > 0 && (
                        <ul className="week-grid__entries">
                          {entries.map((entry) => (
                            <li key={entry.id}>
                              {onCellActivate ? (
                                <button
                                  type="button"
                                  className="week-grid__entry-button"
                                  aria-label={`Editar ${formatMealEntry(entry)}, ${where}`}
                                  data-day={day}
                                  data-row={slot}
                                  data-entry-id={entry.id}
                                  {...expandedProps(day, slot, entry.id)}
                                  onClick={() => activate({ day, row: slot }, entry.id)}
                                >
                                  {formatMealEntry(entry)}
                                </button>
                              ) : (
                                formatMealEntry(entry)
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {onCellActivate && (
                        <button
                          type="button"
                          className="week-grid__add-button"
                          aria-label={`Añadir comida, ${where}`}
                          data-day={day}
                          data-row={slot}
                          {...expandedProps(day, slot)}
                          onClick={() => activate({ day, row: slot })}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
              {panelRow(slot)}
            </Fragment>
          ))}
          {TRACKING_ROWS.map(({ key, label, format }, rowIndex) => (
            <Fragment key={key}>
              <tr className={rowIndex === 0 ? 'week-grid__tracking--first' : undefined}>
                <th scope="row" className="week-grid__row-label">
                  {label}
                </th>
                {days.map((date, i) => {
                  const day = (i + 1) as DayOfWeek
                  return (
                    <td key={date} className={cellClass(day, key)} data-day={day} data-row={key}>
                      {format(logsByDay.get(day))}
                    </td>
                  )
                })}
              </tr>
              {panelRow(key)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
