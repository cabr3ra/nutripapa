import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { getOrCreateCurrentSheet, getSheet, type SheetDetail, updateMenuNumber } from './api'
import { WeekGrid } from './WeekGrid'
import { weekRangeLabel, weekTitle } from './week'
import './WeeklySheetScreen.css'

const LOAD_ERROR = 'No hemos podido cargar tu semana. Revisa la conexión y prueba otra vez.'
const INVALID_MENU = 'Escribe un número a partir de 1'
const SAVE_ERROR = 'No hemos podido guardar el número de menú. Prueba otra vez.'
const SAVED_VISIBLE_MS = 2500

// Resultado de una carga, ligado a la clave (tabla + intento) que lo pidió:
// si la clave actual no coincide, la pantalla está cargando
type LoadResult =
  | { key: string; status: 'ready'; detail: SheetDetail }
  | { key: string; status: 'not-found' }
  | { key: string; status: 'error' }

/** Carga la tabla pedida: la de la URL o, sin parámetro, la de la semana actual. */
async function loadDetail(sheetId: string | undefined): Promise<SheetDetail | null> {
  const id = sheetId ?? (await getOrCreateCurrentSheet()).id
  return getSheet(id)
}

/**
 * Pantalla de una tabla semanal. En `/` abre (o crea) la tabla de esta semana;
 * en `/tabla/:sheetId`, una tabla concreta. Cabecera con semana, rango y
 * nº de menú editable en línea; debajo, la cuadrícula de solo lectura.
 */
export function WeeklySheetScreen() {
  const { sheetId } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const key = `${sheetId ?? 'current'}#${attempt}`

  // El estado solo se toca cuando llega la respuesta (con flag de cancelación)
  useEffect(() => {
    let active = true
    loadDetail(sheetId).then(
      (detail) => {
        if (!active) return
        setResult(detail ? { key, status: 'ready', detail } : { key, status: 'not-found' })
      },
      () => {
        if (active) setResult({ key, status: 'error' })
      },
    )
    return () => {
      active = false
    }
  }, [sheetId, key])

  const current = result?.key === key ? result : null
  const sheet = current?.status === 'ready' ? current.detail.sheet : null
  const title = sheet ? weekTitle(sheet.start_date) : ''

  return (
    <main className="sheet-screen">
      <div className="sheet-screen__content">
        <header className="sheet-screen__header">
          <nav className="sheet-screen__nav" aria-label="Opciones">
            <Link className="sheet-screen__nav-link" to="/historial">
              Historial
            </Link>
            <Link className="sheet-screen__nav-link" to="/ajustes">
              Ajustes
            </Link>
          </nav>
          <h1 className="sheet-screen__title">CONTROL SEMANAL de COMIDAS</h1>
          {sheet && (
            <div className="sheet-screen__week">
              {title && <h2 className="sheet-screen__week-title">{title}</h2>}
              <p className="sheet-screen__range">{weekRangeLabel(sheet.start_date)}</p>
              {/* key: al cambiar de tabla, el campo arranca con su propio valor */}
              <MenuNumberField key={sheet.id} sheetId={sheet.id} initial={sheet.menu_number} />
            </div>
          )}
        </header>

        {!current && (
          <p className="sheet-screen__status" role="status">
            Cargando tu semana…
          </p>
        )}

        {current?.status === 'error' && (
          <div className="sheet-screen__message" role="alert">
            <p>{LOAD_ERROR}</p>
            <button
              className="sheet-screen__button"
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Reintentar
            </button>
          </div>
        )}

        {current?.status === 'not-found' && (
          <div className="sheet-screen__message" role="alert">
            <p>No encontramos esta tabla. Puede que se haya eliminado.</p>
            <Link className="sheet-screen__button" to="/">
              Ir a la semana actual
            </Link>
          </div>
        )}

        {current?.status === 'ready' && (
          <WeekGrid
            monday={current.detail.sheet.start_date}
            meals={current.detail.meals}
            dailyLogs={current.detail.dailyLogs}
          />
        )}
      </div>
    </main>
  )
}

type MenuFeedback = { kind: 'saved' } | { kind: 'invalid' } | { kind: 'error' } | null

/** Interpreta el texto del campo: '' → null, entero ≥ 1 → número, resto → inválido. */
function parseMenu(raw: string, badInput: boolean): number | null | 'invalid' {
  if (badInput) return 'invalid'
  const text = raw.trim()
  if (text === '') return null
  if (!/^\d+$/.test(text)) return 'invalid'
  const value = Number(text)
  return value >= 1 ? value : 'invalid'
}

/**
 * "Menú nº" editable en línea. Se guarda al salir del campo o con Enter;
 * vacío quita el número. El aviso ("Guardado" o el error) va al lado del campo.
 */
function MenuNumberField({ sheetId, initial }: { sheetId: string; initial: number | null }) {
  const [draft, setDraft] = useState(initial === null ? '' : String(initial))
  const [feedback, setFeedback] = useState<MenuFeedback>(null)
  // Último valor guardado (o en camino): evita guardar dos veces lo mismo
  const lastSent = useRef<number | null | undefined>(initial)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Al desmontar, se cancela el temporizador de "Guardado"
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  async function save(input: HTMLInputElement) {
    const parsed = parseMenu(input.value, input.validity.badInput)
    clearTimeout(savedTimer.current)
    if (parsed === 'invalid') {
      setFeedback({ kind: 'invalid' })
      return
    }
    if (parsed === lastSent.current) {
      setFeedback(null)
      return
    }
    lastSent.current = parsed
    setFeedback(null)
    try {
      await updateMenuNumber(sheetId, parsed)
    } catch {
      // Se olvida lo enviado para poder reintentar con el mismo valor
      lastSent.current = undefined
      setFeedback({ kind: 'error' })
      return
    }
    setFeedback({ kind: 'saved' })
    savedTimer.current = setTimeout(() => setFeedback(null), SAVED_VISIBLE_MS)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void save(event.currentTarget)
    }
  }

  const problem = feedback?.kind === 'invalid' || feedback?.kind === 'error'
  const feedbackId = `menu-feedback-${sheetId}`

  return (
    <div className="sheet-screen__menu">
      <div className="sheet-screen__menu-row">
        <label className="sheet-screen__menu-label" htmlFor={`menu-${sheetId}`}>
          Menú nº
        </label>
        <input
          className="sheet-screen__menu-input"
          id={`menu-${sheetId}`}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={draft}
          aria-invalid={feedback?.kind === 'invalid' || undefined}
          aria-describedby={problem ? feedbackId : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => void save(event.currentTarget)}
          onKeyDown={handleKeyDown}
        />
        {feedback?.kind === 'saved' && (
          <span className="sheet-screen__saved" role="status">
            Guardado
          </span>
        )}
      </div>
      {problem && (
        <p className="sheet-screen__message" id={feedbackId} role="alert">
          {feedback.kind === 'invalid' ? INVALID_MENU : SAVE_ERROR}
        </p>
      )}
    </div>
  )
}

export default WeeklySheetScreen
