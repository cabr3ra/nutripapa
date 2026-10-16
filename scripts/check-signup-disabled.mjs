// Comprueba que el registro público de Supabase Auth está desactivado.
// Uso: pnpm check:signup  (lee VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de .env.local)
// Importante: no intenta ningún signUp real (si el registro estuviera abierto, crearía un usuario en producción).
// Solo lee la configuración pública de Auth: GET /auth/v1/settings.
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url))

try {
  process.loadEnvFile(envPath)
} catch {
  // Sin .env.local: se comprueba abajo si faltan las variables.
}

const url = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  console.error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY. Rellénalas en .env.local y vuelve a ejecutar.',
  )
  process.exit(2)
}

let settings
try {
  const response = await fetch(new URL('/auth/v1/settings', url), {
    headers: { apikey: publishableKey },
  })
  if (!response.ok) {
    console.error(`FALLO No se pudo leer la configuración de Auth (HTTP ${response.status}).`)
    process.exit(1)
  }
  settings = await response.json()
} catch (error) {
  console.error(`FALLO No se pudo conectar con Supabase: ${error.message}`)
  process.exit(1)
}

if (settings.disable_signup === true) {
  console.log('OK    El registro público está desactivado (disable_signup: true).')
  process.exit(0)
}

console.log(
  `FALLO El registro público está abierto (disable_signup: ${settings.disable_signup}). ` +
    'Desactívalo en Authentication → Sign In / Providers → "Allow new users to sign up".',
)
process.exit(1)
