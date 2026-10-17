// Tira de días L M X J V S D para la vista móvil de la cuadrícula.
// Componente presentacional: el día elegido lo guarda el padre.
//
// Arrastre (spec 008): con `droppable`, cada botón de día es además una zona de
// destino de dnd-kit (`strip-day:<día>`): soltar una comida encima la mueve al
// mismo momento de ese día, al final. Necesita estar dentro del DndContext de
// MealDndProvider (WeekGrid ya lo está cuando es arrastrable). La tira solo se
// ve en móvil (< 48rem), así que en PC estas zonas no aparecen. Sin `droppable`
// no se usa ningún hook de dnd-kit.

import { useDroppable } from '@dnd-kit/core'
import { stripDayDropId } from '../meals/dnd/ids'
import { type DayOfWeek, type IsoDate, dayName, dayShortLetter, todayIso, weekDays } from './week'
import { dayMonthLong } from './gridFormat'
import './DayStrip.css'

type DayStripProps = {
  monday: IsoDate
  selectedDay: DayOfWeek
  onSelect: (day: DayOfWeek) => void
  /** Fecha de hoy (para marcarla); por defecto, la del navegador. */
  today?: IsoDate
  /** Cada día es zona de destino del arrastre de comidas (dentro de un DndContext). */
  droppable?: boolean
}

type DayButtonProps = {
  day: DayOfWeek
  label: string
  isSelected: boolean
  isToday: boolean
  /** Se está arrastrando una comida encima de este día. */
  isOver?: boolean
  onSelect: (day: DayOfWeek) => void
  buttonRef?: (element: HTMLElement | null) => void
}

function DayButton({
  day,
  label,
  isSelected,
  isToday,
  isOver = false,
  onSelect,
  buttonRef,
}: DayButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={[
        'day-strip__day',
        isSelected ? 'day-strip__day--selected' : '',
        isToday ? 'day-strip__day--today' : '',
        isOver ? 'day-strip__day--over' : '',
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
}

/** Botón de día que además es zona de destino del arrastre. */
function DroppableDayButton(props: Omit<DayButtonProps, 'isOver' | 'buttonRef'>) {
  const { setNodeRef, isOver } = useDroppable({ id: stripDayDropId(props.day) })
  return <DayButton {...props} isOver={isOver} buttonRef={setNodeRef} />
}

export function DayStrip({
  monday,
  selectedDay,
  onSelect,
  today = todayIso(),
  droppable = false,
}: DayStripProps) {
  const days = weekDays(monday)
  return (
    <div className="day-strip" role="group" aria-label="Elige el día">
      {days.map((date, i) => {
        const day = (i + 1) as DayOfWeek
        const isToday = date === today
        const buttonProps = {
          day,
          label: `${dayName(day)} ${dayMonthLong(date)}${isToday ? ', hoy' : ''}`,
          isSelected: day === selectedDay,
          isToday,
          onSelect,
        }
        return droppable ? (
          <DroppableDayButton key={date} {...buttonProps} />
        ) : (
          <DayButton key={date} {...buttonProps} />
        )
      })}
    </div>
  )
}
