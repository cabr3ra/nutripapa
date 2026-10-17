import { describe, expect, it } from 'vitest'
import {
  STEPS_WARN_ABOVE,
  WATER_MAX,
  WATER_STEP,
  WATER_WARN_ABOVE,
  formatStepsInput,
  parseSteps,
  validateWater,
  warningsFor,
} from './parse'

const ENTERO = { error: 'Escribe un número entero de pasos' }
const NUMERO = { error: 'Escribe un número' }

describe('constantes', () => {
  it('tienen los valores del diseño', () => {
    expect(WATER_STEP).toBe(0.25)
    expect(WATER_MAX).toBe(99.99)
    expect(WATER_WARN_ABOVE).toBe(10)
    expect(STEPS_WARN_ABOVE).toBe(100_000)
  })
})

describe('parseSteps', () => {
  it('vacío o solo espacios → sin dato', () => {
    expect(parseSteps('')).toEqual({ value: null })
    expect(parseSteps('   ')).toEqual({ value: null })
  })

  it('acepta enteros con y sin separador de miles es-ES', () => {
    expect(parseSteps('8500')).toEqual({ value: 8500 })
    expect(parseSteps('8.500')).toEqual({ value: 8500 })
    expect(parseSteps('8 500')).toEqual({ value: 8500 })
    expect(parseSteps('8\u00a0500')).toEqual({ value: 8500 })
    expect(parseSteps(' 12.345.678 ')).toEqual({ value: 12345678 })
    expect(parseSteps('0')).toEqual({ value: 0 })
  })

  it('decimales o negativos → error de entero', () => {
    expect(parseSteps('8,5')).toEqual(ENTERO)
    expect(parseSteps('8.5')).toEqual(ENTERO)
    expect(parseSteps('8.500,5')).toEqual(ENTERO)
    expect(parseSteps('-200')).toEqual(ENTERO)
    expect(parseSteps('-8.500')).toEqual(ENTERO)
  })

  it('no numérico → error de número', () => {
    expect(parseSteps('abc')).toEqual(NUMERO)
    expect(parseSteps('8500 pasos')).toEqual(NUMERO)
    expect(parseSteps('1e5')).toEqual(NUMERO)
  })

  it('rechaza valores que no caben en la columna', () => {
    expect(parseSteps('3000000000')).toEqual({ error: 'Ese número de pasos es demasiado grande' })
  })
})

describe('formatStepsInput', () => {
  it('formatea con separador de miles', () => {
    expect(formatStepsInput(8500)).toBe('8.500')
    expect(formatStepsInput(120000)).toBe('120.000')
    expect(formatStepsInput(0)).toBe('0')
  })

  it('null → vacío', () => {
    expect(formatStepsInput(null)).toBe('')
  })

  it('lo formateado se vuelve a leer igual', () => {
    expect(parseSteps(formatStepsInput(8500))).toEqual({ value: 8500 })
  })
})

describe('warningsFor', () => {
  const base = { water_liters: 1.5, pee_count: 4, poop_count: 1, steps: 8500 }
  const AGUA = 'Más de 10 litros es mucho: revisa que esté bien apuntado.'
  const PASOS = 'Más de 100.000 pasos es mucho: revisa que esté bien apuntado.'

  it('sin avisos para valores normales, vacíos o en el límite', () => {
    expect(warningsFor(base)).toEqual([])
    expect(
      warningsFor({ water_liters: null, pee_count: null, poop_count: null, steps: null }),
    ).toEqual([])
    expect(warningsFor({ ...base, water_liters: 10, steps: 100_000 })).toEqual([])
  })

  it('avisa del agua', () => {
    expect(warningsFor({ ...base, water_liters: 10.25 })).toEqual([AGUA])
  })

  it('avisa de los pasos', () => {
    expect(warningsFor({ ...base, steps: 100_001 })).toEqual([PASOS])
  })

  it('avisa de ambos', () => {
    expect(warningsFor({ ...base, water_liters: 12, steps: 150_000 })).toEqual([AGUA, PASOS])
  })
})

describe('validateWater', () => {
  const ERROR = 'El agua tiene que estar entre 0 y 99,99 L'

  it('null y los límites son válidos', () => {
    expect(validateWater(null)).toBeNull()
    expect(validateWater(0)).toBeNull()
    expect(validateWater(1.5)).toBeNull()
    expect(validateWater(99.99)).toBeNull()
  })

  it('fuera de rango → error', () => {
    expect(validateWater(-0.25)).toBe(ERROR)
    expect(validateWater(100)).toBe(ERROR)
    expect(validateWater(Number.NaN)).toBe(ERROR)
  })
})
