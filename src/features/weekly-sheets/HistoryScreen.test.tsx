import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeeklySheet } from './api'

// El cliente real de Supabase exige variables de entorno: aquí no hace falta
vi.mock('../../lib/supabase', () => ({ supabase: {} }))

// Mock parcial: se simulan las llamadas a Supabase y se mantienen los helpers puros
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return {
    ...actual,
    listSheets: vi.fn(),
    createSheet: vi.fn(),
    duplicateSheet: vi.fn(),
    softDeleteSheet: vi.fn(),
    restoreSheet: vi.fn(),
  }
})

import { createSheet, duplicateSheet, listSheets, restoreSheet, softDeleteSheet } from './api'
import { HistoryScreen } from './HistoryScreen'

const mocked = {
  listSheets: vi.mocked(listSheets),
  createSheet: vi.mocked(createSheet),
  duplicateSheet: vi.mocked(duplicateSheet),
  softDeleteSheet: vi.mocked(softDeleteSheet),
  restoreSheet: vi.mocked(restoreSheet),
}

function sheet(id: string, start: string, menu: number | null, created: string): WeeklySheet {
  return {
    id,
    start_date: start,
    menu_number: menu,
    created_at: created,
    updated_at: created,
    deleted_at: null,
  } as WeeklySheet
}

// Semana 2 con una tabla, semana 1 con dos y una semana anterior a la 1
const SHEETS: WeeklySheet[] = [
  sheet('s2-a', '2026-10-26', 3, '2026-10-20T10:00:00Z'),
  sheet('s1-old', '2026-10-19', 2, '2026-10-15T10:00:00Z'),
  sheet('s1-new', '2026-10-19', null, '2026-10-16T10:00:00Z'),
  sheet('s0', '2026-10-12', 1, '2026-10-12T10:00:00Z'),
]

