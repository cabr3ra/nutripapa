import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Único cliente de Supabase de toda la app: no crear otros en ningún sitio.

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Email interno del único usuario de acceso (el padre nunca lo ve). */
export const accessEmail = import.meta.env.VITE_ACCESS_EMAIL

const missing = [
  ['VITE_SUPABASE_URL', url],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', publishableKey],
  ['VITE_ACCESS_EMAIL', accessEmail],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  throw new Error(`Faltan variables de entorno: ${missing.join(', ')}. Revisa .env.local.`)
}

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    // Sesión guardada en el dispositivo y renovada sola
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
