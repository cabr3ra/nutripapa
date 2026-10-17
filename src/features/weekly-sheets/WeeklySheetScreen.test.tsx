import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MealEntryWithFood, SheetDetail, WeeklySheet } from './api'

// El cliente real de Supabase exige variables de entorno: aquí no hace falta
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

// Mock parcial: se simulan las llamadas a Supabase y se mantienen los helpers puros
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return {
    ...actual,
    getOrCreateCurrentSheet: vi.fn(),
    getSheet: vi.fn(),
    updateMenuNumber: vi.fn(),
  }
})

// Panel de comidas: se simulan solo las llamadas a Supabase
vi.mock('../meals/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../meals/api')>()
  return {
    ...actual,
    listFoods: vi.fn(),
    getFoodUsage: vi.fn(),
    saveMealEntry: vi.fn(),
    softDeleteEntry: vi.fn(),
    restoreEntry: vi.fn(),
  }
})

import { getFoodUsage, listFoods, restoreEntry, saveMealEntry, softDeleteEntry } from '../meals/api'
import { getOrCreateCurrentSheet, getSheet, updateMenuNumber } from './api'
import { WeeklySheetScreen } from './WeeklySheetScreen'

const mocked = {
  getOrCreateCurrentSheet: vi.mocked(getOrCreateCurrentSheet),
  getSheet: vi.mocked(getSheet),
  updateMenuNumber: vi.mocked(updateMenuNumber),
  listFoods: vi.mocked(listFoods),
  getFoodUsage: vi.mocked(getFoodUsage),
  saveMealEntry: vi.mocked(saveMealEntry),
  softDeleteEntry: vi.mocked(softDeleteEntry),
  restoreEntry: vi.mocked(restoreEntry),
}

const SHEET = {
  id: 'sheet-1',
  start_date: '2026-10-19',
  menu_number: 2,
  created_at: '2026-10-19T08:00:00Z',
  updated_at: '2026-10-19T08:00:00Z',
  deleted_at: null,
} as WeeklySheet

const DETAIL: SheetDetail = { sheet: SHEET, meals: [], dailyLogs: [] }

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <WeeklySheetScreen /> },
      { path: '/tabla/:sheetId', element: <WeeklySheetScreen /> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

async function menuInput(): Promise<HTMLInputElement> {
  return (await screen.findByLabelText('Menú nº')) as HTMLInputElement
}

describe('WeeklySheetScreen', () => {
  beforeEach(() => {
    Object.values(mocked).forEach((fn) => fn.mockReset())
    mocked.getOrCreateCurrentSheet.mockResolvedValue(SHEET)
    mocked.getSheet.mockImplementation(async (id) => (id === SHEET.id ? DETAIL : null))
    mocked.updateMenuNumber.mockResolvedValue()
    mocked.listFoods.mockResolvedValue([])
    mocked.getFoodUsage.mockResolvedValue(new Map())
    mocked.saveMealEntry.mockResolvedValue('e1')
    mocked.softDeleteEntry.mockResolvedValue()
    mocked.restoreEntry.mockResolvedValue()
    // Hoy: miércoles 21-oct-2026 (semana 1). Solo se finge Date.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('en "/" carga la semana actual con su título, rango y nº de menú', async () => {
    renderAt('/')
    expect(screen.getByText('Cargando tu semana…')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 2, name: 'Semana 1' })).toBeInTheDocument()
    expect(screen.getByText('del 19 al 25 de octubre de 2026')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'CONTROL SEMANAL de COMIDAS' }),
    ).toBeInTheDocument()
    expect(await menuInput()).toHaveValue(2)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('href', '/historial')
    expect(screen.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '/ajustes')
    expect(mocked.getSheet).toHaveBeenCalledWith('sheet-1')
  })

  it('en "/tabla/x" inexistente avisa y ofrece ir a la semana actual', async () => {
    renderAt('/tabla/x')
    expect(await screen.findByText(/No encontramos esta tabla/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la semana actual' })).toHaveAttribute('href', '/')
    expect(mocked.getOrCreateCurrentSheet).not.toHaveBeenCalled()
  })

  it('si falla la carga, avisa en línea y deja reintentar', async () => {
    mocked.getOrCreateCurrentSheet.mockRejectedValueOnce(new Error('sin red'))
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { level: 2, name: 'Semana 1' })).toBeInTheDocument()
  })

  it('guarda el nº de menú al salir del campo y muestra "Guardado"', async () => {
    renderAt('/')
    const input = await menuInput()
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.blur(input)
    await waitFor(() => expect(mocked.updateMenuNumber).toHaveBeenCalledWith('sheet-1', 3))
    expect(await screen.findByText('Guardado')).toBeInTheDocument()
  })

  it('vacío quita el número (null)', async () => {
    renderAt('/')
    const input = await menuInput()
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    await waitFor(() => expect(mocked.updateMenuNumber).toHaveBeenCalledWith('sheet-1', null))
  })

  it('0 muestra un aviso y no guarda', async () => {
    renderAt('/')
    const input = await menuInput()
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(await screen.findByText('Escribe un número a partir de 1')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(mocked.updateMenuNumber).not.toHaveBeenCalled()
  })
})

