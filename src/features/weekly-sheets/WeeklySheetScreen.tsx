import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useParams } from 'react-router'
import { restoreEntry } from '../meals/api'
import { MealPanel, UndoBar } from '../meals/MealPanel'
import { TrackingPanel } from '../daily-tracking/TrackingPanel'
import {
  type DailyLog,
  getOrCreateCurrentSheet,
  getSheet,
  type SheetDetail,
  updateMenuNumber,
} from './api'
import { type ActiveCell, type MealCellTarget, type TrackingCellTarget, WeekGrid } from './WeekGrid'
import { weekRangeLabel, weekTitle } from './week'
import './WeeklySheetScreen.css'

const LOAD_ERROR = 'No hemos podido cargar tu semana. Revisa la conexión y prueba otra vez.'
const INVALID_MENU = 'Escribe un número a partir de 1'
const SAVE_ERROR = 'No hemos podido guardar el número de menú. Prueba otra vez.'
const REFRESH_ERROR = 'No hemos podido actualizar la tabla. Revisa la conexión y prueba otra vez.'
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
 * nº de menú editable en línea; debajo, la cuadrícula con las celdas de comida
 * editables (panel integrado bajo la fila tocada).
 *
 * Dos formas de cargar: la carga completa (clave tabla#intento, con
 * "Cargando tu semana…") y la recarga en segundo plano tras guardar o quitar,
 * que mantiene la tabla visible y solo cambia los datos cuando llegan.
 */
export function WeeklySheetScreen() {
  const { sheetId } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const key = `${sheetId ?? 'current'}#${attempt}`
  // Recargas en segundo plano: solo cuenta la última pedida
  const refreshSeq = useRef(0)
  // Clave de la carga cuya recarga falló (el aviso se olvida al cambiar de clave)
  const [refreshFailedKey, setRefreshFailedKey] = useState<string | null>(null)

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

  /** Recarga la tabla ya cargada sin quitarla de la pantalla. Nunca lanza. */
  async function refresh(): Promise<void> {
    if (current?.status !== 'ready') return
    const loadedKey = current.key
    const id = current.detail.sheet.id
    const seq = ++refreshSeq.current
    try {
      const detail = await getSheet(id)
      if (seq !== refreshSeq.current) return
      setRefreshFailedKey(null)
      // Si entretanto se cargó otra tabla (otra clave), se descarta
      setResult((prev) => {
        if (prev?.key !== loadedKey) return prev
        return detail
          ? { key: loadedKey, status: 'ready', detail }
          : { key: loadedKey, status: 'not-found' }
      })
    } catch {
      if (seq === refreshSeq.current) setRefreshFailedKey(loadedKey)
    }
  }

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
          // key: al cambiar de tabla, el panel y la barra de deshacer empiezan de cero
          <SheetEditor
            key={current.detail.sheet.id}
            detail={current.detail}
            onRefresh={refresh}
            refreshFailed={refreshFailedKey === key}
          />
        )}
      </div>
    </main>
  )
}

type SheetEditorProps = {
  detail: SheetDetail
  /** Recarga en segundo plano (nunca lanza). */
  onRefresh: () => Promise<void>
  /** La última recarga en segundo plano falló. */
  refreshFailed: boolean
}

/** Botón de la tabla al que vuelve el foco: el de una comida o el "+" de la celda. */
type FocusTarget = { day: number; row: string; entryId?: string }

/** Comida quitada que aún se puede recuperar con "Deshacer". */
type Undo = { entryId: string; day: number; row: string }

const isTrackingRow = (row: string) => row === 'water' || row === 'wc' || row === 'steps'

/**
 * Registros del día: los de la última carga, sustituidos por los guardados en
 * este editor si son más recientes. Así, reabrir un día antes de que llegue la
 * recarga no arranca el panel con valores viejos (que se volverían a guardar).
 */
function mergeLogs(loaded: DailyLog[], saved: Record<number, DailyLog>): DailyLog[] {
  const byDay = new Map(loaded.map((log) => [log.day_of_week, log]))
  for (const log of Object.values(saved)) {
    const current = byDay.get(log.day_of_week)
    if (!current || Date.parse(log.updated_at) >= Date.parse(current.updated_at)) {
      byDay.set(log.day_of_week, log)
    }
  }
  return [...byDay.values()]
}

/**
 * Tabla con edición: un solo panel abierto a la vez (activar otra celda lo
 * reemplaza), recarga tras guardar o quitar y barra "Comida quitada" con
 * Deshacer, integrada encima de la tabla. Las filas de seguimiento abren el
 * panel del día (TrackingPanel), que guarda solo y no se cierra al recargar.
 */
