// Campo "¿Qué has comido?" con sugerencias (spec 007).
// Sigue el patrón WAI-ARIA APG "Combobox With List Autocomplete" con selección
// manual: escribir nunca elige nada por sí solo; hay que pulsar Enter sobre una
// opción activa o tocarla. Componente presentacional: no hace peticiones.
//
// Teclado:
// - ↓ / ↑: mueven la opción activa. Si la lista está cerrada, la abren y activan
//   la primera (↓) o la última (↑). En los extremos CICLAN (de la última a la
//   primera y al revés), como el ejemplo de APG.
// - Enter: elige la opción activa. Sin opción activa no hace nada.
// - Escape: cierra la lista; si ya estaba cerrada, vacía el campo.
// - Tab: sale del campo sin elegir (la lista se cierra al perder el foco).
//
// La lista va bajo el campo, en el flujo del panel (no flota ni tapa nada).

import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { MEAL_SLOTS, type MealSlot } from '../weekly-sheets/api'
import { topFoodsForSlot, type Food, type FoodUsage } from './api'
import { findExactMatch, prepareCatalog, searchFoods } from './normalize'
import './FoodCombobox.css'

export type FoodComboboxProps = {
  foods: Food[]
  usage: FoodUsage
  mealSlot: MealSlot
  /** Texto del campo (controlado por el padre). */
  value: string
  onInputChange: (text: string) => void
  /**
   * Se elige una comida del catálogo. Antes se llama a onInputChange(food.name)
   * para que el campo muestre su nombre.
   */
  onSelectFood: (food: Food) => void
  /** Se elige "Añadir «…»". Antes se llama a onInputChange(nombre) con el texto recortado. */
  onSelectNew: (name: string) => void
  id?: string
  label?: string
}

/** Máximo de sugerencias en cada grupo / búsqueda. */
const TOP_LIMIT = 6
const SEARCH_LIMIT = 8

type Option = { kind: 'food'; key: string; food: Food } | { kind: 'new'; key: string; name: string }

type Group = { key: string; title: string; options: Option[] }

/** "en el desayuno", "en la comida"…: etiqueta del momento en minúscula con artículo. */
function slotPhrase(slot: MealSlot): string {
  const label = MEAL_SLOTS.find((s) => s.slot === slot)?.label ?? ''
  const article = slot === 'breakfast' ? 'el' : 'la'
  return `en ${article} ${label.toLowerCase()}`
}

/** Cantidad y unidad habituales en texto ("2 unidad", "1,5 taza"), o '' si no hay. */
function usualAmount(food: Food): string {
  const quantity =
    food.default_quantity === null ? '' : food.default_quantity.toLocaleString('es-ES')
  return [quantity, food.default_unit ?? ''].filter((part) => part !== '').join(' ')
}

const foodOption = (food: Food): Option => ({ kind: 'food', key: food.id, food })

