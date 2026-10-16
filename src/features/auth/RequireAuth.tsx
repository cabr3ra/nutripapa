import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AccessCodeScreen } from './AccessCodeScreen'
import { useAuth } from './useAuth'
import './RequireAuth.css'

/**
 * Protege las rutas: mientras se lee la sesión muestra una pantalla neutra;
 * sin sesión muestra la pantalla de código en la misma URL (sin redirigir);
 * con sesión pinta el contenido (children o la ruta hija).
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="auth-loading" aria-busy="true">
        <p className="auth-loading__text" role="status">
          Cargando…
        </p>
      </main>
    )
  }

  if (!session) return <AccessCodeScreen />

  return children ?? <Outlet />
}

export default RequireAuth
