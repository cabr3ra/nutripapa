import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DayStrip } from './DayStrip'

const MONDAY = '2026-10-19'

describe('DayStrip', () => {
  it('pinta 7 botones L M X J V S D con nombre completo y fecha', () => {
    render(<DayStrip monday={MONDAY} selectedDay={1} onSelect={() => {}} today="2026-01-01" />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    expect(screen.getByRole('button', { name: 'lunes 19 de octubre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'domingo 25 de octubre' })).toBeInTheDocument()
  })

  it('marca con aria-pressed solo el día elegido', () => {
    render(<DayStrip monday={MONDAY} selectedDay={3} onSelect={() => {}} today="2026-01-01" />)
    const pressed = screen.getAllByRole('button', { pressed: true })
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName('miércoles 21 de octubre')
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(6)
  })

  it('llama a onSelect con el día pulsado', () => {
    const onSelect = vi.fn()
    render(<DayStrip monday={MONDAY} selectedDay={1} onSelect={onSelect} today="2026-01-01" />)
    fireEvent.click(screen.getByRole('button', { name: 'viernes 23 de octubre' }))
    expect(onSelect).toHaveBeenCalledWith(5)
  })

  it('indica hoy en el nombre accesible si cae en la semana', () => {
    render(<DayStrip monday={MONDAY} selectedDay={1} onSelect={() => {}} today="2026-10-22" />)
    expect(screen.getByRole('button', { name: 'jueves 22 de octubre, hoy' })).toBeInTheDocument()
  })

  it('cruza de mes correctamente', () => {
    render(<DayStrip monday="2026-10-26" selectedDay={1} onSelect={() => {}} today="2026-01-01" />)
    expect(screen.getByRole('button', { name: 'domingo 1 de noviembre' })).toBeInTheDocument()
  })
})
