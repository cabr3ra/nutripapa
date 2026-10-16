// Tira de días L M X J V S D para la vista móvil de la cuadrícula.
// Componente presentacional: el día elegido lo guarda el padre.

import { type DayOfWeek, type IsoDate, dayName, dayShortLetter, todayIso, weekDays } from './week'
import { dayMonthLong } from './gridFormat'
import './DayStrip.css'

type DayStripProps = {
  monday: IsoDate
  selectedDay: DayOfWeek
  onSelect: (day: DayOfWeek) => void
  /** Fecha de hoy (para marcarla); por defecto, la del navegador. */
  today?: IsoDate
}

export function DayStrip({ monday, selectedDay, onSelect, today = todayIso() }: DayStripProps) {
  const days = weekDays(monday)
  return (
    <div className="day-strip" role="group" aria-label="Elige el día">
      {days.map((date, i) => {
        const day = (i + 1) as DayOfWeek
        const isSelected = day === selectedDay
        const isToday = date === today
        const label = `${dayName(day)} ${dayMonthLong(date)}${isToday ? ', hoy' : ''}`
        return (
          <button
            key={date}
            type="button"
            className={[
              'day-strip__day',
              isSelected ? 'day-strip__day--selected' : '',
              isToday ? 'day-strip__day--today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={isSelected}
            aria-label={label}
            onClick={() => onSelect(day)}
          >
            {dayShortLetter(day)}
          </button>
        )
      })}
    </div>
  )
}
