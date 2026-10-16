import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  createSheet,
  duplicateSheet,
  groupSheetsByWeek,
  isOnlySheetOfWeek,
  listSheets,
  restoreSheet,
  softDeleteSheet,
  type WeeklySheet,
} from './api'
import { addDays, type IsoDate, mondayOf, todayIso, weekShortLabel, weekTitle } from './week'
import { WeekPicker } from './WeekPicker'
import './HistoryScreen.css'

// Panel abierto: solo uno a la vez (nueva tabla, duplicar o confirmar borrado)
type Panel =
  | { kind: 'new'; week: IsoDate }
  | { kind: 'duplicate'; id: string; week: IsoDate }
  | { kind: 'delete'; id: string }
  | null

type LoadState = 'loading' | 'error' | 'ready'

const LOAD_ERROR = 'No hemos podido cargar tus tablas. Revisa la conexión y prueba otra vez.'
const CREATE_ERROR = 'No hemos podido crear la tabla. Prueba otra vez en un momento.'
const DUPLICATE_ERROR = 'No hemos podido duplicar la tabla. Prueba otra vez en un momento.'
const DELETE_ERROR = 'No hemos podido eliminar la tabla. Prueba otra vez en un momento.'
const UNDO_ERROR = 'No hemos podido recuperar la tabla. Prueba otra vez.'
const ONLY_SHEET = 'Es la única tabla de esta semana'

function weekHeading(monday: IsoDate): string {
  const title = weekTitle(monday)
  const range = weekShortLabel(monday)
  return title ? `${title} · ${range}` : range
}

function menuLabel(sheet: WeeklySheet): string {
  return sheet.menu_number !== null ? `Menú ${sheet.menu_number}` : 'Sin número de menú'
}

/**
 * Historial de tablas semanales: abrir, crear, duplicar y eliminar (con
 * confirmación en línea y deshacer). Todo en paneles integrados, sin ventanas.
 */
