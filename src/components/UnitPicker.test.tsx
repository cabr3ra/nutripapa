import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { UnitPicker } from './UnitPicker'

// Envoltorio con estado para ver cómo reacciona el selector
function Controlled({
  initial = null,
  spy = () => {},
}: {
  initial?: string | null
  spy?: (unit: string | null) => void
}) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <UnitPicker
      value={value}
      onChange={(unit) => {
        spy(unit)
        setValue(unit)
      }}
    />
  )
}

const select = () => screen.getByLabelText('Unidad')
const otherInput = () => screen.queryByLabelText('Escribe la unidad')

describe('UnitPicker', () => {
  it('ofrece la lista corta y "Otra…"', () => {
    render(<UnitPicker value="unidad" onChange={() => {}} />)
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual([
      'unidad',
      'rebanada',
      'taza',
      'cucharada',
      'vaso',
      'g',
      'ml',
      'ración',
      'Otra…',
    ])
    expect(select()).toHaveValue('unidad')
    expect(otherInput()).not.toBeInTheDocument()
  })

  it('elegir una unidad de la lista la propaga', () => {
    const spy = vi.fn()
    render(<Controlled initial="unidad" spy={spy} />)
    fireEvent.change(select(), { target: { value: 'g' } })
    expect(spy).toHaveBeenLastCalledWith('g')
    expect(select()).toHaveValue('g')
  })

  it('"Otra…" muestra el campo y propaga el texto escrito', () => {
    const spy = vi.fn()
    render(<Controlled initial="unidad" spy={spy} />)
    fireEvent.change(select(), { target: { value: '__other__' } })
    expect(spy).toHaveBeenLastCalledWith(null)
    expect(otherInput()).toBeInTheDocument()

    fireEvent.change(otherInput()!, { target: { value: 'pizca ' } })
    expect(spy).toHaveBeenLastCalledWith('pizca')
    // No se come el espacio mientras se escribe
    expect(otherInput()).toHaveValue('pizca ')

    fireEvent.change(otherInput()!, { target: { value: 'pizca de sal' } })
    expect(spy).toHaveBeenLastCalledWith('pizca de sal')
  })

  it('vaciar el campo de "Otra…" lo deja abierto y propaga null', () => {
    const spy = vi.fn()
    render(<Controlled initial="pizca" spy={spy} />)
    fireEvent.change(otherInput()!, { target: { value: '' } })
    expect(spy).toHaveBeenLastCalledWith(null)
    expect(otherInput()).toBeInTheDocument()
  })

  it('un valor que no está en la lista abre el campo con ese texto', () => {
    render(<UnitPicker value="pizca" onChange={() => {}} />)
    expect(select()).toHaveValue('__other__')
    expect(otherInput()).toHaveValue('pizca')
  })

  it('volver a una unidad de la lista cierra el campo', () => {
    const spy = vi.fn()
    render(<Controlled initial="pizca" spy={spy} />)
    fireEvent.change(select(), { target: { value: 'taza' } })
    expect(spy).toHaveBeenLastCalledWith('taza')
    expect(otherInput()).not.toBeInTheDocument()
  })

  it('se sincroniza si el valor cambia desde fuera', () => {
    const { rerender } = render(<UnitPicker value="unidad" onChange={() => {}} />)
    rerender(<UnitPicker value="puñado" onChange={() => {}} />)
    expect(otherInput()).toHaveValue('puñado')
    rerender(<UnitPicker value="ml" onChange={() => {}} />)
    expect(select()).toHaveValue('ml')
    expect(otherInput()).not.toBeInTheDocument()
  })

  it('sin valor muestra "Elige una unidad"', () => {
    render(<UnitPicker value={null} onChange={() => {}} />)
    expect(select()).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Elige una unidad' })).toBeDisabled()
  })
})
