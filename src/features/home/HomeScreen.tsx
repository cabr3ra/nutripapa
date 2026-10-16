import { Link } from 'react-router'
import './HomeScreen.css'

// Pantalla principal provisional (hasta la spec 006): bienvenida
// y un enlace discreto a los ajustes
export function HomeScreen() {
  return (
    <main className="welcome">
      <nav className="welcome__nav" aria-label="Opciones">
        <Link className="welcome__settings-link" to="/ajustes">
          Ajustes
        </Link>
      </nav>
      <section className="welcome__card" aria-labelledby="welcome-title">
        <h1 id="welcome-title" className="welcome__title">
          CONTROL SEMANAL de COMIDAS
        </h1>
        <p className="welcome__subtitle">
          Hola, aquí apuntarás lo que comes cada semana. Muy pronto estará todo listo para ti.
        </p>
      </section>
    </main>
  )
}

export default HomeScreen
