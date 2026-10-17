import { act, fireEvent, render, screen, within } from '@testing-library/react'
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
import type { DailyLog, DailyLogValues } from './api'

// El cliente real de Supabase exige variables de entorno: aquí no hace falta
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return { ...actual, saveDailyLog: vi.fn() }
})

import { saveDailyLog } from './api'
import { TrackingPanel } from './TrackingPanel'

const save = saveDailyLog as Mock

function fakeLog(values: Partial<DailyLogValues> = {}): DailyLog {
  return {
    id: 'log-1',
    owner_id: 'owner-1',
    sheet_id: 'sheet-1',
    day_of_week: 2,
    water_liters: null,
    pee_count: null,
    poop_count: null,
    steps: null,
    created_at: '2026-10-20T08:00:00Z',
    updated_at: '2026-10-20T08:00:00Z',
    deleted_at: null,
    ...values,
  }
}

// Devuelve lo que se guarda, como haría la BD
function saveEchoes() {
  save.mockImplementation(async (_sheet: string, _day: number, values: DailyLogValues) =>
    fakeLog(values),
  )
}

function renderPanel(log?: DailyLog) {
  const onSaved = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <TrackingPanel sheetId="sheet-1" dayOfWeek={2} log={log} onSaved={onSaved} onClose={onClose} />,
  )
  return { ...utils, onSaved, onClose }
}

// Pasa el tiempo y deja que terminen las promesas del guardado
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function plus(label: string) {
  const group = screen.getByRole('group', { name: label })
  return within(group).getByRole('button', { name: /^Añadir/ })
}

let alertSpy: MockInstance
let confirmSpy: MockInstance

beforeEach(() => {
  vi.useFakeTimers()
  save.mockReset()
  saveEchoes()
  alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
})

