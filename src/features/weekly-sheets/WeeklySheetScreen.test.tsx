import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyLog, MealEntryWithFood, SheetDetail, WeeklySheet } from './api'
import type { MoveTarget } from '../meals/api'
import { stripDayDropId } from '../meals/dnd/ids'
import { resolveDrop } from '../meals/dnd/resolveDrop'

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
    moveEntry: vi.fn(),
    undoMove: vi.fn(),
  }
})

// Arrastre: el arrastre real no se puede simular en jsdom. El provider simulado
// guarda el onMove que recibe (para llamarlo como si se soltara una comida) y
// sigue pintando un DndContext real para que la tabla arrastrable funcione.
const dnd = vi.hoisted(() => ({
  onMove: null as
    | null
    | ((
        entry: import('./api').MealEntryWithFood,
        target: import('../meals/api').MoveTarget,
        cellEntries: import('./api').MealEntryWithFood[],
      ) => void),
}))
vi.mock('../meals/dnd/MealDndProvider', async () => {
  const { DndContext } = await import('@dnd-kit/core')
  return {
    MealDndProvider: ({
      onMove,
      children,
    }: {
      onMove: NonNullable<typeof dnd.onMove>
      children: ReactNode
    }) => {
      dnd.onMove = onMove
      return <DndContext>{children}</DndContext>
    },
  }
})

// Panel de seguimiento: solo se simula el guardado (parse.ts y el resto, reales)
vi.mock('../daily-tracking/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../daily-tracking/api')>()
  return { ...actual, saveDailyLog: vi.fn() }
})

import { saveDailyLog } from '../daily-tracking/api'
import {
  getFoodUsage,
  listFoods,
  moveEntry,
  restoreEntry,
  saveMealEntry,
  softDeleteEntry,
  undoMove,
} from '../meals/api'
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
  moveEntry: vi.mocked(moveEntry),
  undoMove: vi.mocked(undoMove),
  saveDailyLog: vi.mocked(saveDailyLog),
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

  describe('Mover a…', () => {
    // Otra comida ya apuntada en la celda destino (jueves · comida)
    const OTHER: MealEntryWithFood = {
      ...ENTRY,
      id: 'e2',
      day_of_week: 4,
      meal_slot: 'lunch',
      position: 1024,
      food_id: 'food-2',
      food_name: 'Lentejas',
      quantity: 1,
      unit: 'plato',
    }
    const BEFORE: SheetDetail = { sheet: SHEET, meals: [ENTRY, OTHER], dailyLogs: [] }
    const MOVED_ENTRY = { ...ENTRY, day_of_week: 4, meal_slot: 'lunch' as const, position: 2048 }
    const AFTER: SheetDetail = { sheet: SHEET, meals: [OTHER, MOVED_ENTRY], dailyLogs: [] }
    const UNDO = { entryId: 'e1', day: 2, slot: 'breakfast' as const, position: 1 }
    const MOVED_NAME = 'Editar Tostadas · 2 unidades, jueves, comida'

    /** Tira de días (móvil): botón del día cuyo nombre empieza por `day`. */
    const stripDay = (day: string) =>
      within(screen.getByRole('group', { name: 'Elige el día' })).getByRole('button', {
        name: new RegExp(`^${day} `),
      })

    beforeEach(() => {
      mocked.getSheet.mockResolvedValue(BEFORE)
      mocked.moveEntry.mockResolvedValue(UNDO)
      mocked.undoMove.mockResolvedValue()
    })

    async function moveToThursdayLunch() {
      fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
      fireEvent.click(await screen.findByRole('button', { name: 'Mover a…' }))
      const group = screen.getByRole('group', { name: 'Mover a…' })
      fireEvent.click(within(group).getByRole('button', { name: 'jueves' }))
      fireEvent.change(within(group).getByRole('combobox', { name: 'Momento' }), {
        target: { value: 'lunch' },
      })
      fireEvent.click(within(group).getByRole('button', { name: 'Mover aquí' }))
    }

    it('mueve al final de la celda destino, cierra el panel, enseña el día y muestra "Comida movida"', async () => {
      renderAt('/')
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
      mocked.getSheet.mockResolvedValue(AFTER)
      await moveToThursdayLunch()

      await waitFor(() =>
        expect(mocked.moveEntry).toHaveBeenCalledWith(ENTRY, { day: 4, slot: 'lunch' }, [OTHER]),
      )
      expect(await screen.findByText('Comida movida')).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Desayuno · martes' })).not.toBeInTheDocument()
      // En móvil se ve el día destino
      expect(stripDay('jueves')).toHaveAttribute('aria-pressed', 'true')
      // Recarga en segundo plano y el foco llega a la comida en su nueva celda
      expect(await screen.findByRole('button', { name: MOVED_NAME })).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: MOVED_NAME })).toHaveFocus())
      expect(screen.queryByText('Cargando tu semana…')).not.toBeInTheDocument()

      // Deshacer devuelve la comida a su sitio y al día original
      mocked.getSheet.mockResolvedValue(BEFORE)
      fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
      await waitFor(() => expect(mocked.undoMove).toHaveBeenCalledWith(UNDO))
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
      expect(screen.queryByText('Comida movida')).not.toBeInTheDocument()
      expect(stripDay('martes')).toHaveAttribute('aria-pressed', 'true')
      await waitFor(() => expect(screen.getByRole('button', { name: EDIT_NAME })).toHaveFocus())
    })

    it('si falla el movimiento, el panel sigue abierto y lo avisa en línea', async () => {
      mocked.moveEntry.mockRejectedValueOnce(new Error('sin red'))
      renderAt('/')
      await moveToThursdayLunch()
      const group = screen.getByRole('group', { name: 'Mover a…' })
      expect(await within(group).findByRole('alert')).toHaveTextContent(
        'No hemos podido mover la comida',
      )
      expect(screen.getByRole('group', { name: 'Desayuno · martes' })).toBeInTheDocument()
      expect(screen.queryByText('Comida movida')).not.toBeInTheDocument()
    })

    it('la barra "Comida movida" sustituye a "Comida quitada" (una sola barra)', async () => {
      renderAt('/')
      fireEvent.click(
        await screen.findByRole('button', { name: 'Editar Lentejas · 1 plato, jueves, comida' }),
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Quitar de aquí' }))
      expect(await screen.findByText('Comida quitada')).toBeInTheDocument()

      await moveToThursdayLunch()
      expect(await screen.findByText('Comida movida')).toBeInTheDocument()
      expect(screen.queryByText('Comida quitada')).not.toBeInTheDocument()
      expect(document.querySelectorAll('.meal-undo')).toHaveLength(1)
    })
  })

  describe('arrastrar', () => {
    const OTHER: MealEntryWithFood = {
      ...ENTRY,
      id: 'e2',
      day_of_week: 4,
      meal_slot: 'lunch',
      position: 1024,
      food_id: 'food-2',
      food_name: 'Lentejas',
      quantity: 1,
      unit: 'plato',
    }
    const BEFORE: SheetDetail = { sheet: SHEET, meals: [ENTRY, OTHER], dailyLogs: [] }
    const MOVED_ENTRY = { ...ENTRY, day_of_week: 4, meal_slot: 'lunch' as const, position: 512 }
    const AFTER: SheetDetail = { sheet: SHEET, meals: [MOVED_ENTRY, OTHER], dailyLogs: [] }
    const UNDO = { entryId: 'e1', day: 2, slot: 'breakfast' as const, position: 1 }
    const MOVED_NAME = 'Editar Tostadas · 2 unidades, jueves, comida'
    // Soltar Tostadas encima de Lentejas: antes de ella, en jueves · comida
    const TARGET = { day: 4, slot: 'lunch' as const, beforeId: 'e2' }

    beforeEach(() => {
      dnd.onMove = null
      mocked.getSheet.mockResolvedValue(BEFORE)
      mocked.moveEntry.mockResolvedValue(UNDO)
      mocked.undoMove.mockResolvedValue()
    })

    /** Simula soltar una comida: llama al onMove que la pantalla dio al provider. */
    function drop(entry: MealEntryWithFood, target: MoveTarget, cell: MealEntryWithFood[]) {
      if (!dnd.onMove) throw new Error('La tabla no está dentro de MealDndProvider')
      const onMove = dnd.onMove
      act(() => onMove(entry, target, cell))
    }

    it('la tabla es arrastrable y soltar mueve como "Mover a…" (barra, día y foco)', async () => {
      renderAt('/')
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
      // La tabla está dentro de MealDndProvider (que recibió el onMove de la pantalla)
      expect(dnd.onMove).not.toBeNull()

      mocked.getSheet.mockResolvedValue(AFTER)
      drop(ENTRY, TARGET, [OTHER])

      expect(mocked.moveEntry).toHaveBeenCalledWith(ENTRY, TARGET, [OTHER])
      expect(await screen.findByText('Comida movida')).toBeInTheDocument()
      const strip = within(screen.getByRole('group', { name: 'Elige el día' }))
      expect(strip.getByRole('button', { name: /^jueves / })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(await screen.findByRole('button', { name: MOVED_NAME })).toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: MOVED_NAME })).toHaveFocus())

      // Deshacer devuelve la comida a su sitio
      mocked.getSheet.mockResolvedValue(BEFORE)
      fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
      await waitFor(() => expect(mocked.undoMove).toHaveBeenCalledWith(UNDO))
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
    })

    it('soltar sobre un día de la tira (móvil) lo lleva al final de ese día y la tira cambia', async () => {
      renderAt('/')
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()
      const strip = within(screen.getByRole('group', { name: 'Elige el día' }))
      // Se parte de otro día distinto del destino
      fireEvent.click(strip.getByRole('button', { name: /^martes / }))
      expect(strip.getByRole('button', { name: /^jueves / })).toHaveAttribute(
        'aria-pressed',
        'false',
      )

      // Lo que el provider resolvería al soltar Tostadas sobre la J de la tira
      const resolved = resolveDrop({
        activeEntry: ENTRY,
        overId: stripDayDropId(4),
        meals: [ENTRY, OTHER],
      })
      expect(resolved).not.toBeNull()
      const { target, cellEntries } = resolved!
      expect(target).toEqual({ day: 4, slot: 'breakfast' })

      const MOVED_TO_STRIP = { ...ENTRY, day_of_week: 4 }
      mocked.getSheet.mockResolvedValue({
        sheet: SHEET,
        meals: [MOVED_TO_STRIP, OTHER],
        dailyLogs: [],
      })
      drop(ENTRY, target, cellEntries)

      expect(mocked.moveEntry).toHaveBeenCalledWith(ENTRY, { day: 4, slot: 'breakfast' }, [])
      expect(await screen.findByText('Comida movida')).toBeInTheDocument()
      expect(strip.getByRole('button', { name: /^jueves / })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(
        await screen.findByRole('button', {
          name: 'Editar Tostadas · 2 unidades, jueves, desayuno',
        }),
      ).toBeInTheDocument()
    })

    it('soltar con el panel abierto lo cierra', async () => {
      renderAt('/')
      fireEvent.click(await screen.findByRole('button', { name: EDIT_NAME }))
      expect(await screen.findByRole('group', { name: 'Desayuno · martes' })).toBeInTheDocument()

      drop(ENTRY, TARGET, [OTHER])
      expect(await screen.findByText('Comida movida')).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Desayuno · martes' })).not.toBeInTheDocument()
    })

    it('si falla el movimiento, avisa encima de la tabla y la comida se queda', async () => {
      mocked.moveEntry.mockRejectedValueOnce(new Error('sin red'))
      renderAt('/')
      expect(await screen.findByRole('button', { name: EDIT_NAME })).toBeInTheDocument()

      drop(ENTRY, TARGET, [OTHER])
      expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido mover la comida')
      expect(screen.queryByText('Comida movida')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: EDIT_NAME })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Entendido' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})

describe('WeeklySheetScreen · seguimiento diario', () => {
  function dailyLog(partial: Partial<DailyLog> = {}): DailyLog {
    return {
      id: 'log-2',
      sheet_id: 'sheet-1',
      owner_id: 'owner-1',
      day_of_week: 2,
      created_at: '2026-10-20T08:00:00Z',
      updated_at: '2026-10-20T08:00:00Z',
      deleted_at: null,
      water_liters: null,
      pee_count: null,
      poop_count: null,
      steps: null,
      ...partial,
    }
  }

  function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }

  const PANEL = 'Seguimiento del martes'

  beforeEach(() => {
    Object.values(mocked).forEach((fn) => fn.mockReset())
    mocked.getOrCreateCurrentSheet.mockResolvedValue(SHEET)
    mocked.getSheet.mockResolvedValue({
      ...DETAIL,
      dailyLogs: [dailyLog({ water_liters: 1.5 })],
    })
    mocked.listFoods.mockResolvedValue([])
    mocked.getFoodUsage.mockResolvedValue(new Map())
    mocked.saveDailyLog.mockImplementation(async (_sheet, day, values) =>
      dailyLog({ day_of_week: day, ...values, updated_at: '2026-10-21T10:00:00Z' }),
    )
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tocar el agua del martes abre su panel en la tabla; Listo lo cierra y devuelve el foco', async () => {
    renderAt('/')
    const water = await screen.findByRole('button', { name: 'Editar agua: 1,5 L, martes' })
    fireEvent.click(water)

    const panel = await screen.findByRole('group', { name: PANEL })
    const panelRow = panel.closest('tr')
    expect(panel.closest('td')).toHaveAttribute('colspan', '8')
    expect(panelRow?.previousElementSibling?.querySelector('th')).toHaveTextContent('Agua')
    expect(water).toHaveAttribute('aria-expanded', 'true')
    // Arranca con los datos del día
    expect(within(panel).getByRole('textbox', { name: 'Agua' })).toHaveValue('1,5')

    fireEvent.click(within(panel).getByRole('button', { name: 'Listo' }))
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: PANEL })).not.toBeInTheDocument(),
    )
    // El foco vuelve tras cerrar el panel (en un ciclo posterior): con la suite
    // completa bajo carga llegaba después de la comprobación (test intermitente).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Editar agua: 1,5 L, martes' })).toHaveFocus(),
    )
    // Sin cambios no se guarda nada
    expect(mocked.saveDailyLog).not.toHaveBeenCalled()
  })

  it('tras guardar recarga en segundo plano sin cerrar ni remontar el panel', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Apuntar WC, martes' }))
    const panel = await screen.findByRole('group', { name: PANEL })
    expect(panel.closest('tr')?.previousElementSibling?.querySelector('th')).toHaveTextContent('WC')
    const title = within(panel).getByRole('heading', { name: PANEL })

    const reload = deferred<SheetDetail | null>()
    mocked.getSheet.mockReturnValueOnce(reload.promise)
    const pee = within(panel).getByRole('group', { name: 'Pis' })
    fireEvent.click(within(pee).getByRole('button', { name: /^Añadir/ }))

    // Guarda solo tras la espera y pide la recarga
    await waitFor(() => expect(mocked.saveDailyLog).toHaveBeenCalledTimes(1), { timeout: 2000 })
    expect(mocked.saveDailyLog).toHaveBeenCalledWith('sheet-1', 2, {
      water_liters: 1.5,
      pee_count: 1,
      poop_count: null,
      steps: null,
    })
    await waitFor(() => expect(mocked.getSheet).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Cargando tu semana…')).not.toBeInTheDocument()
    // La celda ya muestra lo guardado, antes de que llegue la recarga
    expect(
      await screen.findByRole('button', { name: 'Editar WC: Pis 1, martes' }),
    ).toBeInTheDocument()

    reload.resolve({
      ...DETAIL,
      dailyLogs: [
        dailyLog({ water_liters: 1.5, pee_count: 1, updated_at: '2026-10-21T10:00:00Z' }),
      ],
    })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('Guardado'))
    // Mismo panel (no se ha remontado) y sigue abierto
    expect(screen.getByRole('group', { name: PANEL })).toBe(panel)
    expect(within(panel).getByRole('heading', { name: PANEL })).toBe(title)
    expect(within(panel).getByRole('textbox', { name: 'Pis' })).toHaveValue('1')
    expect(screen.queryByText('Cargando tu semana…')).not.toBeInTheDocument()
  })

  it('abrir una comida cierra el panel de seguimiento (uno solo a la vez)', async () => {
    renderAt('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Apuntar pasos, martes' }))
    expect(await screen.findByRole('group', { name: PANEL })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Añadir comida, martes, cena' }))
    expect(await screen.findByRole('group', { name: 'Cena · martes' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: PANEL })).not.toBeInTheDocument()
    expect(document.querySelectorAll('td[colspan="8"]')).toHaveLength(1)

    // Y al revés: abrir el seguimiento cierra la comida
    fireEvent.click(screen.getByRole('button', { name: 'Apuntar agua, jueves' }))
    expect(await screen.findByRole('group', { name: 'Seguimiento del jueves' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Cena · martes' })).not.toBeInTheDocument()
  })
})
