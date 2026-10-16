import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { AuthContext } from './authContext'

/**
 * Mantiene la sesión de Supabase al día: la lee al montar y escucha
 * entradas, renovaciones de token y salidas.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Evita fijar estado si el componente ya se desmontó
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
      })
      .catch(() => {
        // Sin sesión legible: se trata como sesión cerrada
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    // Callback síncrono: Supabase recomienda no llamar a su API desde aquí (puede bloquear)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}
