import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// api.ts importa el cliente de Supabase; aquí solo se usan sus tipos y MEAL_SLOTS
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

import type { DailyLog, MealEntryWithFood } from './api'
import { formatMealEntry } from './gridFormat'
import { WeekGrid } from './WeekGrid'

const MONDAY = '2026-10-19'

function meal(
  partial: Partial<MealEntryWithFood> & Pick<MealEntryWithFood, 'id'>,
): MealEntryWithFood {
  return {
    day_of_week: 1,
    meal_slot: 'breakfast',
    quantity: null,
    unit: null,
    position: 0,
    food_id: `food-${partial.id}`,
    food_name: 'Alimento',
    ...partial,
  }
}

function log(partial: Partial<DailyLog> & Pick<DailyLog, 'day_of_week'>): DailyLog {
  return {
    id: `log-${partial.day_of_week}`,
    sheet_id: 'sheet-1',
    owner_id: 'owner-1',
    created_at: '2026-10-19T08:00:00Z',
    updated_at: '2026-10-19T08:00:00Z',
    deleted_at: null,
    water_liters: null,
    pee_count: null,
    poop_count: null,
    steps: null,
    ...partial,
  }
}

function cell(day: number, row: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`td[data-day="${day}"][data-row="${row}"]`)
  if (!el) throw new Error(`No hay celda ${day}/${row}`)
  return el
}

/** Días cuya columna está marcada como elegida (la visible en móvil). */
function selectedDays(): string[] {
  return Array.from(document.querySelectorAll('th.week-grid__day--selected')).map(
    (th) => th.textContent ?? '',
  )
}

describe('WeekGrid', () => {
  it('es una tabla con caption, cabeceras de día y de momento', () => {
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={[]} today="2026-01-01" />)
    const table = screen.getByRole('table', {
      name: 'Comidas y seguimiento de la semana del 19 al 25 de octubre de 2026',
    })
    const cols = within(table).getAllByRole('columnheader')
    expect(cols).toHaveLength(7)
    expect(cols[0]).toHaveTextContent('lunes')
    expect(cols[0]).toHaveTextContent('19 oct')
    expect(cols[6]).toHaveTextContent('25 oct')
    const rows = within(table)
      .getAllByRole('rowheader')
      .map((th) => th.textContent)
    expect(rows).toEqual([
      'Desayuno',
      'Media mañana',
      'Comida',
      'Media tarde',
      'Cena',
      'Agua',
      'WC',
      'Pasos',
    ])
  })

  it('pinta cada comida en su celda y en orden de position', () => {
    const meals = [
      meal({ id: 'b', day_of_week: 2, meal_slot: 'lunch', position: 2, food_name: 'Ensalada' }),
      meal({
        id: 'a',
        day_of_week: 2,
        meal_slot: 'lunch',
        position: 1,
        food_name: 'Lentejas',
        quantity: 1.5,
        unit: 'platos',
      }),
      meal({
        id: 'c',
        day_of_week: 7,
        meal_slot: 'dinner',
        food_name: 'Tostada',
        quantity: 2,
        unit: 'unidades',
      }),
    ]
    render(<WeekGrid monday={MONDAY} meals={meals} dailyLogs={[]} today="2026-01-01" />)

    const lunch = within(cell(2, 'lunch')).getAllByRole('listitem')
    expect(lunch.map((li) => li.textContent)).toEqual(['Lentejas · 1,5 platos', 'Ensalada'])
    expect(cell(7, 'dinner')).toHaveTextContent('Tostada · 2 unidades')
    // Las demás celdas quedan vacías (sin guiones)
    expect(cell(1, 'lunch')).toBeEmptyDOMElement()
    expect(cell(2, 'dinner')).toBeEmptyDOMElement()
  })

  it('formatea las filas de seguimiento en es-ES y deja vacías las que no tienen dato', () => {
    const logs = [
      log({ day_of_week: 1, water_liters: 1.5, pee_count: 4, poop_count: 1, steps: 8000 }),
      log({ day_of_week: 3, water_liters: 2, steps: 12345 }),
    ]
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={logs} today="2026-01-01" />)

    expect(cell(1, 'water')).toHaveTextContent('1,5 L')
    expect(cell(1, 'wc')).toHaveTextContent('Pis 4 · Caca 1')
    expect(cell(1, 'steps')).toHaveTextContent('8.000')
    expect(cell(3, 'water')).toHaveTextContent('2 L')
    expect(cell(3, 'steps')).toHaveTextContent('12.345')
    expect(cell(3, 'wc')).toBeEmptyDOMElement()
    expect(cell(2, 'water')).toBeEmptyDOMElement()
  })

  it('las celdas son de solo lectura (sin botones fuera de la tira de días)', () => {
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={[]} today="2026-01-01" />)
    expect(within(screen.getByRole('table')).queryAllByRole('button')).toHaveLength(0)
  })

  it('elige hoy por defecto si cae en la semana', () => {
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={[]} today="2026-10-22" />)
    expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
      'jueves 22 de octubre, hoy',
    )
    expect(selectedDays()).toHaveLength(1)
    expect(selectedDays()[0]).toContain('jueves')
    expect(screen.getByRole('columnheader', { name: /jueves/ })).toHaveTextContent('hoy')
  })

  it('elige el lunes por defecto si hoy no cae en la semana', () => {
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={[]} today="2026-11-03" />)
    expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
      'lunes 19 de octubre',
    )
    expect(selectedDays()[0]).toContain('lunes')
  })

  it('al pulsar un día de la tira cambia la columna elegida', () => {
    render(<WeekGrid monday={MONDAY} meals={[]} dailyLogs={[]} today="2026-01-01" />)
    fireEvent.click(screen.getByRole('button', { name: 'sábado 24 de octubre' }))
    expect(screen.getByRole('button', { pressed: true })).toHaveAccessibleName(
      'sábado 24 de octubre',
    )
    expect(selectedDays()).toHaveLength(1)
    expect(selectedDays()[0]).toContain('sábado')
    expect(cell(6, 'lunch')).toHaveClass('week-grid__day--selected')
    expect(cell(1, 'lunch')).not.toHaveClass('week-grid__day--selected')
  })
})

describe('formatMealEntry', () => {
  it('muestra lo que haya si falta cantidad o unidad', () => {
    expect(formatMealEntry({ food_name: 'Pan', quantity: 2, unit: null })).toBe('Pan · 2')
    expect(formatMealEntry({ food_name: 'Pan', quantity: null, unit: 'rebanadas' })).toBe(
      'Pan · rebanadas',
    )
    expect(formatMealEntry({ food_name: 'Pan', quantity: null, unit: null })).toBe('Pan')
    expect(formatMealEntry({ food_name: 'Leche', quantity: 0.25, unit: 'L' })).toBe(
      'Leche · 0,25 L',
    )
  })
})
