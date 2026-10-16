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

// Datos de las tablas simulados: la semana actual es la semana 1
const SHEET = {
  id: 'sheet-1',
  start_date: '2026-10-19',
  menu_number: 2,
  owner_id: 'owner-1',
  created_at: '2026-10-19T08:00:00Z',
  updated_at: '2026-10-19T08:00:00Z',
  deleted_at: null,
}
vi.mock('./features/weekly-sheets/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./features/weekly-sheets/api')>()
  return {
    ...actual,
    getOrCreateCurrentSheet: vi.fn(async () => SHEET),
    getSheet: vi.fn(async () => ({ sheet: SHEET, meals: [], dailyLogs: [] })),
  }
})

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

  // Con sesión, "/" es la tabla de la semana: cabecera, enlaces y sin cerrar sesión
  it('con sesión muestra la tabla de la semana con Historial y Ajustes, sin "Cerrar sesión"', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'abc' } }, error: null })
    render(<App />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Semana 1' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'CONTROL SEMANAL de COMIDAS' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('href', '/ajustes')
    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('href', '/historial')
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tu código')).not.toBeInTheDocument()
  })
})
