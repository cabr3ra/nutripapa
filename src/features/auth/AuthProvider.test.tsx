import { act, render, screen } from '@testing-library/react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './useAuth'

// Cliente de Supabase simulado: no se toca la red ni las variables de entorno
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  callback: undefined as undefined | ((event: AuthChangeEvent, session: Session | null) => void),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}))

const fakeSession = (token: string) => ({ access_token: token }) as unknown as Session

// Muestra el estado del hook para poder comprobarlo
function Probe() {
  const { session, loading } = useAuth()
  if (loading) return <p>cargando</p>
  return <p>{session ? `sesión ${session.access_token}` : 'sin sesión'}</p>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.unsubscribe.mockReset()
    mocks.callback = undefined
    mocks.onAuthStateChange.mockReset().mockImplementation((cb) => {
      mocks.callback = cb
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
    })
  })

  it('empieza cargando y luego expone la sesión guardada', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: fakeSession('abc') }, error: null })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByText('cargando')).toBeInTheDocument()
    expect(await screen.findByText('sesión abc')).toBeInTheDocument()
  })

  it('sin sesión guardada deja session a null', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(await screen.findByText('sin sesión')).toBeInTheDocument()
  })

  it('un evento de onAuthStateChange actualiza la sesión', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText('sin sesión')
    act(() => mocks.callback?.('SIGNED_IN', fakeSession('nuevo')))
    expect(screen.getByText('sesión nuevo')).toBeInTheDocument()
    act(() => mocks.callback?.('SIGNED_OUT', null))
    expect(screen.getByText('sin sesión')).toBeInTheDocument()
  })

  it('al desmontar cancela la suscripción', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await screen.findByText('sin sesión')
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('useAuth fuera del provider lanza un error claro', () => {
    // Silencia el log de error de React en este caso esperado
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow('useAuth debe usarse dentro de <AuthProvider>.')
    spy.mockRestore()
  })
})
