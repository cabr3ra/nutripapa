import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock del cliente único de Supabase: solo interesa signOut
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut } },
}))

import { SettingsScreen } from './SettingsScreen'

// SettingsScreen usa <Link>: necesita un router
function renderSettings() {
  const router = createMemoryRouter([{ path: '/ajustes', element: <SettingsScreen /> }], {
    initialEntries: ['/ajustes'],
  })
  render(<RouterProvider router={router} />)
}

// Promesa que el test resuelve cuando quiere (para ver el estado intermedio)
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const ERROR_TEXT = 'No se ha podido cerrar la sesión. Prueba otra vez.'

describe('SettingsScreen', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    signOut.mockReset()
    // Regla HARD: sin ventanas emergentes
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('cerrar sesión llama a signOut solo en este dispositivo y deshabilita el botón', async () => {
    const pending = deferred<{ error: null }>()
    signOut.mockReturnValue(pending.promise)
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    const busy = await screen.findByRole('button', { name: 'Cerrando sesión…' })
    expect(busy).toBeDisabled()

    // Un segundo clic mientras tanto no repite la llamada
    fireEvent.click(busy)
    expect(signOut).toHaveBeenCalledTimes(1)

    pending.resolve({ error: null })
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()
  })

  it('si signOut devuelve error, avisa en línea y reactiva el botón', async () => {
    signOut.mockResolvedValue({ error: { name: 'AuthApiError', status: 500 } })
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_TEXT)
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })

  it('si signOut lanza una excepción, también avisa en línea', async () => {
    signOut.mockRejectedValue(new Error('sin red'))
    renderSettings()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled()
  })

  it('tiene un enlace para volver a la pantalla principal', () => {
    renderSettings()
    expect(screen.getByRole('link', { name: '← Volver' })).toHaveAttribute('href', '/')
  })
})
