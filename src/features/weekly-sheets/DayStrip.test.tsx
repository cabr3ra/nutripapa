import { fireEvent, render, screen } from '@testing-library/react'
import { DndContext, useDndContext } from '@dnd-kit/core'
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

  describe('como zona de destino del arrastre (droppable)', () => {
    /** Pinta los ids de las zonas de destino registradas en el DndContext. */
    function DroppableIds() {
      const { droppableContainers } = useDndContext()
      const ids = droppableContainers.toArray().map((c) => String(c.id))
      return <output data-testid="droppables">{ids.join(',')}</output>
    }

    function renderInContext(droppable: boolean, onSelect = vi.fn(), selectedDay = 2 as const) {
      render(
        <DndContext>
          <DayStrip
            monday={MONDAY}
            selectedDay={selectedDay}
            onSelect={onSelect}
            today="2026-01-01"
            droppable={droppable}
          />
          <DroppableIds />
        </DndContext>,
      )
    }

    it('registra un destino strip-day:1..7 por cada día', () => {
      renderInContext(true)
      const ids = screen.getByTestId('droppables').textContent?.split(',') ?? []
      expect([...ids].sort()).toEqual([1, 2, 3, 4, 5, 6, 7].map((d) => `strip-day:${d}`))
    })

    it('sin droppable no registra ningún destino', () => {
      renderInContext(false)
      expect(screen.getByTestId('droppables')).toHaveTextContent('')
    })

    it('onSelect, aria-pressed y nombres siguen igual', () => {
      const onSelect = vi.fn()
      renderInContext(true, onSelect)
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
        'L',
        'M',
        'X',
        'J',
        'V',
        'S',
        'D',
      ])
      const pressed = screen.getAllByRole('button', { pressed: true })
      expect(pressed).toHaveLength(1)
      expect(pressed[0]).toHaveAccessibleName('martes 20 de octubre')
      fireEvent.click(screen.getByRole('button', { name: 'sábado 24 de octubre' }))
      expect(onSelect).toHaveBeenCalledWith(6)
    })

    it('sin arrastre en curso ningún día lleva la marca de destino', () => {
      renderInContext(true)
      for (const button of screen.getAllByRole('button')) {
        expect(button).not.toHaveClass('day-strip__day--over')
      }
    })
  })
})
