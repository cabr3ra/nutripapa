import { useId, useRef, useState, type FormEvent } from 'react'
import { accessEmail, supabase } from '../../lib/supabase'
import './AccessCodeScreen.css'

// Longitud mínima del código de acceso (se comprueba sin recortar espacios)
const MIN_CODE_LENGTH = 8

// Mensajes en línea de la pantalla (tuteo cálido, sin ventanas emergentes).
// El campo usa readOnly (no disabled) al enviar para poder devolverle el foco.
const MESSAGES = {
  tooShort: 'El código tiene al menos 8 caracteres.',
  invalid: 'Ese código no es correcto. Prueba otra vez.',
  offline: 'Ahora no hay conexión. Prueba de nuevo en un momento.',
  generic: 'Algo no ha ido bien. Espera un momento y prueba otra vez.',
} as const

// Forma mínima del error de Supabase Auth que nos interesa
type AuthErrorLike = { name?: string; status?: number; code?: string }

// ¿El navegador dice explícitamente que no hay red?
function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

// Traduce un error de inicio de sesión a un mensaje para el usuario
function messageForError(error: AuthErrorLike): string {
  if (error.name === 'AuthRetryableFetchError' || error.status === 0 || isBrowserOffline()) {
    return MESSAGES.offline
  }
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return MESSAGES.invalid
  }
  return MESSAGES.generic
}

/**
 * Pantalla de código de acceso. Si el inicio de sesión va bien no hace nada más:
 * el AuthProvider detecta la sesión nueva con onAuthStateChange.
 */
export function AccessCodeScreen() {
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const messageId = useId()

  // Muestra el mensaje, vacía el campo y devuelve el foco para reintentar
  function fail(text: string) {
    setMessage(text)
    setCode('')
    inputRef.current?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (code.length < MIN_CODE_LENGTH) {
      fail(MESSAGES.tooShort)
      return
    }
    if (isBrowserOffline()) {
      fail(MESSAGES.offline)
      return
    }

    setSubmitting(true)
    setMessage(null)
    let errorText: string | null = null
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: accessEmail,
        password: code,
      })
      if (error) errorText = messageForError(error)
    } catch {
      // Una excepción de fetch es casi siempre falta de red (no se registra nada)
      errorText = MESSAGES.offline
    }
    setSubmitting(false)

    if (errorText) {
      fail(errorText)
    } else {
      // Éxito: el código no se queda ni en el estado
      setCode('')
    }
  }

  return (
    <main className="access">
      <div className="access__card">
        <h1 className="access__title">CONTROL SEMANAL de COMIDAS</h1>
        <p className="access__greeting">¡Hola! Escribe tu código para entrar.</p>

        <form className="access__form" onSubmit={handleSubmit} noValidate>
          <label className="access__label" htmlFor={inputId}>
            Tu código
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className="access__input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? messageId : undefined}
            readOnly={submitting}
          />

          <div id={messageId} className="access__message" role="alert" aria-live="polite">
            {message}
          </div>

          <button className="access__button" type="submit" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default AccessCodeScreen
