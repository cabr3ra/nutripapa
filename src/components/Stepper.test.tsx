import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Stepper } from './Stepper'

type Props = Omit<ComponentProps<typeof Stepper>, 'value' | 'onChange'>

// Envoltorio con estado para ver cómo cambia el valor mostrado
function Controlled({
  initial = null,
  spy = () => {},
  ...props
}: Props & { initial?: number | null; spy?: (value: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <Stepper
      {...props}
      value={value}
      onChange={(next) => {
        spy(next)
        setValue(next)
      }}
    />
  )
}

const input = () => screen.getByRole('textbox')
const plus = (name = 'Añadir 1') => screen.getByRole('button', { name })
const minus = (name = 'Quitar 1') => screen.getByRole('button', { name })

// Escribe en el campo y sale de él
function typeAndLeave(text: string) {
  fireEvent.change(input(), { target: { value: text } })
  fireEvent.blur(input())
}

describe('Stepper', () => {
  it('muestra la etiqueta visible asociada al campo', () => {
    render(<Stepper label="Cantidad" value={2} onChange={() => {}} step={1} />)
    expect(screen.getByRole('textbox', { name: 'Cantidad' })).toHaveValue('2')
    expect(screen.getByRole('group', { name: 'Cantidad' })).toBeInTheDocument()
  })

  it('+ y − con paso 1', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} initial={2} spy={spy} />)
    fireEvent.click(plus())
    expect(spy).toHaveBeenLastCalledWith(3)
    expect(input()).toHaveValue('3')
    fireEvent.click(minus())
    fireEvent.click(minus())
    expect(spy).toHaveBeenLastCalledWith(1)
    expect(input()).toHaveValue('1')
  })

  it('6 veces + desde vacío con paso 0,25 da 1,5', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.25} allowDecimals unitSuffix="L" spy={spy} />)
    expect(input()).toHaveValue('')
    for (let i = 0; i < 6; i++) fireEvent.click(plus('Añadir 0,25'))
    expect(spy).toHaveBeenLastCalledWith(1.5)
    expect(input()).toHaveValue('1,5')
    expect(input()).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('paso 0,1 sin errores de coma flotante', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.1} allowDecimals initial={0.1} spy={spy} />)
    fireEvent.click(plus('Añadir 0,1'))
    fireEvent.click(plus('Añadir 0,1'))
    expect(spy).toHaveBeenLastCalledWith(0.3)
  })

  it('desde vacío, − no hace nada y está deshabilitado', () => {
    const spy = vi.fn()
    render(<Controlled label="Pis" step={1} spy={spy} />)
    expect(minus()).toBeDisabled()
    fireEvent.click(minus())
    expect(spy).not.toHaveBeenCalled()
    expect(input()).toHaveAttribute('inputmode', 'numeric')
  })

  it('desde vacío, + pone el mínimo si es mayor que el paso', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} min={5} spy={spy} />)
    fireEvent.click(plus())
    expect(spy).toHaveBeenLastCalledWith(5)
  })

  it('− no baja del mínimo y se deshabilita al llegar', () => {
    const spy = vi.fn()
    render(<Controlled label="Pis" step={1} initial={1} spy={spy} />)
    fireEvent.click(minus())
    expect(spy).toHaveBeenLastCalledWith(0)
    expect(minus()).toBeDisabled()
  })

  it('+ se deshabilita al llegar al máximo y no lo pasa', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.25} allowDecimals max={1} initial={0.9} spy={spy} />)
    fireEvent.click(plus('Añadir 0,25'))
    expect(spy).toHaveBeenLastCalledWith(1)
    expect(plus('Añadir 0,25')).toBeDisabled()
  })

  it('minExclusive: − no baja de 1 con paso 1, pero 0,5 escrito es válido', () => {
    const spy = vi.fn()
    render(
      <Controlled label="Cantidad" step={1} minExclusive allowDecimals initial={2} spy={spy} />,
    )
    fireEvent.click(minus())
    expect(spy).toHaveBeenLastCalledWith(1)
    expect(minus()).toBeDisabled()

    typeAndLeave('0,5')
    expect(spy).toHaveBeenLastCalledWith(0.5)
    expect(input()).toHaveValue('0,5')
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('minExclusive: desde vacío + pone el paso', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={10} minExclusive spy={spy} />)
    fireEvent.click(plus('Añadir 10'))
    expect(spy).toHaveBeenLastCalledWith(10)
  })

  it('minExclusive: escribir 0 es inválido con su mensaje', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} minExclusive initial={2} spy={spy} />)
    typeAndLeave('0')
    expect(spy).not.toHaveBeenCalled()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription('Tiene que ser mayor que 0')
  })

  it('acepta "1,5" y "1.5" y normaliza con coma', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.25} allowDecimals spy={spy} />)
    typeAndLeave('1,5')
    expect(spy).toHaveBeenLastCalledWith(1.5)
    typeAndLeave('2.75')
    expect(spy).toHaveBeenLastCalledWith(2.75)
    expect(input()).toHaveValue('2,75')
  })

  it('Enter también valida', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} spy={spy} />)
    fireEvent.change(input(), { target: { value: '4' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(spy).toHaveBeenLastCalledWith(4)
  })

  it('texto inválido no llama a onChange y muestra el mensaje en línea', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} initial={2} spy={spy} describedBy="ayuda" />)
    typeAndLeave('dos')
    expect(spy).not.toHaveBeenCalled()
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveValue('dos')
    const message = screen.getByText('Escribe un número')
    expect(input().getAttribute('aria-describedby')?.split(' ')).toEqual(['ayuda', message.id])

    // Al volver a escribir se quita el error
    fireEvent.change(input(), { target: { value: '3' } })
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('sin decimales, "1,5" es inválido', () => {
    const spy = vi.fn()
    render(<Controlled label="Pis" step={1} spy={spy} />)
    typeAndLeave('1,5')
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe un número entero')).toBeInTheDocument()
  })

  it('por encima del máximo es inválido', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.25} allowDecimals max={99.99} spy={spy} />)
    typeAndLeave('100')
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByText('Tiene que ser 99,99 o menos')).toBeInTheDocument()
  })

  it('negativo con mínimo 0 es inválido', () => {
    const spy = vi.fn()
    render(<Controlled label="Pis" step={1} spy={spy} />)
    typeAndLeave('-1')
    expect(spy).not.toHaveBeenCalled()
    expect(screen.getByText('Tiene que ser 0 o más')).toBeInTheDocument()
  })

  it('campo vacío al salir → null', () => {
    const spy = vi.fn()
    render(<Controlled label="Agua" step={0.25} allowDecimals initial={1.5} spy={spy} />)
    typeAndLeave('')
    expect(spy).toHaveBeenLastCalledWith(null)
    expect(input()).toHaveValue('')
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('+ tras un texto inválido descarta el borrador y suma al valor', () => {
    const spy = vi.fn()
    render(<Controlled label="Cantidad" step={1} initial={2} spy={spy} />)
    typeAndLeave('abc')
    fireEvent.click(plus())
    expect(spy).toHaveBeenLastCalledWith(3)
    expect(input()).toHaveValue('3')
    expect(input()).not.toHaveAttribute('aria-invalid')
  })

  it('muestra un error externo asociado al campo', () => {
    render(
      <Stepper
        label="Cantidad"
        value={null}
        onChange={() => {}}
        step={1}
        error="Escribe la cantidad"
      />,
    )
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription('Escribe la cantidad')
  })
})