afterEach(() => {
  expect(alertSpy).not.toHaveBeenCalled()
  expect(confirmSpy).not.toHaveBeenCalled()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('TrackingPanel', () => {
  it('muestra el título del día y pone el foco en él', () => {
    renderPanel()
    const title = screen.getByRole('heading', { name: 'Seguimiento del martes' })
    expect(title).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Seguimiento del martes' })).toBeInTheDocument()
    // Vacío se ve vacío, no 0
    expect(screen.getByRole('textbox', { name: 'Agua' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Pasos' })).toHaveValue('')
  })

  it('+ de agua 6 veces desde vacío muestra 1,5 y guarda una sola vez tras 600 ms', async () => {
    const { onSaved } = renderPanel()
    for (let i = 0; i < 6; i++) fireEvent.click(plus('Agua'))
    expect(screen.getByRole('textbox', { name: 'Agua' })).toHaveValue('1,5')

    await advance(599)
    expect(save).not.toHaveBeenCalled()
    await advance(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('sheet-1', 2, {
      water_liters: 1.5,
      pee_count: null,
      poop_count: null,
      steps: null,
    })
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ water_liters: 1.5 }))
    expect(screen.getByRole('status')).toHaveTextContent('Guardado')
  })

  it('cada cambio reinicia la espera de 600 ms', async () => {
    renderPanel()
    fireEvent.click(plus('Agua'))
    await advance(400)
    fireEvent.click(plus('Agua'))
    await advance(400)
    expect(save).not.toHaveBeenCalled()
    await advance(200)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2].water_liters).toBe(0.5)
  })

  it('Pis 5 y Caca 1 se guardan juntos en un solo guardado', async () => {
    renderPanel()
    for (let i = 0; i < 5; i++) fireEvent.click(plus('Pis'))
    fireEvent.click(plus('Caca'))
    expect(screen.getByRole('textbox', { name: 'Pis' })).toHaveValue('5')
    expect(screen.getByRole('textbox', { name: 'Caca' })).toHaveValue('1')
    await advance(600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2]).toEqual({
      water_liters: null,
      pee_count: 5,
      poop_count: 1,
      steps: null,
    })
  })

  it('pasos "8500" al salir del campo guarda 8500 y muestra "8.500"', async () => {
    renderPanel()
    const steps = screen.getByRole('textbox', { name: 'Pasos' })
    expect(steps).toHaveAttribute('inputmode', 'numeric')
    fireEvent.change(steps, { target: { value: '8500' } })
    fireEvent.blur(steps)
    expect(steps).toHaveValue('8.500')
    await advance(600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2].steps).toBe(8500)
  })

  it('pasos con Enter también se leen', async () => {
    renderPanel()
    const steps = screen.getByRole('textbox', { name: 'Pasos' })
    fireEvent.change(steps, { target: { value: '12000' } })
    fireEvent.keyDown(steps, { key: 'Enter' })
    expect(steps).toHaveValue('12.000')
    await advance(600)
    expect(save.mock.calls[0][2].steps).toBe(12000)
  })

  it('pasos "8,5" muestra un error en línea y no guarda', async () => {
    renderPanel()
    const steps = screen.getByRole('textbox', { name: 'Pasos' })
    fireEvent.change(steps, { target: { value: '8,5' } })
    fireEvent.blur(steps)
    expect(screen.getByText('Escribe un número entero de pasos')).toBeInTheDocument()
    expect(steps).toHaveAttribute('aria-invalid', 'true')
    await advance(2000)
    expect(save).not.toHaveBeenCalled()
  })

  it('Vaciar agua lo deja sin apuntar (null)', async () => {
    renderPanel(fakeLog({ water_liters: 2, pee_count: 3 }))
    expect(screen.getByRole('textbox', { name: 'Agua' })).toHaveValue('2')
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar agua' }))
    expect(screen.getByRole('textbox', { name: 'Agua' })).toHaveValue('')
    await advance(600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2]).toEqual({
      water_liters: null,
      pee_count: 3,
      poop_count: null,
      steps: null,
    })
    expect(screen.getByRole('button', { name: 'Vaciar agua' })).toBeDisabled()
  })

  it('Vaciar pasos lo deja sin apuntar', async () => {
    renderPanel(fakeLog({ steps: 4000 }))
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar pasos' }))
    expect(screen.getByRole('textbox', { name: 'Pasos' })).toHaveValue('')
    await advance(600)
    expect(save.mock.calls[0][2].steps).toBeNull()
  })

  it('avisa al pasar de 10 L y guarda igual', async () => {
    renderPanel(fakeLog({ water_liters: 10 }))
    expect(screen.queryByText(/Más de 10 litros/)).not.toBeInTheDocument()
    fireEvent.click(plus('Agua'))
    expect(screen.getByText(/Más de 10 litros/)).toBeInTheDocument()
    await advance(600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2].water_liters).toBe(10.25)
  })

  it('si falla el guardado muestra el error y "Reintentar" vuelve a guardar', async () => {
    save.mockRejectedValueOnce(new Error('sin red'))
    const { onSaved } = renderPanel()
    fireEvent.click(plus('Agua'))
    await advance(600)
    expect(screen.getByRole('status')).toHaveTextContent('No se ha podido guardar')
    expect(onSaved).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await advance(0)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1][2].water_liters).toBe(0.25)
    expect(screen.getByRole('status')).toHaveTextContent('Guardado')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(onSaved).toHaveBeenCalledTimes(1)
  })

  it('"Listo" con cambios pendientes guarda antes de cerrar', async () => {
    const { onClose, onSaved } = renderPanel()
    fireEvent.click(plus('Pis'))
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(onClose).not.toHaveBeenCalled()
    await advance(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSaved.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0])
    // El temporizador ya no guarda otra vez
    await advance(1000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('"Listo" no cierra si el guardado falla', async () => {
    save.mockRejectedValueOnce(new Error('sin red'))
    const { onClose } = renderPanel()
    fireEvent.click(plus('Caca'))
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    await advance(0)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('No se ha podido guardar')
  })

  it('Escape cierra guardando lo pendiente', async () => {
    const { onClose } = renderPanel()
    fireEvent.click(plus('Agua'))
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Seguimiento del martes' }), {
      key: 'Escape',
    })
    await advance(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sin cambios no guarda (ni al cerrar)', async () => {
    const { onClose } = renderPanel(fakeLog({ water_liters: 1 }))
    await advance(2000)
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    await advance(0)
    expect(save).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('volver al mismo valor de lo guardado no guarda', async () => {
    renderPanel(fakeLog({ pee_count: 2 }))
    fireEvent.click(plus('Pis'))
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Pis' })).getByRole('button', { name: /^Quitar/ }),
    )
    await advance(600)
    expect(save).not.toHaveBeenCalled()
  })

  it('al desmontarse con cambios pendientes los guarda igualmente', async () => {
    const { unmount } = renderPanel()
    fireEvent.click(plus('Agua'))
    unmount()
    await advance(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][2].water_liters).toBe(0.25)
  })
})
