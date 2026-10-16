import { addDays, type IsoDate, weekShortLabel, weekTitle } from './week'
import './WeekPicker.css'

type WeekPickerProps = {
  /** Lunes de la semana elegida. */
  value: IsoDate
  /** Se llama con el lunes de la nueva semana. */
  onChange: (monday: IsoDate) => void
  /** Etiqueta accesible del grupo (p. ej. "Semana de la tabla nueva"). */
  label?: string
}

/**
 * Selector de semana "‹ Semana N ›". Sin límites: se puede ir a cualquier
 * semana pasada o futura. Para semanas anteriores a la 1 solo se ve el rango.
 */
export function WeekPicker({ value, onChange, label = 'Elegir semana' }: WeekPickerProps) {
  const title = weekTitle(value)
  const range = weekShortLabel(value)

  return (
    <div className="week-picker" role="group" aria-label={label}>
      <button
        className="week-picker__arrow"
        type="button"
        aria-label="Semana anterior"
        onClick={() => onChange(addDays(value, -7))}
      >
        ‹
      </button>
      {/* aria-live: al cambiar de semana, el lector de pantalla lee la nueva */}
      <div className="week-picker__label" aria-live="polite" aria-atomic="true">
        {title ? (
          <>
            <span className="week-picker__title">{title}</span>
            <span className="week-picker__range">{range}</span>
          </>
        ) : (
          <span className="week-picker__title">{range}</span>
        )}
      </div>
      <button
        className="week-picker__arrow"
        type="button"
        aria-label="Semana siguiente"
        onClick={() => onChange(addDays(value, 7))}
      >
        ›
      </button>
    </div>
  )
}

export default WeekPicker
