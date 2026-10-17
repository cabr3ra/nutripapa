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
// Seguimiento (spec 009): si llega onTrackingActivate, cada celda de Agua, WC
// y Pasos es un botón que ocupa la celda entera y abre el panel del día. Va en
// una prop aparte (y no ampliando onCellActivate) para que onCellActivate siga
// recibiendo solo celdas de comida y quien solo edita comidas no tenga que
// distinguir filas. Sin onTrackingActivate, esas filas son de solo lectura.
//
// Móvil y tira de días: solo se ven las celdas del día elegido, así que no se
// puede activar otro día. Al activar una celda, la tabla elige ese día (por si
// la ventana pasa de PC a móvil). Al cambiar de día con la tira se avisa con
// onDayChange y es el contenedor quien decide (WeeklySheetScreen cierra el
// panel, porque pertenecía al día anterior). El contenedor también puede pedir
// un día con selectDayRequest (spec 008: tras mover una comida a otro día).
//
// Arrastre (spec 008): con draggable (y dentro de un MealDndProvider), cada
// celda de comida es una zona de destino (useDroppable) con su lista en un
// SortableContext, y cada comida es ordenable (useSortable) sobre el MISMO
// botón "Editar …". Del sortable solo se aplican el ref, la transformación y
// los oyentes de puntero/táctil; NO sus `attributes` (cambiarían el role del
// botón) ni su oyente de teclado (Intro/Espacio cogerían la comida en lugar de
// abrir el panel). Con teclado, la alternativa al arrastre es "Mover a…" en el
// panel (WCAG 2.5.7). Un clic no arrastra: el ratón necesita moverse 5 px.
// Mover o reordenar se resuelve solo al soltar (resolveDrop en el provider);
// durante el arrastre las listas no cambian de celda. En móvil, además, cada
// botón de la tira L–D es zona de destino (DayStrip con droppable): soltar ahí
// lleva la comida al mismo momento de ese día, al final. La tira solo se ve por
// debajo de 48rem, así que en PC esas zonas no aparecen. Sin draggable, la
// tabla no usa dnd-kit y queda igual que antes.

import {
  Fragment,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cellDropId, entryDragId } from '../meals/dnd/ids'
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

/** Filas de seguimiento (agua, WC y pasos). */
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

/** Celda de seguimiento que se quiere apuntar o editar (abre el panel del día). */
export type TrackingCellTarget = { day: number; row: TrackingRowKey }

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
  /**
   * Si llega, cada celda de Agua, WC y Pasos es un botón que llama con su día
   * y su fila. Sin ella, esas filas son de solo lectura.
   */
  onTrackingActivate?: (target: TrackingCellTarget) => void
  /** Celda con el panel abierto (resaltada); null o ausente si no hay panel. */
  activeCell?: ActiveCell | null
  /** Contenido de la fila de panel bajo la fila de activeCell (null: sin fila). */
  renderPanel?: () => ReactNode
  /** Aviso al cambiar de día con la tira (móvil); el contenedor decide qué hacer. */
  onDayChange?: (day: DayOfWeek) => void
  /**
   * Petición del contenedor para elegir un día desde fuera (spec 008: tras
   * "Mover a…" a otro día, el móvil muestra el día destino). Cada petición es
   * un objeto nuevo; la tabla la aplica una vez y luego la tira sigue mandando.
   * No avisa con onDayChange (no es un cambio hecho con la tira).
   */
  selectDayRequest?: { day: DayOfWeek } | null
  /**
   * Comidas arrastrables entre celdas y dentro de su celda (spec 008). Solo
   * tiene efecto con onCellActivate y exige un MealDndProvider por encima.
   */
  draggable?: boolean
}

type TrackingRow = {
  key: TrackingRowKey
  label: string
  /** Nombre dentro de las etiquetas accesibles: "Apuntar agua, martes". */
  spoken: string
  format: (log?: DailyLog) => string
}

