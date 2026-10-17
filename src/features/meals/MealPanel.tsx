// Panel integrado para apuntar o editar una comida en una celda (spec 007).
// Se monta dentro de la tabla (fila bajo la fila tocada); aquí es autónomo:
// carga el catálogo, deja elegir o crear la comida, ajustar cantidad y unidad,
// marcar favorita, corregir el nombre, guardar, quitar y mover a otra celda
// ("Mover a…", spec 008: alternativa sin arrastre). Nunca abre ventanas.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Stepper } from '../../components/Stepper'
import { UnitPicker } from '../../components/UnitPicker'
import { stepForUnit } from '../../components/units'
import { MEAL_SLOTS, type MealEntryWithFood, type MealSlot } from '../weekly-sheets/api'
import { dayName, dayShortLetter } from '../weekly-sheets/week'
import {
  getFoodUsage,
  listFoods,
  renameFood,
  resolveFoodForName,
  saveMealEntry,
  setFavorite,
  softDeleteEntry,
  type Food,
  type FoodUsage,
  type MoveTarget,
} from './api'
import { FoodCombobox } from './FoodCombobox'
import { findExactMatch, prepareCatalog } from './normalize'
import './MealPanel.css'

export type MealPanelProps = {
  sheetId: string
  dayOfWeek: number
  mealSlot: MealSlot
  /** Entrada que se edita; si no viene, se apunta una comida nueva. */
  entry?: MealEntryWithFood
  onSaved: () => void
  onClose: () => void
  onRemoved: (entryId: string) => void
  /**
   * Mueve la entrada al final de otra celda ("Mover a…"). Lo hace el contenedor,
   * que conoce las demás entradas de la celda destino; si la promesa falla, el
   * panel lo avisa en línea. Sin esta prop (o sin entrada) no hay "Mover a…".
   */
  onMove?: (target: MealMoveTarget) => Promise<void>
}

/** Celda destino elegida en "Mover a…" (siempre al final de la celda). */
export type MealMoveTarget = Pick<MoveTarget, 'day' | 'slot'>

type LoadState = 'loading' | 'error' | 'ready'

const LOAD_ERROR = 'No hemos podido cargar tus comidas. Revisa la conexión y prueba otra vez.'
const SAVE_ERROR = 'No hemos podido guardar la comida. Prueba otra vez en un momento.'
const REMOVE_ERROR = 'No hemos podido quitar la comida. Prueba otra vez en un momento.'
const FAVORITE_ERROR = 'No hemos podido guardar la favorita. Prueba otra vez.'
const RENAME_ERROR = 'No hemos podido cambiar el nombre. Prueba otra vez.'
const NAME_TAKEN = 'Ya tienes una comida con ese nombre'
const NAME_EMPTY = 'Escribe un nombre para la comida.'
const MOVE_ERROR = 'No hemos podido mover la comida. Prueba otra vez en un momento.'

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7] as const

/** "Desayuno · martes" */
function panelTitle(slot: MealSlot, day: number): string {
  const label = MEAL_SLOTS.find((s) => s.slot === slot)?.label ?? ''
  return `${label} · ${dayName(day)}`
}

/**
 * Panel de una comida: elegir/crear, cantidad, unidad, favorita, corregir
 * nombre, guardar y quitar. Errores siempre en línea, junto a lo que falló.
 */
