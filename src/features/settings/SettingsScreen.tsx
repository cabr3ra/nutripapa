import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import './SettingsScreen.css'

const SIGN_OUT_ERROR = 'No se ha podido cerrar la sesión. Prueba otra vez.'

/**
 * Ajustes: de momento solo cerrar sesión. Se cierra solo en este dispositivo
 * (scope 'local') para no sacar al resto. Sin confirmación ni ventanas:
 * al quedar la sesión a null, RequireAuth vuelve a pedir el código.
 */
export function SettingsScreen() {
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    setError(null)
    let failed: boolean
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      failed = Boolean(signOutError)
    } catch {
      failed = true
    }
    // Si fue bien, RequireAuth ya habrá desmontado esta pantalla; solo se toca
    // el estado cuando hay que avisar en línea
    if (failed) {
      setError(SIGN_OUT_ERROR)
      setSigningOut(false)
    }
  }

  return (
    <main className="settings">
      <div className="settings__card">
        <Link className="settings__back" to="/">
          ← Volver
        </Link>
        <h1 className="settings__title">Ajustes</h1>

        <div className="settings__message" role="alert" aria-live="polite">
          {error}
        </div>

        <button
          className="settings__sign-out"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </div>
    </main>
  )
}

export default SettingsScreen
