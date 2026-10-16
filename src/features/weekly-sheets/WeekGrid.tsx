// Cuadrícula semanal de solo lectura: 5 momentos de comida + agua, WC y pasos.
// Es una <table> real (caption, th de columna y de fila) para que los lectores
// de pantalla anuncien día y momento en cada celda. El responsive es solo CSS:
// se pintan siempre las 7 columnas y en móvil (< 48rem) se ocultan las de los
// días no elegidos con display:none (que también las saca del árbol accesible).
// Así no hace falta window.matchMedia (no existe en jsdom) ni hay saltos al
// cargar. La edición de celdas llegará en las specs 007/009.

import { useState } from 'react'
import { type DailyLog, MEAL_SLOTS, type MealEntryWithFood } from './api'
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

type WeekGridProps = {
  monday: IsoDate
  meals: MealEntryWithFood[]
  dailyLogs: DailyLog[]
  /** Fecha de hoy; por defecto, la del navegador. */
  today?: IsoDate
}

type TrackingRow = { key: string; label: string; format: (log?: DailyLog) => string }

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

export function WeekGrid({ monday, meals, dailyLogs, today = todayIso() }: WeekGridProps) {
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

  return (
    <div className="week-grid">
      <div className="week-grid__strip">
        <DayStrip
          monday={monday}
          selectedDay={selectedDay}
          onSelect={(day) => setSelection({ monday, day })}
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
            <tr key={slot}>
              <th scope="row" className="week-grid__row-label">
                {label}
              </th>
              {days.map((date, i) => {
                const day = (i + 1) as DayOfWeek
                const entries = mealsByCell.get(`${day}|${slot}`) ?? []
                return (
                  <td
                    key={date}
                    className={dayClass(day, 'week-grid__cell')}
                    data-day={day}
                    data-row={slot}
                  >
                    {entries.length > 0 && (
                      <ul className="week-grid__entries">
                        {entries.map((entry) => (
                          <li key={entry.id}>{formatMealEntry(entry)}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          {TRACKING_ROWS.map(({ key, label, format }, rowIndex) => (
            <tr key={key} className={rowIndex === 0 ? 'week-grid__tracking--first' : undefined}>
              <th scope="row" className="week-grid__row-label">
                {label}
              </th>
              {days.map((date, i) => {
                const day = (i + 1) as DayOfWeek
                return (
                  <td
                    key={date}
                    className={dayClass(day, 'week-grid__cell')}
                    data-day={day}
                    data-row={key}
                  >
                    {format(logsByDay.get(day))}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