const TRACKING_ROWS: readonly TrackingRow[] = [
  { key: 'water', label: 'Agua', spoken: 'agua', format: formatWater },
  { key: 'wc', label: 'WC', spoken: 'WC', format: formatWc },
  { key: 'steps', label: 'Pasos', spoken: 'pasos', format: formatSteps },
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
  onTrackingActivate,
  activeCell = null,
  renderPanel,
  onDayChange,
  selectDayRequest = null,
  draggable = false,
}: WeekGridProps) {
  // Sin botones de comida no hay nada que arrastrar
  const dnd = draggable && onCellActivate !== undefined
  const panelId = useId()
  // El día elegido va ligado a su lunes: si cambia la semana, vuelve al de por defecto
  const [selection, setSelection] = useState<{ monday: IsoDate; day: DayOfWeek } | null>(null)
  // Petición de día ya aplicada: una nueva se aplica durante el render (sin efecto)
  const [appliedRequest, setAppliedRequest] = useState<{ day: DayOfWeek } | null>(null)
  if (selectDayRequest !== appliedRequest) {
    setAppliedRequest(selectDayRequest)
    if (selectDayRequest) setSelection({ monday, day: selectDayRequest.day })
  }
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

  function activateTracking(target: TrackingCellTarget) {
    setSelection({ monday, day: target.day as DayOfWeek })
    onTrackingActivate?.(target)
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
          droppable={dnd}
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
                  const content = (
                    <>
                      {entries.length > 0 && (
                        <ul className="week-grid__entries">
                          {entries.map((entry) => {
                            if (!onCellActivate) {
                              return <li key={entry.id}>{formatMealEntry(entry)}</li>
                            }
                            const buttonProps = {
                              type: 'button',
                              className: 'week-grid__entry-button',
                              'aria-label': `Editar ${formatMealEntry(entry)}, ${where}`,
                              'data-day': day,
                              'data-row': slot,
                              'data-entry-id': entry.id,
                              ...expandedProps(day, slot, entry.id),
                              onClick: () => activate({ day, row: slot }, entry.id),
                              children: formatMealEntry(entry),
                            } as const
                            return (
                              <li key={entry.id}>
                                {dnd ? (
                                  <SortableEntryButton entryId={entry.id} {...buttonProps} />
                                ) : (
                                  <button {...buttonProps} />
                                )}
                              </li>
                            )
                          })}
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
                    </>
                  )
                  return dnd ? (
                    <DroppableMealCell
                      key={date}
                      day={day}
                      slot={slot}
                      entryIds={entries.map((entry) => entryDragId(entry.id))}
                      className={cellClass(day, slot)}
                    >
                      {content}
                    </DroppableMealCell>
                  ) : (
                    <td key={date} className={cellClass(day, slot)} data-day={day} data-row={slot}>
                      {content}
                    </td>
                  )
                })}
              </tr>
              {panelRow(slot)}
            </Fragment>
          ))}
          {TRACKING_ROWS.map(({ key, label, spoken, format }, rowIndex) => (
            <Fragment key={key}>
              <tr className={rowIndex === 0 ? 'week-grid__tracking--first' : undefined}>
                <th scope="row" className="week-grid__row-label">
                  {label}
                </th>
                {days.map((date, i) => {
                  const day = (i + 1) as DayOfWeek
                  const text = format(logsByDay.get(day))
                  // Vacío se ve vacío (no "0"), pero el botón siempre tiene nombre
                  const name = text
                    ? `Editar ${spoken}: ${text}, ${dayName(day)}`
                    : `Apuntar ${spoken}, ${dayName(day)}`
                  return (
                    <td
                      key={date}
                      className={`${cellClass(day, key)}${onTrackingActivate ? ' week-grid__cell--tracking' : ''}`}
                      data-day={day}
                      data-row={key}
                    >
                      {onTrackingActivate ? (
                        <button
                          type="button"
                          className="week-grid__tracking-button"
                          aria-label={name}
                          data-day={day}
                          data-row={key}
                          {...expandedProps(day, key)}
                          onClick={() => activateTracking({ day, row: key })}
                        >
                          {text}
                        </button>
                      ) : (
                        text
                      )}
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

type DroppableMealCellProps = {
  day: DayOfWeek
  slot: MealSlot
  /** Ids de arrastre de las comidas de la celda, en orden de position. */
  entryIds: string[]
  className: string
  children: ReactNode
}

/**
 * Celda de comida que acepta comidas arrastradas (spec 008). Se marca como
 * destino tanto si el puntero está sobre la celda como sobre una de sus
 * comidas (la detección de colisiones prefiere la comida para insertar antes).
 */
function DroppableMealCell({ day, slot, entryIds, className, children }: DroppableMealCellProps) {
  const { setNodeRef, isOver, over } = useDroppable({ id: cellDropId(day, slot) })
  const overHere = isOver || (over !== null && entryIds.includes(String(over.id)))
  return (
    <td
      ref={setNodeRef}
      className={`${className}${overHere ? ' week-grid__cell--drop-over' : ''}`}
      data-day={day}
      data-row={slot}
    >
      <SortableContext items={entryIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </td>
  )
}

type SortableEntryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  entryId: string
  className: string
}

/**
 * Botón "Editar …" de una comida que además se puede arrastrar con ratón o con
 * pulsación larga (spec 008). Ver la cabecera del archivo: sin `attributes` del
 * sortable y sin su oyente de teclado, para que el botón siga siendo un botón y
 * Intro/Espacio abran el panel.
 */
function SortableEntryButton({ entryId, className, style, ...rest }: SortableEntryButtonProps) {
  const { setNodeRef, transform, transition, listeners, isDragging } = useSortable({
    id: entryDragId(entryId),
  })
  // Solo puntero y táctil: el teclado se queda con el clic nativo del botón
  const pointerListeners = { ...listeners }
  delete pointerListeners.onKeyDown
  const dragStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <button
      {...rest}
      ref={setNodeRef}
      className={`${className}${isDragging ? ' week-grid__entry-button--dragging' : ''}`}
      style={dragStyle}
      {...pointerListeners}
    />
  )
}
