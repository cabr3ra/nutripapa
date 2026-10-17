import { useId, useState, type KeyboardEvent } from 'react'
import './Stepper.css'

type StepperProps = {
  /** Etiqueta visible (p. ej. "Cantidad", "Agua"). */
  label: string
  /** Valor actual; null = sin valor ("no apuntado"). */
  value: number | null
  /** Se llama con el nuevo valor ya validado y redondeado, o null si se vacía. */
  onChange: (value: number | null) => void
  /** Cuánto suman/restan los botones + y −. */
  step: number
  /** Mínimo permitido (por defecto 0). */
  min?: number
  /** Máximo permitido (sin límite si no se indica). */
  max?: number
  /** Si es true, el valor tiene que ser estrictamente mayor que `min`. */
  minExclusive?: boolean
  /** Admite decimales al escribir (teclado decimal en el móvil). */
  allowDecimals?: boolean
  /** Unidad que se muestra tras el número (p. ej. "L"). */
  unitSuffix?: string
  /** id del campo de texto (por defecto, uno generado). */
  id?: string
  /** ids extra para aria-describedby del campo. */
  describedBy?: string
  /** Error externo (p. ej. "Escribe la cantidad" al guardar); el interno tiene prioridad. */
  error?: string
}

// Formato numérico es-ES: coma decimal y sin separador de miles
function formatNumber(n: number, decimals: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(n)
}

// Decimales del paso (0,25 → 2); los cálculos se redondean a max(esos, 2)
function decimalsOf(n: number): number {
  const text = String(n)
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

// Redondeo para evitar errores de coma flotante (0.1 + 0.2)
function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

// Acepta "1,5", "1.5", ",5", "2" y "2,"; devuelve null si no es un número
function parseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(trimmed)) return null
  return Number(trimmed.replace(',', '.'))
}

/**
 * Selector numérico "− [ 2 ] +" con botones grandes (48 px) y campo editable.
 * Controlado y sin red. Lo usan 007 (cantidad > 0) y 009 (agua, contadores).
 */
export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max,
  minExclusive = false,
  allowDecimals = false,
  unitSuffix,
  id,
  describedBy,
  error,
}: StepperProps) {
  const generatedId = useId()
  const inputId = id ?? `${generatedId}-input`
  const labelId = `${inputId}-label`
  const errorId = `${inputId}-error`
  const suffixId = `${inputId}-suffix`

  // Texto que se está escribiendo; null = mostrar el valor formateado
  const [draft, setDraft] = useState<string | null>(null)
  const [internalError, setInternalError] = useState<string | null>(null)

  const decimals = Math.max(decimalsOf(step), 2)
  const round = (n: number) => roundTo(n, decimals)
  const format = (n: number) => formatNumber(n, decimals)

  // Lo más bajo a lo que llega "−": min, o un paso por encima si min es exclusivo
  const floor = minExclusive ? round(min + step) : min
  const canDecrease = value !== null && value > floor
  const canIncrease = max === undefined || value === null || value < max

  const clamp = (n: number) => (max !== undefined && n > max ? max : n)

  const resetDraft = () => {
    setDraft(null)
    setInternalError(null)
  }

  const decrease = () => {
    if (!canDecrease || value === null) return
    resetDraft()
    onChange(Math.max(round(value - step), floor))
  }

  const increase = () => {
    if (!canIncrease) return
    resetDraft()
    // Desde vacío: el paso, o el mínimo permitido si es mayor
    const next = value === null ? Math.max(step, floor) : round(value + step)
    onChange(clamp(next))
  }

  // Devuelve el mensaje de error, o null si el número es válido
  const validate = (n: number): string | null => {
    if (!allowDecimals && !Number.isInteger(n)) return 'Escribe un número entero'
    if (minExclusive && n <= min) return `Tiene que ser mayor que ${format(min)}`
    if (!minExclusive && n < min) return `Tiene que ser ${format(min)} o más`
    if (max !== undefined && n > max) return `Tiene que ser ${format(max)} o menos`
    return null
  }

  // Al salir del campo (o pulsar Enter): valida y normaliza
  const commit = () => {
    if (draft === null) return
    if (draft.trim() === '') {
      resetDraft()
      if (value !== null) onChange(null)
      return
    }
    const parsed = parseNumber(draft)
    if (parsed === null) {
      setInternalError('Escribe un número')
      return
    }
    const message = validate(parsed)
    if (message) {
      setInternalError(message)
      return
    }
    const next = round(parsed)
    resetDraft()
    if (next !== value) onChange(next)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
  }

  const shownError = internalError ?? error ?? null
  const describedByIds =
    [describedBy, unitSuffix ? suffixId : null, shownError ? errorId : null]
      .filter(Boolean)
      .join(' ') || undefined

  const stepText = format(step)
  const shownText = draft ?? (value === null ? '' : format(value))

  return (
    <div className="stepper">
      <label className="stepper__label" id={labelId} htmlFor={inputId}>
        {label}
      </label>
      <div className="stepper__controls" role="group" aria-labelledby={labelId}>
        <button
          className="stepper__button"
          type="button"
          aria-label={`Quitar ${stepText}`}
          disabled={!canDecrease}
          onClick={decrease}
        >
          −
        </button>
        <span className="stepper__field">
          <input
            className="stepper__input"
            id={inputId}
            type="text"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            autoComplete="off"
            value={shownText}
            aria-invalid={shownError ? true : undefined}
            aria-describedby={describedByIds}
            onChange={(event) => {
              setDraft(event.target.value)
              setInternalError(null)
            }}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          {unitSuffix && (
            <span className="stepper__suffix" id={suffixId}>
              {unitSuffix}
            </span>
          )}
        </span>
        <button
          className="stepper__button"
          type="button"
          aria-label={`Añadir ${stepText}`}
          disabled={!canIncrease}
          onClick={increase}
        >
          +
        </button>
      </div>
      {shownError && (
        <p className="stepper__message" id={errorId}>
          {shownError}
        </p>
      )}
    </div>
  )
}

export default Stepper
