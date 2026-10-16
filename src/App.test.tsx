import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Cliente de Supabase simulado: sin red ni variables de entorno
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('./lib/supabase', () => ({
  accessEmail: 'acceso@example.com',
  supabase: {
    auth: {
      getSession,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

import App from './App'

describe('App', () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  })

  // Test de humo: la app se monta y, sin sesión, pide el código
  it('se renderiza y sin sesión muestra la pantalla de código', async () => {
    render(<App />)
    expect(await screen.findByLabelText('Tu código')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'CONTROL SEMANAL de COMIDAS' }),
    ).toBeInTheDocument()
  })

  // Con sesión, "/" es la home: enlace a Ajustes y sin cerrar sesión (solo está en ajustes)
  it('con sesión muestra la home con el enlace a Ajustes y sin "Cerrar sesión"', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'abc' } }, error: null })
    render(<App />)
    const link = await screen.findByRole('link', { name: 'Ajustes' })
    expect(link).toHaveAttribute('href', '/ajustes')
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tu código')).not.toBeInTheDocument()
  })
})
