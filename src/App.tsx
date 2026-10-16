import './App.css'

// Pantalla de bienvenida provisional: aún sin funcionalidades,
// solo el título de la app con la paleta y la fuente ya aplicadas
function App() {
  return (
    <main className="welcome">
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

export default App
