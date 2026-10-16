import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

/** Estado de sesión que comparte AuthProvider con toda la app. */
export interface AuthState {
  session: Session | null
  loading: boolean
}

// undefined = se está usando fuera de <AuthProvider>
export const AuthContext = createContext<AuthState | undefined>(undefined)
