import { useContext } from 'react'
import { AuthContext, type AuthState } from './authContext'

/** Devuelve la sesión actual y si todavía se está cargando. */
export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return context
}