function SheetEditor({ detail, onRefresh, refreshFailed }: SheetEditorProps) {
  const [active, setActive] = useState<ActiveCell | null>(null)
  const [undo, setUndo] = useState<Undo | null>(null)
  // Último registro guardado de cada día en este editor (ver mergeLogs)
  const [savedLogs, setSavedLogs] = useState<Record<number, DailyLog>>({})
  const dailyLogs = mergeLogs(detail.dailyLogs, savedLogs)
  // Petición de foco; el objeto nuevo en cada petición hace que el efecto vuelva a correr
  const [focusRequest, setFocusRequest] = useState<FocusTarget | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Devuelve el foco al botón pedido cuando el panel ya se ha cerrado. Si la
  // comida ya no está (p. ej. se acaba de quitar), va al "+" de esa celda.
  useEffect(() => {
    const root = gridRef.current
    if (!focusRequest || !root) return
    const cell = `button[data-day="${focusRequest.day}"][data-row="${focusRequest.row}"]`
    const entryButton = focusRequest.entryId
      ? root.querySelector<HTMLElement>(`${cell}[data-entry-id="${focusRequest.entryId}"]`)
      : null
    const target = entryButton ?? root.querySelector<HTMLElement>(`${cell}:not([data-entry-id])`)
    target?.focus()
  }, [focusRequest])

  // Comida que se edita; si ya no existe (recarga), no se pinta el panel
  const editingEntry = active?.entryId
    ? detail.meals.find((meal) => meal.id === active.entryId)
    : undefined

  function handleActivate(target: MealCellTarget, entryId?: string) {
    const same =
      active !== null &&
      active.day === target.day &&
      active.row === target.row &&
      active.entryId === entryId
    // Volver a tocar el botón que abrió el panel lo cierra (aria-expanded)
    setActive(same ? null : { day: target.day, row: target.row, entryId })
  }

  function handleTrackingActivate(target: TrackingCellTarget) {
    if (active !== null && isTrackingRow(active.row) && active.day === target.day) {
      // Mismo botón: lo cierra (aria-expanded). Otra fila de seguimiento del
      // mismo día: el panel ya tiene los tres datos y se deja donde está;
      // moverlo lo remontaría y podría arrancar sin el guardado aún en curso.
      if (active.row === target.row) setActive(null)
      return
    }
    setActive({ day: target.day, row: target.row })
  }

  function handleTrackingSaved(log: DailyLog) {
    setSavedLogs((prev) => ({ ...prev, [log.day_of_week]: log }))
    // Recarga en segundo plano: el panel sigue abierto (su key no cambia)
    void onRefresh()
  }

  function closePanel(focus: FocusTarget | null) {
    setActive(null)
    if (focus) setFocusRequest({ ...focus })
  }

  function handleRemoved(cell: ActiveCell, entryId: string) {
    // La barra nueva sustituye a la anterior (key distinta)
    setUndo({ entryId, day: cell.day, row: cell.row })
    closePanel({ day: cell.day, row: cell.row })
    void onRefresh()
  }

  async function handleUndo(item: Undo) {
    // Si falla, lanza y la barra lo avisa en línea
    await restoreEntry(item.entryId)
    setUndo(null)
    setFocusRequest({ day: item.day, row: item.row })
    await onRefresh()
  }

  function renderPanel() {
    if (!active) return null
    const cell = active
    if (cell.row === 'water' || cell.row === 'wc' || cell.row === 'steps') {
      // key por tabla y día: recargar no lo remonta (el log solo se lee al montar)
      return (
        <TrackingPanel
          key={`${detail.sheet.id}-${cell.day}`}
          sheetId={detail.sheet.id}
          dayOfWeek={cell.day}
          log={dailyLogs.find((log) => log.day_of_week === cell.day)}
          onSaved={handleTrackingSaved}
          onClose={() => closePanel({ day: cell.day, row: cell.row })}
        />
      )
    }
    if (cell.entryId && !editingEntry) return null
    const mealSlot = cell.row
    return (
      <MealPanel
        key={`${cell.day}|${cell.row}|${cell.entryId ?? 'nueva'}`}
        sheetId={detail.sheet.id}
        dayOfWeek={cell.day}
        mealSlot={mealSlot}
        entry={editingEntry}
        onSaved={() => {
          closePanel(cell)
          void onRefresh()
        }}
        onClose={() => closePanel(cell)}
        onRemoved={(entryId) => handleRemoved(cell, entryId)}
      />
    )
  }

  return (
    <div className="sheet-screen__editor">
      {refreshFailed && (
        <div className="sheet-screen__message" role="alert">
          <p>{REFRESH_ERROR}</p>
          <button className="sheet-screen__button" type="button" onClick={() => void onRefresh()}>
            Reintentar
          </button>
        </div>
      )}

      {undo && (
        <UndoBar
          key={undo.entryId}
          message="Comida quitada"
          onUndo={() => handleUndo(undo)}
          onClose={() => setUndo(null)}
        />
      )}

      <div ref={gridRef}>
        <WeekGrid
          monday={detail.sheet.start_date}
          meals={detail.meals}
          dailyLogs={dailyLogs}
          onCellActivate={handleActivate}
          onTrackingActivate={handleTrackingActivate}
          activeCell={active}
          renderPanel={renderPanel}
          // En móvil, cambiar de día cierra el panel: era del día anterior
          onDayChange={() => setActive(null)}
        />
      </div>
    </div>
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
