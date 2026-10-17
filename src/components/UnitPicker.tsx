import { useId, useState } from 'react'
import { isListedUnit, UNITS } from './units'
import './UnitPicker.css'

type UnitPickerProps = {
  /** Unidad actual; null = sin elegir (o "Otra…" aún sin escribir). */
  value: string | null
  /** Se llama con la unidad elegida o escrita (sin espacios sobrantes), o null. */
  onChange: (unit: string | null) => void
  /** id del select (por defecto, uno generado). */
  id?: string
  /** Etiqueta visible del select. */
  label?: string
}

// Valor interno de la opción "Otra…" (no puede chocar con una unidad escrita)
const OTHER = '__other__'

/**
 * Selector de unidad: select nativo con la lista corta y "Otra…", que abre
 * un campo de texto en línea. Controlado y sin red.
 */
export function UnitPicker({ value, onChange, id, label = 'Unidad' }: UnitPickerProps) {
  const generatedId = useId()
  const selectId = id ?? `${generatedId}-select`
  const otherId = `${selectId}-other`

  const isCustom = value !== null && !isListedUnit(value)
  // Modo "Otra…" elegido a mano (aunque el texto siga vacío)
  const [otherMode, setOtherMode] = useState(isCustom)
  // Texto tal cual se escribe (con espacios), para no comerse lo que se teclea
  const [text, setText] = useState(isCustom ? value : '')
  const [prevValue, setPrevValue] = useState(value)

  // Si el valor cambia desde fuera (p. ej. al elegir otra comida), se sincroniza
  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== (text.trim() || null)) {
      setText(isCustom ? value : '')
      setOtherMode(isCustom)
    }
  }

  const showOther = otherMode || isCustom
  const selectValue = showOther ? OTHER : (value ?? '')

  return (
    <div className="unit-picker">
      <label className="unit-picker__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        className="unit-picker__select"
        id={selectId}
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value
          if (next === OTHER) {
            setOtherMode(true)
            onChange(text.trim() || null)
          } else {
            setOtherMode(false)
            setText('')
            onChange(next || null)
          }
        }}
      >
        {selectValue === '' && (
          <option value="" disabled>
            Elige una unidad
          </option>
        )}
        {UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
          </option>
        ))}
        <option value={OTHER}>Otra…</option>
      </select>
      {showOther && (
        <>
          <label className="unit-picker__label" htmlFor={otherId}>
            Escribe la unidad
          </label>
          <input
            className="unit-picker__input"
            id={otherId}
            type="text"
            autoComplete="off"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              onChange(event.target.value.trim() || null)
            }}
          />
        </>
      )}
    </div>
  )
}

export default UnitPicker