describe('WeeklySheetScreen · edición de comidas', () => {
  const ENTRY: MealEntryWithFood = {
    id: 'e1',
    day_of_week: 2,
    meal_slot: 'breakfast',
    quantity: 2,
    unit: 'unidades',
    position: 1,
    food_id: 'food-1',
    food_name: 'Tostadas',
  }
  const WITH_ENTRY: SheetDetail = { sheet: SHEET, meals: [ENTRY], dailyLogs: [] }
  const EDIT_NAME = 'Editar Tostadas · 2 unidades, martes, desayuno'

  /** Promesa que se resuelve a mano, para ver la pantalla durante la recarga. */
  function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }

  beforeEach(() => {
    Object.values(mocked).forEach((fn) => fn.mockReset())
    mocked.getOrCreateCurrentSheet.mockResolvedValue(SHEET)
    mocked.getSheet.mockResolvedValue(WITH_ENTRY)
    mocked.listFoods.mockResolvedValue([])
    mocked.getFoodUsage.mockResolvedValue(new Map())
    mocked.saveMealEntry.mockResolvedValue('e1')
    mocked.softDeleteEntry.mockResolvedValue()
    mocked.restoreEntry.mockResolvedValue()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tocar "+" de martes · desayuno abre el panel en la tabla; Cancelar lo cierra y devuelve el foco', async () => {
    renderAt('/')
    const add = await screen.findByRole('button', { name: 'Añadir comida, martes, desayuno' })
    fireEvent.click(add)

    const panel = await screen.findByRole('group', { name: 'Desayuno · martes' })
    expect(panel.closest('td')).toHaveAttribute('colspan', '8')
    expect(add).toHaveAttribute('aria-expanded', 'true')

    // Otra celda reemplaza el panel (uno solo a la vez)
    fireEvent.click(screen.getByRole('button', { name: 'Añadir comida, jueves, cena' }))
    expect(await screen.findByRole('group', { name: 'Cena · jueves' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Desayuno · martes' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('td[colspan="8"]')).toHaveLength(1)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('group', { name: 'Cena · jueves' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Añadir comida, jueves, cena' })).toHaveFocus()
  })

  it('guardar cierra el panel y recarga en segundo plano sin la pantalla de carga', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
    const reload = deferred<SheetDetail | null>()
    mocked.getSheet.mockReturnValueOnce(reload.promise)

    fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(mocked.saveMealEntry).toHaveBeenCalled())
    expect(mocked.saveMealEntry.mock.calls[0][0]).toMatchObject({
      entryId: 'e1',
      sheetId: 'sheet-1',
      dayOfWeek: 2,
      mealSlot: 'breakfast',
    })

    // Mientras recarga: la tabla sigue a la vista y no hay "Cargando tu semana…"
    await waitFor(() => expect(mocked.getSheet).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('group', { name: 'Desayuno · martes' })).not.toBeInTheDocument()
    expect(screen.queryByText('Cargando tu semana…')).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: EDIT_NAME })).toHaveFocus()

    reload.resolve({ ...WITH_ENTRY, meals: [{ ...ENTRY, quantity: 3 }] })
    expect(
      await screen.findByRole('button', { name: 'Editar Tostadas · 3 unidades, martes, desayuno' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Cargando tu semana…')).not.toBeInTheDocument()
  })

  it('quitar muestra "Comida quitada" encima de la tabla y Deshacer llama a restoreEntry', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
    mocked.getSheet.mockResolvedValueOnce(DETAIL)

    fireEvent.click(await screen.findByRole('button', { name: 'Quitar de aquí' }))
    expect(await screen.findByText('Comida quitada')).toBeInTheDocument()
    expect(mocked.softDeleteEntry).toHaveBeenCalledWith('e1')
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: EDIT_NAME })).not.toBeInTheDocument(),
    )
    expect(screen.queryByRole('group', { name: 'Desayuno · martes' })).not.toBeInTheDocument()
    // Integrada en la página, antes de la tabla (no flotante)
    const bar = screen.getByText('Comida quitada').closest('.meal-undo') as HTMLElement
    expect(bar.compareDocumentPosition(screen.getByRole('table'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )

    mocked.getSheet.mockResolvedValueOnce(WITH_ENTRY)
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(mocked.restoreEntry).toHaveBeenCalledWith('e1'))
    expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
    expect(screen.queryByText('Comida quitada')).not.toBeInTheDocument()
  })

  it('"Cerrar" quita la barra de deshacer', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar de aquí' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText('Comida quitada')).not.toBeInTheDocument()
    expect(mocked.restoreEntry).not.toHaveBeenCalled()
  })

  it('si falla la recarga en segundo plano, mantiene la tabla y deja reintentar', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
    mocked.getSheet.mockRejectedValueOnce(new Error('sin red'))
    fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText(/No hemos podido actualizar la tabla/)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() =>
      expect(screen.queryByText(/No hemos podido actualizar la tabla/)).not.toBeInTheDocument(),
    )
  })
})