function renderHistory() {
  const router = createMemoryRouter(
    [
      { path: '/historial', element: <HistoryScreen /> },
      { path: '/tabla/:id', element: <p>Pantalla de tabla</p> },
      { path: '/', element: <p>Inicio</p> },
    ],
    { initialEntries: ['/historial'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

/** El <li> de la tabla cuyo texto de menú es `label`. */
function row(label: string): HTMLElement {
  return screen.getByText(label).closest('li') as HTMLElement
}

describe('HistoryScreen', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    Object.values(mocked).forEach((fn) => fn.mockReset())
    mocked.listSheets.mockResolvedValue(SHEETS)
    // Hoy: miércoles 21-oct-2026 (semana 1). Solo se finge Date.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 21, 12))
    // Regla HARD: sin ventanas emergentes
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('muestra "Cargando…" y luego la lista agrupada por semana, de la más reciente a la más antigua', async () => {
    renderHistory()
    expect(screen.getByText('Cargando…')).toBeInTheDocument()

    const headings = await screen.findAllByRole('heading', { level: 2 })
    expect(headings.map((h) => h.textContent)).toEqual([
      'Semana 2 · 26 oct–1 nov',
      'Semana 1 · 19–25 oct',
      '12–18 oct',
    ])

    // Dentro de la semana 1, la más reciente primero
    const week1 = headings[1].closest('section') as HTMLElement
    const items = within(week1).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Sin número de menú')
    expect(items[1]).toHaveTextContent('Menú 2')
    expect(within(items[0]).getByRole('link', { name: 'Abrir' })).toHaveAttribute(
      'href',
      '/tabla/s1-new',
    )
  })

  it('si falla la carga, avisa en línea y deja reintentar', async () => {
    mocked.listSheets.mockRejectedValueOnce(new Error('sin red'))
    renderHistory()

    expect(await screen.findByRole('alert')).toHaveTextContent(/No hemos podido cargar/)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Menú 3')).toBeInTheDocument()
    expect(mocked.listSheets).toHaveBeenCalledTimes(2)
  })

  it('Nueva tabla: panel integrado con la semana actual, crea y navega', async () => {
    mocked.createSheet.mockResolvedValue(sheet('nueva', '2026-10-26', null, '2026-10-21T12:00:00Z'))
    const router = renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(screen.getByRole('button', { name: 'Nueva tabla' }))
    const panel = screen.getByRole('region', { name: 'Nueva tabla' })
    expect(within(panel).getByText('Semana 1')).toBeInTheDocument()

    fireEvent.click(within(panel).getByRole('button', { name: 'Semana siguiente' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Crear' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/tabla/nueva'))
    expect(mocked.createSheet).toHaveBeenCalledWith('2026-10-26')
  })

  it('Duplicar: por defecto la semana siguiente, llama a duplicateSheet y navega', async () => {
    mocked.duplicateSheet.mockResolvedValue('copia')
    const router = renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Duplicar' }))
    const item = row('Menú 2')
    expect(within(item).getByText('Semana 2')).toBeInTheDocument()

    fireEvent.click(within(item).getByRole('button', { name: 'Duplicar aquí' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tabla/copia'))
    expect(mocked.duplicateSheet).toHaveBeenCalledWith('s1-old', '2026-10-26')
  })

  it('solo hay un panel abierto a la vez', async () => {
    renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(screen.getByRole('button', { name: 'Nueva tabla' }))
    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Duplicar' }))
    expect(screen.queryByRole('region', { name: 'Nueva tabla' })).not.toBeInTheDocument()

    fireEvent.click(within(row('Sin número de menú')).getByRole('button', { name: 'Eliminar' }))
    expect(screen.queryByRole('button', { name: 'Duplicar aquí' })).not.toBeInTheDocument()
    expect(screen.getByText('¿Eliminar esta tabla?')).toBeInTheDocument()
  })

  it('Eliminar pide confirmación en línea, borra y permite deshacer', async () => {
    mocked.softDeleteSheet.mockResolvedValue()
    mocked.restoreSheet.mockResolvedValue()
    renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Eliminar' }))
    const item = row('Menú 2')
    expect(within(item).getByText('¿Eliminar esta tabla?')).toBeInTheDocument()
    expect(mocked.softDeleteSheet).not.toHaveBeenCalled()

    // "No" cierra sin borrar
    fireEvent.click(within(item).getByRole('button', { name: 'No' }))
    expect(screen.queryByText('¿Eliminar esta tabla?')).not.toBeInTheDocument()

    mocked.listSheets.mockResolvedValue(SHEETS.filter((s) => s.id !== 's1-old'))
    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Eliminar' }))
    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Sí, eliminar' }))

    const bar = await screen.findByRole('status')
    expect(bar).toHaveTextContent('Tabla eliminada')
    expect(mocked.softDeleteSheet).toHaveBeenCalledWith('s1-old')
    await waitFor(() => expect(screen.queryByText('Menú 2')).not.toBeInTheDocument())

    mocked.listSheets.mockResolvedValue(SHEETS)
    fireEvent.click(within(bar).getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(mocked.restoreSheet).toHaveBeenCalledWith('s1-old'))
    expect(await screen.findByText('Menú 2')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('la barra de deshacer se puede cerrar', async () => {
    mocked.softDeleteSheet.mockResolvedValue()
    renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Eliminar' }))
    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Sí, eliminar' }))
    const bar = await screen.findByRole('status')
    fireEvent.click(within(bar).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(mocked.restoreSheet).not.toHaveBeenCalled()
  })

  it('si falla el borrado, avisa en línea junto a la acción', async () => {
    mocked.softDeleteSheet.mockRejectedValue(new Error('boom'))
    renderHistory()
    await screen.findByText('Menú 3')

    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Eliminar' }))
    fireEvent.click(within(row('Menú 2')).getByRole('button', { name: 'Sí, eliminar' }))
    expect(await within(row('Menú 2')).findByRole('alert')).toHaveTextContent(
      /No hemos podido eliminar/,
    )
  })

  it('la única tabla de su semana no se puede eliminar y lo explica', async () => {
    renderHistory()
    await screen.findByText('Menú 3')

    const button = within(row('Menú 3')).getByRole('button', { name: 'Eliminar' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Es la única tabla de esta semana')

    // Las de una semana con dos tablas sí se pueden eliminar
    expect(within(row('Menú 2')).getByRole('button', { name: 'Eliminar' })).toBeEnabled()
  })
})
