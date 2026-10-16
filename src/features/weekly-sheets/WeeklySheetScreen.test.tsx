import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SheetDetail, WeeklySheet } from './api'

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

import { getOrCreateCurrentSheet, getSheet, updateMenuNumber } from './api'
import { WeeklySheetScreen } from './WeeklySheetScreen'

const mocked = {
  getOrCreateCurrentSheet: vi.mocked(getOrCreateCurrentSheet),
  getSheet: vi.mocked(getSheet),
  updateMenuNumber: vi.mocked(updateMenuNumber),
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
