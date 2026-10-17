import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MealDndProvider } from './MealDndProvider'

describe('MealDndProvider', () => {
  it('pinta su contenido y las instrucciones en español para lector de pantalla', () => {
    render(
      <MealDndProvider meals={[]} labelFor={() => 'esta comida'} onMove={vi.fn()}>
        <p>Tabla de la semana</p>
      </MealDndProvider>,
    )
    expect(screen.getByText('Tabla de la semana')).toBeInTheDocument()
    expect(screen.getByText(/pulsa Intro para abrir su panel y usa «Mover a…»/)).toBeInTheDocument()
  })
})