export function MealPanel({
  sheetId,
  dayOfWeek,
  mealSlot,
  entry,
  onSaved,
  onClose,
  onRemoved,
  onMove,
}: MealPanelProps) {
  const baseId = useId()
  const titleId = `${baseId}-title`
  const foodInputId = `${baseId}-food`
  const foodErrorId = `${baseId}-food-error`
  const renameInputId = `${baseId}-rename`
  const moveTitleId = `${baseId}-move-title`
  const moveSlotId = `${baseId}-move-slot`

  // Catálogo y uso por momento del día
  const [foods, setFoods] = useState<Food[]>([])
  const [usage, setUsage] = useState<FoodUsage>(() => new Map())
  const [loadState, setLoadState] = useState<LoadState>('loading')
  // Cambia para volver a cargar (botón "Reintentar")
  const [loadKey, setLoadKey] = useState(0)

  // Formulario (precargado si se edita una entrada)
  const [text, setText] = useState(entry?.food_name ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(entry?.food_id ?? null)
  const [quantity, setQuantity] = useState<number | null>(entry?.quantity ?? null)
  const [unit, setUnit] = useState<string | null>(entry?.unit ?? null)

  const [nameError, setNameError] = useState<string | null>(null)
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'remove' | 'move' | null>(null)

  // "Mover a…": selector en línea de día y momento (por defecto, la celda actual)
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveDay, setMoveDay] = useState(dayOfWeek)
  const [moveSlot, setMoveSlot] = useState<MealSlot>(mealSlot)
  const [moveError, setMoveError] = useState<string | null>(null)
  const moveButtonRef = useRef<HTMLButtonElement>(null)
  const moveGroupRef = useRef<HTMLDivElement>(null)
  // Si el selector estaba abierto en el render anterior (para mover el foco)
  const moveWasOpen = useRef(false)

  // Favorita y corrección de nombre de la comida elegida
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [favoriteError, setFavoriteError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameText, setRenameText] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  // Carga en paralelo; el estado solo se toca cuando llega la respuesta
  useEffect(() => {
    let active = true
    Promise.all([listFoods(), getFoodUsage()]).then(
      ([foodList, usageMap]) => {
        if (!active) return
        setFoods(foodList)
        setUsage(usageMap)
        setLoadState('ready')
      },
      () => {
        if (active) setLoadState('error')
      },
    )
    return () => {
      active = false
    }
  }, [loadKey])

  // Cuando el formulario aparece, el foco va al campo de comida
  useEffect(() => {
    if (loadState === 'ready') document.getElementById(foodInputId)?.focus()
  }, [loadState, foodInputId])

  const catalog = useMemo(() => prepareCatalog(foods), [foods])
  const selectedFood = selectedId ? foods.find((food) => food.id === selectedId) : undefined

  function retryLoad() {
    setLoadState('loading')
    setLoadKey((key) => key + 1)
  }

  function handleInputChange(next: string) {
    setText(next)
    setNameError(null)
    // Si el texto deja de ser el de la comida elegida, ya no hay comida elegida
    const chosenName = selectedFood?.name ?? (selectedId === entry?.food_id ? entry?.food_name : '')
    if (selectedId && next !== chosenName) {
      setSelectedId(null)
      cancelRename()
    }
  }

  function handleSelectFood(food: Food) {
    setSelectedId(food.id)
    setNameError(null)
    setFavoriteError(null)
    cancelRename()
    // Cantidad y unidad habituales; si no tiene, se dejan las actuales
    if (food.default_quantity !== null) {
      setQuantity(food.default_quantity)
      setQuantityError(null)
    }
    if (food.default_unit !== null) setUnit(food.default_unit)
  }

  function handleSelectNew() {
    // Comida nueva con el nombre escrito: no hay comida del catálogo elegida
    setSelectedId(null)
    setNameError(null)
    cancelRename()
  }

  async function handleSave() {
    if (busy) return
    const name = text.trim()
    const nameMsg = name === '' ? 'Escribe qué has comido' : null
    const quantityMsg =
      quantity === null ? 'Escribe la cantidad' : quantity <= 0 ? 'Tiene que ser mayor que 0' : null
    setNameError(nameMsg)
    setQuantityError(quantityMsg)
    if (nameMsg || quantityMsg) {
      if (nameMsg) document.getElementById(foodInputId)?.focus()
      return
    }

    // Comida elegida del catálogo, o se resuelve el nombre escrito (sin duplicados)
    const food = selectedId ? { foodId: selectedId } : resolveFoodForName(catalog, name)

    setBusy('save')
    setActionError(null)
    try {
      await saveMealEntry({
        entryId: entry?.id,
        sheetId,
        dayOfWeek,
        mealSlot,
        ...food,
        quantity,
        unit,
      })
    } catch {
      setActionError(SAVE_ERROR)
      setBusy(null)
      return
    }
    setBusy(null)
    onSaved()
  }

  async function handleRemove() {
    if (busy || !entry) return
    setBusy('remove')
    setActionError(null)
    try {
      await softDeleteEntry(entry.id)
    } catch {
      setActionError(REMOVE_ERROR)
      setBusy(null)
      return
    }
    setBusy(null)
    onRemoved(entry.id)
  }

  async function handleToggleFavorite(food: Food) {
    if (favoriteBusy) return
    const next = !food.is_favorite
    setFavoriteBusy(true)
    setFavoriteError(null)
    try {
      await setFavorite(food.id, next)
      setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, is_favorite: next } : f)))
    } catch {
      setFavoriteError(FAVORITE_ERROR)
    }
    setFavoriteBusy(false)
  }

  function startRename(food: Food) {
    setRenaming(true)
    setRenameText(food.name)
    setRenameError(null)
  }

  function cancelRename() {
    setRenaming(false)
    setRenameError(null)
  }

  async function handleRename(food: Food) {
    if (renameBusy) return
    const name = renameText.trim()
    if (name === '') {
      setRenameError(NAME_EMPTY)
      return
    }
    if (name === food.name) {
      cancelRename()
      return
    }
    // La BD solo compara sin mayúsculas; aquí también sin tildes
    const clash = findExactMatch(catalog, name)
    if (clash && clash.id !== food.id) {
      setRenameError(NAME_TAKEN)
      return
    }
    setRenameBusy(true)
    setRenameError(null)
    try {
      await renameFood(food.id, name)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setRenameError(message === NAME_TAKEN || message === NAME_EMPTY ? message : RENAME_ERROR)
      setRenameBusy(false)
      return
    }
    setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, name } : f)))
    setText(name)
    setRenameBusy(false)
    setRenaming(false)
  }

  function openMove() {
    setMoveDay(dayOfWeek)
    setMoveSlot(mealSlot)
    setMoveError(null)
    setMoveOpen(true)
  }

  function cancelMove() {
    setMoveOpen(false)
    setMoveError(null)
  }

  // Al abrir el selector, el foco va al día elegido; al cerrarlo sin mover,
  // vuelve a "Mover a…" (que se pinta de nuevo en ese mismo render)
  useEffect(() => {
    if (moveOpen && !moveWasOpen.current) {
      moveGroupRef.current?.querySelector<HTMLElement>('button[aria-pressed="true"]')?.focus()
    } else if (!moveOpen && moveWasOpen.current) {
      moveButtonRef.current?.focus()
    }
    moveWasOpen.current = moveOpen
  }, [moveOpen])

  const moveIsSameCell = moveDay === dayOfWeek && moveSlot === mealSlot

  async function handleMove() {
    if (busy || !onMove || moveIsSameCell) return
    setBusy('move')
    setMoveError(null)
    try {
      // Si va bien, el contenedor cierra el panel
      await onMove({ day: moveDay, slot: moveSlot })
    } catch {
      setMoveError(MOVE_ERROR)
    }
    setBusy(null)
  }

  // Escape cierra el panel, salvo que lo use antes otro control (lista abierta,
  // vaciar el campo de comida, cancelar la corrección de nombre…)
  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    const target = event.target as HTMLElement
    const isIdleCombobox =
      target.getAttribute('role') === 'combobox' &&
      target.getAttribute('aria-expanded') !== 'true' &&
      (target as HTMLInputElement).value === ''
    if (event.defaultPrevented && !isIdleCombobox) return
    event.preventDefault()
    onClose()
  }

  const title = panelTitle(mealSlot, dayOfWeek)

  return (
    <div
      className="meal-panel"
      role="group"
      aria-labelledby={titleId}
      onKeyDown={handlePanelKeyDown}
    >
      <div className="meal-panel__content">
        <h2 className="meal-panel__title" id={titleId}>
          {title}
        </h2>

        {loadState === 'loading' && <p className="meal-panel__status">Cargando tus comidas…</p>}

        {loadState === 'error' && (
          <div className="meal-panel__message" role="alert">
            <p>{LOAD_ERROR}</p>
            <button className="meal-panel__button" type="button" onClick={retryLoad}>
              Reintentar
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <>
            <div className="meal-panel__food">
              <FoodCombobox
                id={foodInputId}
                foods={foods}
                usage={usage}
                mealSlot={mealSlot}
                value={text}
                onInputChange={handleInputChange}
                onSelectFood={handleSelectFood}
                onSelectNew={handleSelectNew}
              />
              {nameError && (
                <p className="meal-panel__field-error" id={foodErrorId} role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {selectedFood && (
              <div className="meal-panel__food-tools">
                <div className="meal-panel__actions">
                  <button
                    className="meal-panel__button meal-panel__button--small"
                    type="button"
                    aria-pressed={selectedFood.is_favorite}
                    disabled={favoriteBusy}
                    onClick={() => void handleToggleFavorite(selectedFood)}
                  >
                    <span className="meal-panel__star" aria-hidden="true">
                      {selectedFood.is_favorite ? '★' : '☆'}
                    </span>
                    {selectedFood.is_favorite ? 'Es favorita' : 'Marcar como favorita'}
                  </button>
                  {!renaming && (
                    <button
                      className="meal-panel__button meal-panel__button--small"
                      type="button"
                      onClick={() => startRename(selectedFood)}
                    >
                      Corregir nombre
                    </button>
                  )}
                </div>
                <InlineError message={favoriteError} />

                {renaming && (
                  <div className="meal-panel__rename" role="group" aria-label="Corregir nombre">
                    <label className="meal-panel__label" htmlFor={renameInputId}>
                      Nombre correcto
                    </label>
                    <input
                      className="meal-panel__input"
                      id={renameInputId}
                      type="text"
                      autoComplete="off"
                      autoCapitalize="sentences"
                      value={renameText}
                      onChange={(event) => {
                        setRenameText(event.target.value)
                        setRenameError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void handleRename(selectedFood)
                        } else if (event.key === 'Escape') {
                          // Cancela la corrección sin cerrar el panel
                          event.preventDefault()
                          cancelRename()
                        }
                      }}
                    />
                    <InlineError message={renameError} />
                    <div className="meal-panel__actions">
                      <button
                        className="meal-panel__button meal-panel__button--primary"
                        type="button"
                        disabled={renameBusy}
                        onClick={() => void handleRename(selectedFood)}
                      >
                        {renameBusy ? 'Guardando…' : 'Guardar nombre'}
                      </button>
                      <button
                        className="meal-panel__button"
                        type="button"
                        disabled={renameBusy}
                        onClick={cancelRename}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="meal-panel__amount">
              <Stepper
                label="Cantidad"
                value={quantity}
                onChange={(next) => {
                  setQuantity(next)
                  setQuantityError(null)
                }}
                step={stepForUnit(unit)}
                min={0}
                minExclusive
                allowDecimals
                error={quantityError ?? undefined}
              />
              <UnitPicker value={unit} onChange={setUnit} />
            </div>
          </>
        )}

        <InlineError message={actionError} />

        <div className="meal-panel__actions">
          {loadState === 'ready' && (
            <button
              className="meal-panel__button meal-panel__button--primary"
              type="button"
              disabled={busy !== null}
              onClick={() => void handleSave()}
            >
              {busy === 'save' ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          <button
            className="meal-panel__button"
            type="button"
            disabled={busy !== null}
            onClick={onClose}
          >
            Cancelar
          </button>
          {entry && onMove && !moveOpen && (
            <button
              ref={moveButtonRef}
              className="meal-panel__button"
              type="button"
              disabled={busy !== null}
              onClick={openMove}
            >
              Mover a…
            </button>
          )}
          {entry && loadState === 'ready' && (
            <button
              className="meal-panel__button meal-panel__button--remove"
              type="button"
              disabled={busy !== null}
              onClick={() => void handleRemove()}
            >
              {busy === 'remove' ? 'Quitando…' : 'Quitar de aquí'}
            </button>
          )}
        </div>

        {entry && onMove && moveOpen && (
          <div
            ref={moveGroupRef}
            className="meal-panel__move"
            role="group"
            aria-labelledby={moveTitleId}
            onKeyDown={(event) => {
              // Escape cancela el selector sin cerrar el panel
              if (event.key === 'Escape') {
                event.preventDefault()
                if (busy === null) cancelMove()
              }
            }}
          >
            <h3 className="meal-panel__label meal-panel__move-title" id={moveTitleId}>
              Mover a…
            </h3>
            <div className="meal-panel__move-days" role="group" aria-label="Día">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day}
                  className="meal-panel__day"
                  type="button"
                  aria-label={dayName(day)}
                  aria-pressed={day === moveDay}
                  disabled={busy !== null}
                  onClick={() => {
                    setMoveDay(day)
                    setMoveError(null)
                  }}
                >
                  {dayShortLetter(day)}
                </button>
              ))}
            </div>
            <div className="meal-panel__move-slot">
              <label className="meal-panel__label" htmlFor={moveSlotId}>
                Momento
              </label>
              <select
                className="meal-panel__input"
                id={moveSlotId}
                value={moveSlot}
                disabled={busy !== null}
                onChange={(event) => {
                  setMoveSlot(event.target.value as MealSlot)
                  setMoveError(null)
                }}
              >
                {MEAL_SLOTS.map(({ slot, label }) => (
                  <option key={slot} value={slot}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <InlineError message={moveError} />
            <div className="meal-panel__actions">
              <button
                className="meal-panel__button meal-panel__button--primary"
                type="button"
                disabled={busy !== null || moveIsSameCell}
                onClick={() => void handleMove()}
              >
                {busy === 'move' ? 'Moviendo…' : moveIsSameCell ? 'Ya está aquí' : 'Mover aquí'}
              </button>
              <button
                className="meal-panel__button"
                type="button"
                disabled={busy !== null}
                onClick={cancelMove}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export type UndoBarProps = {
  /** Texto de la barra, p. ej. "Comida quitada". */
  message: string
  /** Deshace la acción. Si devuelve una promesa, el botón espera y un fallo se avisa en línea. */
  onUndo: () => void | Promise<void>
  onClose: () => void
}

/**
 * Barra "Comida quitada · Deshacer" integrada en el flujo de la página (nunca
 * flotante). La pinta el contenedor, porque el panel ya se ha cerrado.
 */
export function UndoBar({ message, onUndo, onClose }: UndoBarProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUndo() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await onUndo()
    } catch {
      setError('No hemos podido deshacerlo. Prueba otra vez.')
    }
    setBusy(false)
  }

  return (
    <div className="meal-undo" role="status">
      <p className="meal-undo__text">{message}</p>
      <InlineError message={error} />
      <div className="meal-panel__actions">
        <button
          className="meal-panel__button meal-panel__button--primary"
          type="button"
          disabled={busy}
          onClick={() => void handleUndo()}
        >
          Deshacer
        </button>
        <button className="meal-panel__button" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}

/** Mensaje de error en línea, cálido, junto a la acción que falló. */
function InlineError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="meal-panel__message" role="alert">
      {message}
    </p>
  )
}

export default MealPanel
