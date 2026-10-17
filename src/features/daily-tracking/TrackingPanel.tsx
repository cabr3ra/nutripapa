// Panel integrado del seguimiento de un día (spec 009): agua, pis, caca y pasos.
// Se monta dentro de la tabla (fila bajo la fila tocada, lo hace WeekGrid); aquí
// es autónomo. Guarda solo: cada cambio válido programa un guardado tras 600 ms
// sin más cambios. Nunca abre ventanas ni pide confirmación.
//
// Decisiones:
// - Foco inicial en el título (tabIndex -1): así en el móvil no salta el teclado
//   al abrir y el lector de pantalla anuncia "Seguimiento del martes".
// - Los valores de `log` solo se leen al montar; si el padre recarga tras
//   onSaved, el panel sigue con lo que tiene (que es lo mismo que se guardó).
// - Los guardados van en cola (nunca dos a la vez) y cada uno envía los valores
//   completos del momento en que arranca; si no han cambiado respecto a lo
//   último guardado, no se envía nada.
// - Cerrar ("Listo" o Escape) guarda antes lo pendiente y espera; si falla, el
//   panel no se cierra y muestra el error con "Reintentar".
// - Si el panel se desmonta con cambios sin guardar (p. ej. se abre otra celda),
//   se guardan igualmente sin esperar (fire and forget): onSaved se llama al
//   terminar, pero el estado del panel ya no se toca.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Stepper } from '../../components/Stepper'
import { dayName } from '../weekly-sheets/week'
import { saveDailyLog, type DailyLog, type DailyLogValues } from './api'
import {
  WATER_MAX,
  WATER_STEP,
  formatStepsInput,
  parseSteps,
  validateWater,
  warningsFor,
} from './parse'
import './TrackingPanel.css'

