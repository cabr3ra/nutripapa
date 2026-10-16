import { render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthState } from './authContext'

// Estado de sesión controlado por cada test (se simula useAuth)
const mocks = vi.hoisted(() => ({
  auth: { session: null, loading: false } as AuthState,
}))

vi.mock('./useAuth', () => ({
  useAuth: () => mocks.auth,
}))

// AccessCodeScreen importa el cliente: se simula para no tocar red ni entorno
vi.mock('../../lib/supabase', () => ({
  accessEmail: 'acceso@example.com',
  supabase: { auth: { signInWithPassword: vi.fn() } },
}))

import { RequireAuth } from './RequireAuth'

const fakeSession = { access_token: 'abc' } as unknown as Session

describe('RequireAuth', () => {
  beforeEach(() => {
    mocks.auth = { session: null, loading: false }
  })

  it('mientras carga muestra "Cargando…" y no el contenido', () => {
    mocks.auth = { session: null, loading: true }
    render(
      <RequireAuth>
        <p>contenido protegido</p>
      </RequireAuth>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…')
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tu código')).not.toBeInTheDocument()
  })

  it('sin sesión muestra la pantalla de código y no el contenido', () => {
    render(
      <RequireAuth>
        <p>contenido protegido</p>
      </RequireAuth>,
    )
    expect(screen.getByLabelText('Tu código')).toBeInTheDocument()
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument()
  })

  it('con sesión muestra el contenido hijo', () => {
    mocks.auth = { session: fakeSession, loading: false }
    render(
      <RequireAuth>
        <p>contenido protegido</p>
      </RequireAuth>,
    )
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tu código')).not.toBeInTheDocument()
  })

  // Router en memoria con la misma forma que App: RequireAuth como layout
  function renderAt(path: string) {
    const router = createMemoryRouter(
      [
        {
          element: <RequireAuth />,
          children: [
            { path: '/', element: <p>inicio</p> },
            { path: '/ajustes', element: <p>ajustes protegidos</p> },
          ],
        },
      ],
      { initialEntries: [path] },
    )
    render(<RouterProvider router={router} />)
    return router
  }

  it('sin sesión en /ajustes pide el código en la misma ruta (sin redirigir)', () => {
    const router = renderAt('/ajustes')
    expect(screen.getByLabelText('Tu código')).toBeInTheDocument()
    expect(screen.queryByText('ajustes protegidos')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ajustes')
  })

  it('con sesión en /ajustes pinta la ruta hija mediante Outlet', () => {
    mocks.auth = { session: fakeSession, loading: false }
    const router = renderAt('/ajustes')
    expect(screen.getByText('ajustes protegidos')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/ajustes')
  })
})