export function FoodCombobox({
  foods,
  usage,
  mealSlot,
  value,
  onInputChange,
  onSelectFood,
  onSelectNew,
  id,
  label = '¿Qué has comido?',
}: FoodComboboxProps) {
  const autoId = useId()
  const inputId = id ?? `food-combobox-${autoId}`
  const listboxId = `${inputId}-listbox`
  const optionId = (index: number) => `${inputId}-option-${index}`

  const [open, setOpen] = useState(false)
  // -1 = ninguna opción activa (nunca hay selección automática)
  const [activeIndex, setActiveIndex] = useState(-1)

  // El catálogo guarda la comida original para devolverla tal cual (sin `normalized`)
  const catalog = useMemo(
    () => prepareCatalog(foods.map((food) => ({ name: food.name, food }))),
    [foods],
  )
  const query = value.trim()

  // Grupos visibles según el texto escrito
  const groups = useMemo<Group[]>(() => {
    if (query === '') {
      const favorites = foods
        .filter((food) => food.is_favorite)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      // Se piden de más para poder quitar las favoritas sin quedarse cortos
      const top = topFoodsForSlot(usage, foods, mealSlot, TOP_LIMIT + favorites.length)
        .filter((food) => !food.is_favorite)
        .slice(0, TOP_LIMIT)
      const result: Group[] = []
      if (favorites.length > 0) {
        result.push({
          key: 'favorites',
          title: 'Tus favoritas',
          options: favorites.map(foodOption),
        })
      }
      if (top.length > 0) {
        result.push({
          key: 'top',
          title: `Lo que más tomas ${slotPhrase(mealSlot)}`,
          options: top.map(foodOption),
        })
      }
      return result
    }

    const options: Option[] = searchFoods(catalog, query, SEARCH_LIMIT).map((item) =>
      foodOption(item.food),
    )
    if (!findExactMatch(catalog, query)) {
      options.push({ kind: 'new', key: 'new', name: query })
    }
    return [{ key: 'results', title: '', options }]
  }, [query, foods, usage, mealSlot, catalog])

  const flat = useMemo(() => groups.flatMap((group) => group.options), [groups])
  const expanded = open && flat.length > 0
  const active = expanded && activeIndex >= 0 && activeIndex < flat.length ? activeIndex : -1

  function close() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function choose(option: Option) {
    if (option.kind === 'food') {
      onInputChange(option.food.name)
      onSelectFood(option.food)
    } else {
      onInputChange(option.name)
      onSelectNew(option.name)
    }
    close()
  }

  function moveTo(index: number) {
    setOpen(true)
    setActiveIndex(index)
    // Mantiene visible la opción activa (no existe en jsdom)
    document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = flat.length
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return
        event.preventDefault()
        moveTo(active < 0 ? 0 : (active + 1) % count)
        break
      case 'ArrowUp':
        if (count === 0) return
        event.preventDefault()
        moveTo(active < 0 ? count - 1 : (active - 1 + count) % count)
        break
      case 'Enter':
        // Solo con una opción activa; si no, no se elige nada
        if (active >= 0) {
          event.preventDefault()
          choose(flat[active])
        }
        break
      case 'Escape':
        event.preventDefault()
        if (expanded) {
          close()
        } else if (value !== '') {
          onInputChange('')
        }
        break
    }
  }

  // Índice global de cada opción para los id de aria-activedescendant
  let index = 0
  const renderOption = (option: Option) => {
    const i = index++
    const isActive = i === active
    const amount = option.kind === 'food' ? usualAmount(option.food) : ''
    return (
      <li
        key={option.key}
        id={optionId(i)}
        role="option"
        aria-selected={isActive}
        className={`food-combobox__option${isActive ? ' food-combobox__option--active' : ''}${
          option.kind === 'new' ? ' food-combobox__option--new' : ''
        }`}
        // Evita que el campo pierda el foco (y cierre la lista) antes del clic
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(option)}
      >
        {option.kind === 'food' ? (
          <>
            <span className="food-combobox__name">
              {option.food.is_favorite && (
                <span className="food-combobox__star" aria-hidden="true">
                  ★
                </span>
              )}
              {option.food.name}
              {option.food.is_favorite && (
                <span className="food-combobox__sr-only">, favorita</span>
              )}
            </span>
            {amount !== '' && <span className="food-combobox__amount">{amount}</span>}
          </>
        ) : (
          <span className="food-combobox__name">Añadir «{option.name}» como comida nueva</span>
        )}
      </li>
    )
  }

  return (
    <div className="food-combobox">
      <label className="food-combobox__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className="food-combobox__input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          onInputChange(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={handleKeyDown}
      />
      <ul
        id={listboxId}
        role="listbox"
        aria-label={label}
        className="food-combobox__listbox"
        hidden={!expanded}
      >
        {groups.map((group) =>
          group.title === '' ? (
            group.options.map(renderOption)
          ) : (
            <li
              key={group.key}
              role="group"
              aria-labelledby={`${inputId}-group-${group.key}`}
              className="food-combobox__group"
            >
              <span
                id={`${inputId}-group-${group.key}`}
                role="presentation"
                className="food-combobox__group-title"
              >
                {group.title}
              </span>
              <ul role="none" className="food-combobox__group-list">
                {group.options.map(renderOption)}
              </ul>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