export type TrackingPanelProps = {
  sheetId: string
  dayOfWeek: number
  /** Valores actuales del día; si no viene, todo está sin apuntar. */
  log?: DailyLog
  /** Se llama tras cada guardado con el registro que devuelve la BD. */
  onSaved: (log: DailyLog) => void
  onClose: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** Espera sin cambios antes de guardar solo. */
export const SAVE_DELAY_MS = 600

const SAVE_ERROR = 'No se ha podido guardar'

const EMPTY: DailyLogValues = {
  water_liters: null,
  pee_count: null,
  poop_count: null,
  steps: null,
}

function valuesFrom(log: DailyLog | undefined): DailyLogValues {
  if (!log) return EMPTY
  return {
    water_liters: log.water_liters,
    pee_count: log.pee_count,
    poop_count: log.poop_count,
    steps: log.steps,
  }
}

function sameValues(a: DailyLogValues, b: DailyLogValues): boolean {
  return (
    a.water_liters === b.water_liters &&
    a.pee_count === b.pee_count &&
    a.poop_count === b.poop_count &&
    a.steps === b.steps
  )
}

/** Panel "Seguimiento del martes" con guardado automático. */
export function TrackingPanel({ sheetId, dayOfWeek, log, onSaved, onClose }: TrackingPanelProps) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const stepsId = `${baseId}-steps`
  const stepsErrorId = `${baseId}-steps-error`
  const stepsWarningId = `${baseId}-steps-warning`
  const waterWarningId = `${baseId}-water-warning`

  const [values, setValues] = useState<DailyLogValues>(() => valuesFrom(log))
  const [status, setStatus] = useState<SaveStatus>('idle')
  // Texto de pasos mientras se escribe; null = mostrar el valor formateado
  const [stepsDraft, setStepsDraft] = useState<string | null>(null)
  const [stepsError, setStepsError] = useState<string | null>(null)
  const [closing, setClosing] = useState(false)

  // Lo que hay ahora y lo último guardado (los lee el guardado, fuera del render)
  const valuesRef = useRef<DailyLogValues>(values)
  const savedRef = useRef<DailyLogValues>(values)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cola de guardados: cada uno empieza cuando acaba el anterior
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true))
  const mountedRef = useRef(false)
  const titleRef = useRef<HTMLHeadingElement>(null)

  // Datos que usa el guardado; se actualizan tras cada render
  const latest = useRef({ sheetId, dayOfWeek, onSaved })
  useEffect(() => {
    latest.current = { sheetId, dayOfWeek, onSaved }
  })

  function clearTimer() {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  // Un guardado: envía los valores actuales si difieren de lo último guardado
  async function saveNow(): Promise<boolean> {
    const snapshot = valuesRef.current
    if (sameValues(snapshot, savedRef.current)) return true
    if (validateWater(snapshot.water_liters)) return false
    const { sheetId: sheet, dayOfWeek: day, onSaved: notify } = latest.current
    if (mountedRef.current) setStatus('saving')
    try {
      const saved = await saveDailyLog(sheet, day, snapshot)
      savedRef.current = snapshot
      notify(saved)
      if (mountedRef.current) setStatus('saved')
      return true
    } catch {
      if (mountedRef.current) setStatus('error')
      return false
    }
  }

  /** Cancela la espera y guarda ya (en cola tras el guardado en curso). */
  function flush(): Promise<boolean> {
    clearTimer()
    const next = queueRef.current.then(saveNow)
    queueRef.current = next
    return next
  }

  function scheduleSave() {
    clearTimer()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flush()
    }, SAVE_DELAY_MS)
  }

  function update(patch: Partial<DailyLogValues>) {
    const next = { ...valuesRef.current, ...patch }
    if (sameValues(next, valuesRef.current)) return
    valuesRef.current = next
    setValues(next)
    if (validateWater(next.water_liters)) return
    scheduleSave()
  }

  // Foco inicial en el título; al desmontar, guarda lo pendiente sin esperar
  useEffect(() => {
    mountedRef.current = true
    titleRef.current?.focus()
    return () => {
      mountedRef.current = false
      clearTimer()
      if (!sameValues(valuesRef.current, savedRef.current)) {
        queueRef.current = queueRef.current.then(saveNow)
      }
    }
    // Solo al montar y desmontar; saveNow lee todo de refs
  }, [])

  // Pasos: al salir del campo o con Enter. Devuelve false si el texto no vale.
  function commitSteps(): boolean {
    if (stepsDraft === null) return true
    const result = parseSteps(stepsDraft)
    if ('error' in result) {
      setStepsError(result.error)
      return false
    }
    setStepsDraft(null)
    setStepsError(null)
    update({ steps: result.value })
    return true
  }

  function handleStepsKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitSteps()
    }
  }

  function clearSteps() {
    setStepsDraft(null)
    setStepsError(null)
    update({ steps: null })
  }

  async function close() {
    if (closing) return
    if (!commitSteps()) {
      document.getElementById(stepsId)?.focus()
      return
    }
    setClosing(true)
    const ok = await flush()
    if (!mountedRef.current) return
    setClosing(false)
    if (ok) onClose()
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    void close()
  }

  const waterWarnings = warningsFor({ ...EMPTY, water_liters: values.water_liters })
  const stepsWarnings = warningsFor({ ...EMPTY, steps: values.steps })
  const stepsDescribedBy =
    [stepsError ? stepsErrorId : null, stepsWarnings.length > 0 ? stepsWarningId : null]
      .filter(Boolean)
      .join(' ') || undefined
  const title = `Seguimiento del ${dayName(dayOfWeek)}`

  return (
    <div
      className="tracking-panel"
      role="group"
      aria-labelledby={titleId}
      onKeyDown={handlePanelKeyDown}
    >
      <div className="tracking-panel__content">
        <h2 className="tracking-panel__title" id={titleId} ref={titleRef} tabIndex={-1}>
          {title}
        </h2>

        <div className="tracking-panel__counters">
          <div className="tracking-panel__item">
            <Stepper
              label="Agua"
              value={values.water_liters}
              onChange={(water) => update({ water_liters: water })}
              step={WATER_STEP}
              min={0}
              max={WATER_MAX}
              allowDecimals
              unitSuffix="L"
              describedBy={waterWarnings.length > 0 ? waterWarningId : undefined}
            />
            <button
              className="tracking-panel__button tracking-panel__button--small"
              type="button"
              aria-label="Vaciar agua"
              disabled={values.water_liters === null}
              onClick={() => update({ water_liters: null })}
            >
              Vaciar
            </button>
            <div className="tracking-panel__warning" id={waterWarningId} aria-live="polite">
              {waterWarnings.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </div>

          <div className="tracking-panel__item">
            <Stepper
              label="Pis"
              value={values.pee_count}
              onChange={(pee) => update({ pee_count: pee })}
              step={1}
              min={0}
            />
            <button
              className="tracking-panel__button tracking-panel__button--small"
              type="button"
              aria-label="Vaciar pis"
              disabled={values.pee_count === null}
              onClick={() => update({ pee_count: null })}
            >
              Vaciar
            </button>
          </div>

          <div className="tracking-panel__item">
            <Stepper
              label="Caca"
              value={values.poop_count}
              onChange={(poop) => update({ poop_count: poop })}
              step={1}
              min={0}
            />
            <button
              className="tracking-panel__button tracking-panel__button--small"
              type="button"
              aria-label="Vaciar caca"
              disabled={values.poop_count === null}
              onClick={() => update({ poop_count: null })}
            >
              Vaciar
            </button>
          </div>
        </div>

        <div className="tracking-panel__item">
          <label className="tracking-panel__label" htmlFor={stepsId}>
            Pasos
          </label>
          <input
            className="tracking-panel__input"
            id={stepsId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={stepsDraft ?? formatStepsInput(values.steps)}
            aria-invalid={stepsError ? true : undefined}
            aria-describedby={stepsDescribedBy}
            onChange={(event) => {
              setStepsDraft(event.target.value)
              setStepsError(null)
            }}
            onBlur={commitSteps}
            onKeyDown={handleStepsKeyDown}
          />
          {stepsError && (
            <p className="tracking-panel__field-error" id={stepsErrorId}>
              {stepsError}
            </p>
          )}
          <button
            className="tracking-panel__button tracking-panel__button--small"
            type="button"
            aria-label="Vaciar pasos"
            disabled={values.steps === null && stepsDraft === null}
            onClick={clearSteps}
          >
            Vaciar
          </button>
          <div className="tracking-panel__warning" id={stepsWarningId} aria-live="polite">
            {stepsWarnings.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>

        <div className="tracking-panel__footer">
          <div
            className={
              status === 'error'
                ? 'tracking-panel__status tracking-panel__status--error'
                : 'tracking-panel__status'
            }
          >
            <p role="status">
              {status === 'saving' && 'Guardando…'}
              {status === 'saved' && 'Guardado'}
              {status === 'error' && SAVE_ERROR}
            </p>
            {status === 'error' && (
              <button
                className="tracking-panel__button tracking-panel__button--small"
                type="button"
                onClick={() => void flush()}
              >
                Reintentar
              </button>
            )}
          </div>
          <button
            className="tracking-panel__button tracking-panel__button--primary"
            type="button"
            disabled={closing}
            onClick={() => void close()}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrackingPanel
