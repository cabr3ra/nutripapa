import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest'
import type { MealEntryWithFood } from '../weekly-sheets/api'
import type { Food, FoodUsage } from './api'

// El cliente real de Supabase exige variables de entorno: aquí no hace falta
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

// Mock parcial: se simulan las llamadas a Supabase y se mantienen los helpers puros
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return {
    ...actual,
    listFoods: vi.fn(),
    getFoodUsage: vi.fn(),
    saveMealEntry: vi.fn(),
    softDeleteEntry: vi.fn(),
    setFavorite: vi.fn(),
    renameFood: vi.fn(),
  }
})

import {
  getFoodUsage,
  listFoods,
  renameFood,
  saveMealEntry,
  setFavorite,
  softDeleteEntry,
} from './api'
import { MealPanel, UndoBar } from './MealPanel'

const mocked = {
  listFoods: vi.mocked(listFoods),
  getFoodUsage: vi.mocked(getFoodUsage),
  saveMealEntry: vi.mocked(saveMealEntry),
  softDeleteEntry: vi.mocked(softDeleteEntry),
  setFavorite: vi.mocked(setFavorite),
  renameFood: vi.mocked(renameFood),
}

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
  food('f1', 'Plátano', { default_quantity: 1, default_unit: 'unidad' }),
  food('f2', 'Tostadas con aceite', { default_quantity: 2, default_unit: 'unidad' }),
  food('f3', 'Café con leche', { is_favorite: true, default_quantity: 1, default_unit: 'taza' }),
]

const USAGE: FoodUsage = new Map([['f2', { breakfast: 3 }]])

const ENTRY: MealEntryWithFood = {
  id: 'e1',
  day_of_week: 2,
  meal_slot: 'breakfast',
  quantity: 1,
  unit: 'taza',
  position: 1,
  food_id: 'f3',
  food_name: 'Café con leche',
}

type Handlers = {
  onSaved: Mock<() => void>
  onClose: Mock<() => void>
  onRemoved: Mock<(entryId: string) => void>
}

let handlers: Handlers
let alertSpy: MockInstance<typeof window.alert>
let confirmSpy: MockInstance<typeof window.confirm>

beforeEach(() => {
  mocked.listFoods.mockResolvedValue(FOODS)
  mocked.getFoodUsage.mockResolvedValue(USAGE)
  mocked.saveMealEntry.mockResolvedValue('e-new')
  mocked.softDeleteEntry.mockResolvedValue()
  mocked.setFavorite.mockResolvedValue()
  mocked.renameFood.mockResolvedValue()
  handlers = {
    onSaved: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
    onRemoved: vi.fn<(entryId: string) => void>(),
  }
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
})

afterEach(() => {
  // Nunca se usan ventanas del navegador
  expect(alertSpy).not.toHaveBeenCalled()
  expect(confirmSpy).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

async function renderPanel(entry?: MealEntryWithFood) {
  render(
    <MealPanel
      sheetId="s1"
      dayOfWeek={2}
      mealSlot="breakfast"
      entry={entry}
      onSaved={handlers.onSaved}
      onClose={handlers.onClose}
      onRemoved={handlers.onRemoved}
    />,
  )
  return screen.findByRole('combobox', { name: '¿Qué has comido?' })
}

const quantityInput = () => screen.getByRole('textbox', { name: 'Cantidad' })
const unitSelect = () => screen.getByRole('combobox', { name: 'Unidad' })
const saveButton = () => screen.getByRole('button', { name: 'Guardar' })

function setQuantity(text: string) {
  fireEvent.change(quantityInput(), { target: { value: text } })
  fireEvent.blur(quantityInput())
}

describe('MealPanel', () => {
  it('muestra el título, carga y pone el foco en el campo de comida', async () => {
    render(
      <MealPanel
        sheetId="s1"
        dayOfWeek={2}
        mealSlot="breakfast"
        onSaved={handlers.onSaved}
        onClose={handlers.onClose}
        onRemoved={handlers.onRemoved}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Desayuno · martes' })).toBeInTheDocument()
    expect(screen.getByText('Cargando tus comidas…')).toBeInTheDocument()
    const input = await screen.findByRole('combobox', { name: '¿Qué has comido?' })
    await waitFor(() => expect(input).toHaveFocus())
    expect(mocked.listFoods).toHaveBeenCalledTimes(1)
    expect(mocked.getFoodUsage).toHaveBeenCalledTimes(1)
  })

  it('si falla la carga, avisa en línea y deja reintentar', async () => {
    mocked.listFoods.mockRejectedValueOnce(new Error('red'))
    render(
      <MealPanel
        sheetId="s1"
        dayOfWeek={2}
        mealSlot="breakfast"
        onSaved={handlers.onSaved}
        onClose={handlers.onClose}
        onRemoved={handlers.onRemoved}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido cargar')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('combobox', { name: '¿Qué has comido?' })).toBeInTheDocument()
    expect(mocked.listFoods).toHaveBeenCalledTimes(2)
  })

  it('guarda una comida nueva escrita a mano con su nombre', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'tostadas con aceite nuevas' } })
    // "Añadir «…»" crea una comida nueva con ese nombre
    fireEvent.click(screen.getByRole('option', { name: /Añadir «tostadas con aceite nuevas»/ }))
    setQuantity('2')
    fireEvent.change(unitSelect(), { target: { value: 'unidad' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(handlers.onSaved).toHaveBeenCalledTimes(1))
    expect(mocked.saveMealEntry).toHaveBeenCalledWith({
      entryId: undefined,
      sheetId: 's1',
      dayOfWeek: 2,
      mealSlot: 'breakfast',
      foodName: 'tostadas con aceite nuevas',
      quantity: 2,
      unit: 'unidad',
    })
  })

  it('con el catálogo vacío, "tostadas con aceite" + 2 unidad se guarda con foodName', async () => {
    mocked.listFoods.mockResolvedValue([])
    mocked.getFoodUsage.mockResolvedValue(new Map())
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'tostadas con aceite' } })
    setQuantity('2')
    fireEvent.change(unitSelect(), { target: { value: 'unidad' } })
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocked.saveMealEntry).toHaveBeenCalledTimes(1))
    expect(mocked.saveMealEntry.mock.calls[0][0]).toMatchObject({
      foodName: 'tostadas con aceite',
      quantity: 2,
      unit: 'unidad',
    })
    expect(mocked.saveMealEntry.mock.calls[0][0]).not.toHaveProperty('foodId')
  })

  it('elegir una comida existente rellena 2 unidad; con + pasa a 3 y se guarda', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'tostadas' } })
    fireEvent.click(screen.getByRole('option', { name: /Tostadas con aceite/ }))

    expect(input).toHaveValue('Tostadas con aceite')
    expect(quantityInput()).toHaveValue('2')
    expect(unitSelect()).toHaveValue('unidad')

    fireEvent.click(screen.getByRole('button', { name: 'Añadir 1' }))
    expect(quantityInput()).toHaveValue('3')
    fireEvent.click(saveButton())

    await waitFor(() => expect(handlers.onSaved).toHaveBeenCalled())
    expect(mocked.saveMealEntry).toHaveBeenCalledWith(
      expect.objectContaining({ foodId: 'f2', quantity: 3, unit: 'unidad' }),
    )
  })

  it('"platano" escrito a mano sin elegir reutiliza "Plátano"', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'platano' } })
    setQuantity('1')
    fireEvent.click(saveButton())

    await waitFor(() => expect(mocked.saveMealEntry).toHaveBeenCalledTimes(1))
    const sent = mocked.saveMealEntry.mock.calls[0][0]
    expect(sent.foodId).toBe('f1')
    expect(sent.foodName).toBeUndefined()
  })

  it('valida comida vacía y cantidad vacía o 0 sin guardar', async () => {
    await renderPanel()
    fireEvent.click(saveButton())
    expect(screen.getByText('Escribe qué has comido')).toBeInTheDocument()
    expect(screen.getByText('Escribe la cantidad')).toBeInTheDocument()
    expect(quantityInput()).toHaveAttribute('aria-invalid', 'true')
    expect(mocked.saveMealEntry).not.toHaveBeenCalled()

    // 0 no es válido (mínimo exclusivo): lo avisa el propio Stepper
    setQuantity('0')
    expect(screen.getByText('Tiene que ser mayor que 0')).toBeInTheDocument()
    fireEvent.click(saveButton())
    expect(mocked.saveMealEntry).not.toHaveBeenCalled()
  })

  it('mientras guarda, el botón dice "Guardando…"; si falla, avisa en línea', async () => {
    let reject: (e: Error) => void = () => {}
    mocked.saveMealEntry.mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r
      }),
    )
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'platano' } })
    setQuantity('1')
    fireEvent.click(saveButton())

    const saving = await screen.findByRole('button', { name: 'Guardando…' })
    expect(saving).toBeDisabled()
    reject(new Error('red'))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido guardar')
    expect(handlers.onSaved).not.toHaveBeenCalled()
    expect(saveButton()).toBeEnabled()
  })

  it('marca y desmarca la favorita de la comida elegida', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'plat' } })
    fireEvent.click(screen.getByRole('option', { name: /Plátano/ }))

    const star = screen.getByRole('button', { name: /Marcar como favorita/ })
    expect(star).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(star)

    await waitFor(() => expect(mocked.setFavorite).toHaveBeenCalledWith('f1', true))
    const pressed = await screen.findByRole('button', { name: /Es favorita/ })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(pressed)
    await waitFor(() => expect(mocked.setFavorite).toHaveBeenLastCalledWith('f1', false))
  })

  it('no ofrece favorita ni corregir nombre para una comida nueva', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'gazpacho' } })
    expect(screen.queryByRole('button', { name: /favorita/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Corregir nombre' })).not.toBeInTheDocument()
  })

  it('corrige el nombre en línea', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'plat' } })
    fireEvent.click(screen.getByRole('option', { name: /Plátano/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Corregir nombre' }))

    const field = screen.getByRole('textbox', { name: 'Nombre correcto' })
    expect(field).toHaveValue('Plátano')
    fireEvent.change(field, { target: { value: 'Plátano de Canarias' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    await waitFor(() => expect(mocked.renameFood).toHaveBeenCalledWith('f1', 'Plátano de Canarias'))
    await waitFor(() => expect(input).toHaveValue('Plátano de Canarias'))
    expect(screen.queryByRole('textbox', { name: 'Nombre correcto' })).not.toBeInTheDocument()
  })

  it('si el nombre ya existe (23505), lo avisa en línea', async () => {
    mocked.renameFood.mockRejectedValueOnce(new Error('Ya tienes una comida con ese nombre'))
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'plat' } })
    fireEvent.click(screen.getByRole('option', { name: /Plátano/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Corregir nombre' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre correcto' }), {
      target: { value: 'Banana' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tienes una comida con ese nombre',
    )
    expect(screen.getByRole('textbox', { name: 'Nombre correcto' })).toBeInTheDocument()
  })

  it('avisa sin llamar a la API si el nombre choca con otro sin tildes', async () => {
    const input = await renderPanel()
    fireEvent.change(input, { target: { value: 'plat' } })
    fireEvent.click(screen.getByRole('option', { name: /Plátano/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Corregir nombre' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre correcto' }), {
      target: { value: 'cafe con leche' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tienes una comida con ese nombre',
    )
    expect(mocked.renameFood).not.toHaveBeenCalled()
  })

  it('al editar una entrada, precarga sus datos y envía entryId', async () => {
    const input = await renderPanel(ENTRY)
    expect(input).toHaveValue('Café con leche')
    expect(quantityInput()).toHaveValue('1')
    expect(unitSelect()).toHaveValue('taza')
    // La comida elegida es la del catálogo: se ve su estado de favorita
    expect(screen.getByRole('button', { name: /Es favorita/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Añadir 1' }))
    fireEvent.click(saveButton())
    await waitFor(() => expect(handlers.onSaved).toHaveBeenCalled())
    expect(mocked.saveMealEntry).toHaveBeenCalledWith({
      entryId: 'e1',
      sheetId: 's1',
      dayOfWeek: 2,
      mealSlot: 'breakfast',
      foodId: 'f3',
      quantity: 2,
      unit: 'taza',
    })
  })

  it('"Quitar de aquí" hace el borrado lógico y avisa al contenedor', async () => {
    await renderPanel(ENTRY)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar de aquí' }))
    await waitFor(() => expect(handlers.onRemoved).toHaveBeenCalledWith('e1'))
    expect(mocked.softDeleteEntry).toHaveBeenCalledWith('e1')
  })

  it('sin entrada no hay "Quitar de aquí"', async () => {
    await renderPanel()
    expect(screen.queryByRole('button', { name: 'Quitar de aquí' })).not.toBeInTheDocument()
  })

  it('"Cancelar" y Escape (con el campo vacío y la lista cerrada) cierran el panel', async () => {
    const input = await renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(handlers.onClose).toHaveBeenCalledTimes(1)

    // Primer Escape: cierra la lista de sugerencias; segundo: cierra el panel.
    // La lista se abre al recibir el foco tras la carga: esperar a que esté
    // abierta evita que el primer Escape cierre el panel (test intermitente).
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(handlers.onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(handlers.onClose).toHaveBeenCalledTimes(2)

    fireEvent.keyDown(quantityInput(), { key: 'Escape' })
    expect(handlers.onClose).toHaveBeenCalledTimes(3)
  })
})

describe('MealPanel · Mover a…', () => {
  function renderWithMove(onMove = vi.fn().mockResolvedValue(undefined)) {
    render(
      <MealPanel
        sheetId="s1"
        dayOfWeek={2}
        mealSlot="breakfast"
        entry={ENTRY}
        onSaved={handlers.onSaved}
        onClose={handlers.onClose}
        onRemoved={handlers.onRemoved}
        onMove={onMove}
      />,
    )
    return onMove
  }

  const moveGroup = () => screen.getByRole('group', { name: 'Mover a…' })

  it('sin onMove o sin entrada no hay "Mover a…"', async () => {
    await renderPanel(ENTRY)
    expect(screen.queryByRole('button', { name: 'Mover a…' })).not.toBeInTheDocument()
  })

  it('abre el selector en línea con el día y el momento actuales y "Ya está aquí"', async () => {
    renderWithMove()
    await screen.findByRole('combobox', { name: '¿Qué has comido?' })
    fireEvent.click(screen.getByRole('button', { name: 'Mover a…' }))

    const group = moveGroup()
    // Dentro del panel (no es una ventana)
    expect(group.closest('.meal-panel')).not.toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const days = within(within(group).getByRole('group', { name: 'Día' })).getAllByRole('button')
    expect(days.map((b) => b.textContent)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    const tuesday = within(group).getByRole('button', { name: 'martes' })
    expect(tuesday).toHaveAttribute('aria-pressed', 'true')
    expect(tuesday).toHaveFocus()
    expect(within(group).getByRole('button', { name: 'lunes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(group).getByRole('combobox', { name: 'Momento' })).toHaveValue('breakfast')

    const moveHere = within(group).getByRole('button', { name: 'Ya está aquí' })
    expect(moveHere).toBeDisabled()
  })

  it('"Mover aquí" llama a onMove con el día y el momento elegidos', async () => {
    const onMove = renderWithMove()
    fireEvent.click(await screen.findByRole('button', { name: 'Mover a…' }))
    const group = moveGroup()
    fireEvent.click(within(group).getByRole('button', { name: 'miércoles' }))
    expect(within(group).getByRole('button', { name: 'miércoles' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.change(within(group).getByRole('combobox', { name: 'Momento' }), {
      target: { value: 'lunch' },
    })
    fireEvent.click(within(group).getByRole('button', { name: 'Mover aquí' }))
    await waitFor(() => expect(onMove).toHaveBeenCalledWith({ day: 3, slot: 'lunch' }))
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  it('cambiar solo el momento también permite mover', async () => {
    const onMove = renderWithMove()
    fireEvent.click(await screen.findByRole('button', { name: 'Mover a…' }))
    fireEvent.change(within(moveGroup()).getByRole('combobox', { name: 'Momento' }), {
      target: { value: 'dinner' },
    })
    fireEvent.click(within(moveGroup()).getByRole('button', { name: 'Mover aquí' }))
    await waitFor(() => expect(onMove).toHaveBeenCalledWith({ day: 2, slot: 'dinner' }))
  })

  it('mientras mueve dice "Moviendo…"; si falla, avisa en línea', async () => {
    let reject!: (error: Error) => void
    const onMove = vi.fn(
      () =>
        new Promise<void>((_, r) => {
          reject = r
        }),
    )
    renderWithMove(onMove)
    fireEvent.click(await screen.findByRole('button', { name: 'Mover a…' }))
    fireEvent.click(within(moveGroup()).getByRole('button', { name: 'jueves' }))
    fireEvent.click(within(moveGroup()).getByRole('button', { name: 'Mover aquí' }))

    const busy = await within(moveGroup()).findByRole('button', { name: 'Moviendo…' })
    expect(busy).toBeDisabled()
    reject(new Error('sin red'))

    expect(await within(moveGroup()).findByRole('alert')).toHaveTextContent(
      'No hemos podido mover la comida',
    )
    expect(within(moveGroup()).getByRole('button', { name: 'Mover aquí' })).toBeEnabled()
    expect(handlers.onClose).not.toHaveBeenCalled()
  })

  it('"Cancelar" y Escape cierran el selector sin cerrar el panel', async () => {
    renderWithMove()
    fireEvent.click(await screen.findByRole('button', { name: 'Mover a…' }))
    fireEvent.click(within(moveGroup()).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('group', { name: 'Mover a…' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mover a…' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Mover a…' }))
    fireEvent.keyDown(within(moveGroup()).getByRole('button', { name: 'martes' }), {
      key: 'Escape',
    })
    expect(screen.queryByRole('group', { name: 'Mover a…' })).not.toBeInTheDocument()
    expect(handlers.onClose).not.toHaveBeenCalled()
  })
})

describe('UndoBar', () => {
  it('es un aviso integrado que llama a onUndo y onClose', async () => {
    const onUndo = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<UndoBar message="Comida quitada" onUndo={onUndo} onClose={onClose} />)

    expect(screen.getByRole('status')).toHaveTextContent('Comida quitada')
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(onUndo).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('si deshacer falla, lo avisa en línea', async () => {
    const onUndo = vi.fn().mockRejectedValue(new Error('red'))
    render(<UndoBar message="Comida quitada" onUndo={onUndo} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hemos podido deshacerlo')
  })
})