export function HistoryScreen() {
  const navigate = useNavigate()
  const [sheets, setSheets] = useState<WeeklySheet[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  // Error de la acción del panel abierto (se muestra junto a ese panel)
  const [actionError, setActionError] = useState<string | null>(null)
  // Última tabla eliminada: mantiene visible la barra "Deshacer"
  const [deletedId, setDeletedId] = useState<string | null>(null)
  const [undoError, setUndoError] = useState<string | null>(null)

  // Recarga la lista. Solo la primera carga (o un reintento) enseña "Cargando…"
  const reload = useCallback(async () => {
    try {
      const list = await listSheets()
      setSheets(list)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  // Primera carga: el estado solo se toca cuando llega la respuesta
  useEffect(() => {
    let active = true
    listSheets().then(
      (list) => {
        if (!active) return
        setSheets(list)
        setLoadState('ready')
      },
      () => {
        if (active) setLoadState('error')
      },
    )
    return () => {
      active = false
    }
  }, [])

  function openPanel(next: Panel) {
    setPanel(next)
    setActionError(null)
  }

  function closePanel() {
    setPanel(null)
    setActionError(null)
  }

  function retryLoad() {
    setLoadState('loading')
    void reload()
  }

  async function handleCreate(week: IsoDate) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      const sheet = await createSheet(week)
      navigate(`/tabla/${sheet.id}`)
    } catch {
      setActionError(CREATE_ERROR)
      setBusy(false)
    }
  }

  async function handleDuplicate(id: string, week: IsoDate) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      const newId = await duplicateSheet(id, week)
      navigate(`/tabla/${newId}`)
    } catch {
      setActionError(DUPLICATE_ERROR)
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    try {
      await softDeleteSheet(id)
    } catch (error) {
      // El caso "única tabla" ya viene con un texto claro desde la API
      const message = error instanceof Error && error.message === ONLY_SHEET ? ONLY_SHEET : null
      setActionError(message ?? DELETE_ERROR)
      setBusy(false)
      return
    }
    setPanel(null)
    setDeletedId(id)
    setUndoError(null)
    await reload()
    setBusy(false)
  }

  async function handleUndo() {
    if (busy || !deletedId) return
    setBusy(true)
    setUndoError(null)
    try {
      await restoreSheet(deletedId)
    } catch {
      setUndoError(UNDO_ERROR)
      setBusy(false)
      return
    }
    setDeletedId(null)
    await reload()
    setBusy(false)
  }

  function closeUndoBar() {
    setDeletedId(null)
    setUndoError(null)
  }

  const groups = groupSheetsByWeek(sheets)

  return (
    <main className="history">
      <div className="history__content">
        <header className="history__header">
          <Link className="history__back" to="/">
            ← Volver
          </Link>
          <h1 className="history__title">Historial</h1>
          <button
            className="history__button history__button--primary"
            type="button"
            aria-expanded={panel?.kind === 'new'}
            aria-controls="history-new-panel"
            onClick={() =>
              panel?.kind === 'new'
                ? closePanel()
                : openPanel({ kind: 'new', week: mondayOf(todayIso()) })
            }
          >
            Nueva tabla
          </button>
        </header>

        {panel?.kind === 'new' && (
          <section className="history__panel" id="history-new-panel" aria-label="Nueva tabla">
            <p className="history__panel-text">¿De qué semana es la tabla nueva?</p>
            <WeekPicker
              value={panel.week}
              label="Semana de la tabla nueva"
              onChange={(week) => setPanel({ kind: 'new', week })}
            />
            <InlineError message={actionError} />
            <div className="history__actions">
              <button
                className="history__button history__button--primary"
                type="button"
                disabled={busy}
                onClick={() => void handleCreate(panel.week)}
              >
                {busy ? 'Creando…' : 'Crear'}
              </button>
              <button
                className="history__button"
                type="button"
                disabled={busy}
                onClick={closePanel}
              >
                Cancelar
              </button>
            </div>
          </section>
        )}

        {deletedId && (
          <div className="history__undo" role="status">
            <p className="history__undo-text">Tabla eliminada</p>
            <InlineError message={undoError} />
            <div className="history__actions">
              <button
                className="history__button history__button--primary"
                type="button"
                disabled={busy}
                onClick={() => void handleUndo()}
              >
                Deshacer
              </button>
              <button className="history__button" type="button" onClick={closeUndoBar}>
                Cerrar
              </button>
            </div>
          </div>
        )}

        {loadState === 'loading' && <p className="history__status">Cargando…</p>}

        {loadState === 'error' && (
          <div className="history__message" role="alert">
            <p>{LOAD_ERROR}</p>
            <button className="history__button" type="button" onClick={retryLoad}>
              Reintentar
            </button>
          </div>
        )}

        {loadState === 'ready' && groups.length === 0 && (
          <p className="history__status">
            Todavía no tienes tablas. Crea la primera con «Nueva tabla».
          </p>
        )}

        {loadState === 'ready' &&
          groups.map((group) => (
            <section
              className="history__week"
              key={group.monday}
              aria-labelledby={`week-${group.monday}`}
            >
              <h2 className="history__week-title" id={`week-${group.monday}`}>
                {weekHeading(group.monday)}
              </h2>
              <ul className="history__list">
                {group.sheets.map((sheet) => {
                  const only = isOnlySheetOfWeek(sheet, sheets)
                  const hintId = `only-${sheet.id}`
                  const isDuplicating = panel?.kind === 'duplicate' && panel.id === sheet.id
                  const isConfirming = panel?.kind === 'delete' && panel.id === sheet.id
                  return (
                    <li className="history__item" key={sheet.id}>
                      <p className="history__menu">{menuLabel(sheet)}</p>
                      <div className="history__actions">
                        <Link
                          className="history__button history__button--primary"
                          to={`/tabla/${sheet.id}`}
                        >
                          Abrir
                        </Link>
                        <button
                          className="history__button"
                          type="button"
                          aria-expanded={isDuplicating}
                          onClick={() =>
                            isDuplicating
                              ? closePanel()
                              : openPanel({
                                  kind: 'duplicate',
                                  id: sheet.id,
                                  week: addDays(sheet.start_date, 7),
                                })
                          }
                        >
                          Duplicar
                        </button>
                        <button
                          className="history__button"
                          type="button"
                          disabled={only}
                          aria-describedby={only ? hintId : undefined}
                          onClick={() =>
                            isConfirming
                              ? closePanel()
                              : openPanel({ kind: 'delete', id: sheet.id })
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                      {only && (
                        <p className="history__hint" id={hintId}>
                          {ONLY_SHEET}
                        </p>
                      )}

                      {isDuplicating && (
                        <div className="history__panel" aria-label="Duplicar tabla" role="group">
                          <p className="history__panel-text">¿A qué semana la copiamos?</p>
                          <WeekPicker
                            value={panel.week}
                            label="Semana de la copia"
                            onChange={(week) => setPanel({ kind: 'duplicate', id: sheet.id, week })}
                          />
                          <InlineError message={actionError} />
                          <div className="history__actions">
                            <button
                              className="history__button history__button--primary"
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDuplicate(sheet.id, panel.week)}
                            >
                              {busy ? 'Duplicando…' : 'Duplicar aquí'}
                            </button>
                            <button
                              className="history__button"
                              type="button"
                              disabled={busy}
                              onClick={closePanel}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      {isConfirming && (
                        <div className="history__panel" role="group" aria-label="Confirmar">
                          <p className="history__panel-text">¿Eliminar esta tabla?</p>
                          <InlineError message={actionError} />
                          <div className="history__actions">
                            <button
                              className="history__button history__button--primary"
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(sheet.id)}
                            >
                              Sí, eliminar
                            </button>
                            <button
                              className="history__button"
                              type="button"
                              disabled={busy}
                              onClick={closePanel}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
      </div>
    </main>
  )
}

/** Mensaje de error en línea, cálido, junto a la acción que falló. */
function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="history__message" role="alert">
      {message}
    </p>
  )
}

export default HistoryScreen
