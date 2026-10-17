import { describe, expect, it } from 'vitest'
import { isListedUnit, stepForUnit, UNITS } from './units'

describe('units', () => {
  it('ofrece la lista corta en orden', () => {
    expect(UNITS).toEqual(['unidad', 'rebanada', 'taza', 'cucharada', 'vaso', 'g', 'ml', 'ración'])
  })

  it('stepForUnit: 10 para g y ml, 1 para el resto', () => {
    expect(stepForUnit('g')).toBe(10)
    expect(stepForUnit('ml')).toBe(10)
    expect(stepForUnit(' ML ')).toBe(10)
    expect(stepForUnit('unidad')).toBe(1)
    expect(stepForUnit('taza')).toBe(1)
    expect(stepForUnit('pizca')).toBe(1)
    expect(stepForUnit(null)).toBe(1)
    expect(stepForUnit(undefined)).toBe(1)
  })

  it('isListedUnit distingue las unidades de la lista', () => {
    expect(isListedUnit('ración')).toBe(true)
    expect(isListedUnit('pizca')).toBe(false)
    expect(isListedUnit(null)).toBe(false)
  })
})
