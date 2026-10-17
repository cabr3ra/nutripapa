import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Food, FoodUsage } from './api'
import { FoodCombobox } from './FoodCombobox'

function food(id: string, name: string, extra: Partial<Food> = {}): Food {
  return {
    id,
    name,
    is_favorite: false,
    default_quantity: null,
    default_unit: null,
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    deleted_at: null,
    owner_id: 'u1',
    ...extra,
  }
}

const FOODS: Food[] = [
  food('f1', 'Plátano', { is_favorite: true, default_quantity: 1, default_unit: 'unidad' }),
  food('f2', 'Tostadas con aceite', { default_quantity: 2, default_unit: 'rebanada' }),
  food('f3', 'Café con leche', { default_quantity: 1, default_unit: 'taza' }),
  food('f4', 'Yogur natural', { is_favorite: true }),
  food('f5', 'Lentejas'),
]

// Plátano (favorita) también es de lo más usado: no debe repetirse
const USAGE: FoodUsage = new Map([
  ['f1', { breakfast: 5 }],
  ['f2', { breakfast: 3 }],
  ['f3', { breakfast: 4 }],
  ['f5', { lunch: 7 }],
])

type HarnessProps = {
  initial?: string
  onSelectFood?: (f: Food) => void
  onSelectNew?: (n: string) => void
}

// Envoltorio con estado: el campo es controlado por el padre
function Harness({ initial = '', onSelectFood = () => {}, onSelectNew = () => {} }: HarnessProps) {
  const [value, setValue] = useState(initial)
  return (
    <FoodCombobox
      foods={FOODS}
      usage={USAGE}
      mealSlot="breakfast"
      value={value}
      onInputChange={setValue}
      onSelectFood={onSelectFood}
      onSelectNew={onSelectNew}
    />
  )
}

const input = () => screen.getByRole('combobox', { name: '¿Qué has comido?' })
const optionNames = () => screen.queryAllByRole('option').map((o) => o.textContent)
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const key = (k: string) => fireEvent.keyDown(input(), { key: k })

describe('FoodCombobox', () => {
  it('con el campo vacío muestra favoritas y lo más usado en el momento, sin repetir', () => {
    render(<Harness />)
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')

    const favorites = screen.getByRole('group', { name: 'Tus favoritas' })
    expect(
      within(favorites)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['★Plátano, favorita1 unidad', '★Yogur natural, favorita'])
    const top = screen.getByRole('group', { name: 'Lo que más tomas en el desayuno' })
    // Plátano no se repite; Lentejas (solo comida) no aparece
    expect(
      within(top)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Café con leche1 taza', 'Tostadas con aceite2 rebanada'])
  })

  it('sin favoritas ni historial no muestra lista', () => {
    render(
      <FoodCombobox
        foods={[food('x', 'Pan')]}
        usage={new Map()}
        mealSlot="dinner"
        value=""
        onInputChange={() => {}}
        onSelectFood={() => {}}
        onSelectNew={() => {}}
      />,
    )
    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('escribir "tostadas" sugiere "Tostadas con aceite" y ofrece añadir', () => {
    render(<Harness />)
    fireEvent.focus(input())
    type('tostadas')
    expect(optionNames()).toEqual([
      'Tostadas con aceite2 rebanada',
      'Añadir «tostadas» como comida nueva',
    ])
  })

  it('"platano" encuentra "Plátano" y no ofrece añadir (coincidencia exacta)', () => {
    render(<Harness />)
    fireEvent.focus(input())
    type('platano')
    expect(optionNames()).toEqual(['★Plátano, favorita1 unidad'])
  })

  it('↓ activa la primera opción y Enter la elige', () => {
    const onSelectFood = vi.fn()
    render(<Harness onSelectFood={onSelectFood} />)
    fireEvent.focus(input())
    type('tost')
    expect(input()).not.toHaveAttribute('aria-activedescendant')

    key('ArrowDown')
    const first = screen.getAllByRole('option')[0]
    expect(input()).toHaveAttribute('aria-activedescendant', first.id)
    expect(first).toHaveAttribute('aria-selected', 'true')

    key('Enter')
    expect(onSelectFood).toHaveBeenCalledWith(FOODS[1])
    expect(input()).toHaveValue('Tostadas con aceite')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).not.toHaveAttribute('aria-activedescendant')
  })

  it('las flechas ciclan en los extremos', () => {
    render(<Harness />)
    fireEvent.focus(input())
    type('tost') // 2 opciones: Tostadas y Añadir
    const options = () => screen.getAllByRole('option')
    key('ArrowUp')
    expect(input()).toHaveAttribute('aria-activedescendant', options()[1].id)
    key('ArrowDown')
    expect(input()).toHaveAttribute('aria-activedescendant', options()[0].id)
    key('ArrowUp')
    expect(input()).toHaveAttribute('aria-activedescendant', options()[1].id)
  })

  it('Enter sin opción activa no elige nada', () => {
    const onSelectFood = vi.fn()
    const onSelectNew = vi.fn()
    render(<Harness onSelectFood={onSelectFood} onSelectNew={onSelectNew} />)
    fireEvent.focus(input())
    type('tostadas')
    key('Enter')
    expect(onSelectFood).not.toHaveBeenCalled()
    expect(onSelectNew).not.toHaveBeenCalled()
    expect(input()).toHaveValue('tostadas')
  })

  it('elegir "Añadir «…»" llama a onSelectNew con el texto recortado', () => {
    const onSelectNew = vi.fn()
    render(<Harness onSelectNew={onSelectNew} />)
    fireEvent.focus(input())
    type('  Gazpacho  ')
    key('ArrowDown')
    key('Enter')
    expect(onSelectNew).toHaveBeenCalledWith('Gazpacho')
    expect(input()).toHaveValue('Gazpacho')
  })

  it('Escape cierra la lista y un segundo Escape vacía el campo', () => {
    render(<Harness />)
    fireEvent.focus(input())
    type('tost')
    key('ArrowDown')
    key('Escape')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(input()).toHaveValue('tost')
    key('Escape')
    expect(input()).toHaveValue('')
  })

  it('↓ con la lista cerrada la vuelve a abrir', () => {
    render(<Harness />)
    fireEvent.focus(input())
    type('tost')
    key('Escape')
    key('ArrowDown')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id)
  })

  it('aria-controls apunta al listbox', () => {
    render(<Harness />)
    const listbox = screen.getByRole('listbox', { hidden: true })
    expect(input()).toHaveAttribute('aria-controls', listbox.id)
    expect(input()).toHaveAttribute('aria-autocomplete', 'list')
  })

  it('al perder el foco (Tab) se cierra sin elegir', () => {
    const onSelectFood = vi.fn()
    render(<Harness onSelectFood={onSelectFood} />)
    fireEvent.focus(input())
    type('tost')
    key('ArrowDown')
    fireEvent.blur(input())
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(onSelectFood).not.toHaveBeenCalled()
  })

  it('un clic en una opción la elige', () => {
    const onSelectFood = vi.fn()
    render(<Harness onSelectFood={onSelectFood} />)
    fireEvent.focus(input())
    const option = screen.getByRole('option', { name: /Yogur natural/ })
    // mousedown no debe quitar el foco (se previene)
    expect(fireEvent.mouseDown(option)).toBe(false)
    fireEvent.click(option)
    expect(onSelectFood).toHaveBeenCalledWith(FOODS[3])
    expect(input()).toHaveValue('Yogur natural')
    expect(input()).toHaveAttribute('aria-expanded', 'false')
  })
})
