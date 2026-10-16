import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock del cliente único de Supabase: nunca se toca la red en los tests
const { signInWithPassword } = vi.hoisted(() => ({ signInWithPassword: vi.fn() }))
vi.mock('../../lib/supabase', () => ({
  accessEmail: 'acceso@example.com',
  supabase: { auth: { signInWithPassword } },
}))

import { AccessCodeScreen } from './AccessCodeScreen'

// Escribe el código y envía el formulario
function submitCode(code: string) {
  const input = screen.getByLabelText('Tu código')
  fireEvent.change(input, { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  return input
}

describe('AccessCodeScreen', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('muestra un único campo de contraseña con su etiqueta visible', () => {
    render(<AccessCodeScreen />)
    const input = screen.getByLabelText('Tu código')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
  })

  it('código corto: avisa y no llama a Supabase', async () => {
    render(<AccessCodeScreen />)
    const input = submitCode('1234567')
    expect(await screen.findByText('El código tiene al menos 8 caracteres.')).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('código incorrecto: muestra el mensaje en línea', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 400, code: 'invalid_credentials' },
    })
    render(<AccessCodeScreen />)
    submitCode('codigo-malo')
    expect(
      await screen.findByText('Ese código no es correcto. Prueba otra vez.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Ese código no es correcto.')
  })

  it('código incorrecto: sin ventanas emergentes y sigue en la pantalla de código', async () => {
    // Regla HARD: nada de alert/confirm; el aviso va en línea
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 400, code: 'invalid_credentials' },
    })
    render(<AccessCodeScreen />)
    const input = submitCode('codigo-malo')
    await screen.findByText('Ese código no es correcto. Prueba otra vez.')
    expect(alertSpy).not.toHaveBeenCalled()
    expect(confirmSpy).not.toHaveBeenCalled()
    // No entra: el campo sigue ahí, vacío, marcado como inválido y con el foco
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
  })

  it('sin red (error reintentable): muestra el aviso de conexión', async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthRetryableFetchError', status: 0 },
    })
    render(<AccessCodeScreen />)
    submitCode('codigo-largo')
    expect(
      await screen.findByText('Ahora no hay conexión. Prueba de nuevo en un momento.'),
    ).toBeInTheDocument()
  })

  it('sin red (navigator.onLine falso): avisa sin llamar a Supabase', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<AccessCodeScreen />)
    submitCode('codigo-largo')
    expect(
      await screen.findByText('Ahora no hay conexión. Prueba de nuevo en un momento.'),
    ).toBeInTheDocument()
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('código correcto: llama con el email interno y no muestra error', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: {}, session: {} }, error: null })
    render(<AccessCodeScreen />)
    const input = submitCode('codigo-bueno')
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'acceso@example.com',
        password: 'codigo-bueno',
      }),
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled())
    expect(screen.getByRole('alert')).toBeEmptyDOMElement()
    expect(input).not.toHaveAttribute('aria-invalid')
  })
})
