import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { WeekPicker } from './WeekPicker'

// Envoltorio con estado para ver cómo cambia el texto al navegar
function Controlled({ initial, spy }: { initial: string; spy: (monday: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <WeekPicker
      value={value}
      onChange={(monday) => {
        spy(monday)
        setValue(monday)
      }}
    />
  )
}

describe('WeekPicker', () => {
  it('muestra "Semana N" y el rango corto', () => {
    render(<WeekPicker value="2026-10-26" onChange={() => {}} />)
    expect(screen.getByText('Semana 2')).toBeInTheDocument()
    expect(screen.getByText('26 oct–1 nov')).toBeInTheDocument()
  })

  it('antes de la semana 1 muestra solo el rango', () => {
    render(<WeekPicker value="2026-10-12" onChange={() => {}} />)
    expect(screen.getByText('12–18 oct')).toBeInTheDocument()
    expect(screen.queryByText(/Semana \d/)).not.toBeInTheDocument()
  })

  it('las flechas mueven una semana atrás y adelante', () => {
    const spy = vi.fn()
    render(<Controlled initial="2026-10-19" spy={spy} />)

    fireEvent.click(screen.getByRole('button', { name: 'Semana siguiente' }))
    expect(spy).toHaveBeenLastCalledWith('2026-10-26')
    expect(screen.getByText('Semana 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }))
    expect(spy).toHaveBeenLastCalledWith('2026-10-12')
    expect(screen.getByText('12–18 oct')).toBeInTheDocument()
  })
})
