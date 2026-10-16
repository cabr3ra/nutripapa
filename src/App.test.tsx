import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  // Test de humo: la app se monta sin romperse
  it('se renderiza sin errores y muestra contenido', () => {
    const { container } = render(<App />)
    expect(container).not.toBeEmptyDOMElement()
  })

  // La pantalla de bienvenida muestra el título exacto de la app
  it('muestra el título "CONTROL SEMANAL de COMIDAS"', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'CONTROL SEMANAL de COMIDAS' }),
    ).toBeInTheDocument()
  })
})
