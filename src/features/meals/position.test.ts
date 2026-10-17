import { describe, expect, it } from 'vitest'
import {
  INT4_MAX,
  INT4_MIN,
  POSITION_STEP,
  fitsInt4,
  nextPosition,
  planMove,
  positionBetween,
  renumber,
  type MovePlan,
} from './position'

const entry = (id: string, position: number) => ({ id, position })

// Orden final de la celda según un plan de renumeración.
const orderOf = (plan: MovePlan) => {
  if (!('renumber' in plan)) throw new Error('se esperaba renumeración')
  return [...plan.renumber.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id)
}

describe('nextPosition', () => {
  it('celda vacía → 0', () => {
    expect(nextPosition([])).toBe(0)
  })
  it('máximo + STEP, también con datos antiguos 0, 1, 2', () => {
    expect(nextPosition([0, 1024, 2048])).toBe(3072)
    expect(nextPosition([2, 0, 1])).toBe(2 + POSITION_STEP)
  })
})

describe('positionBetween', () => {
  it('sin vecinas → 0', () => {
    expect(positionBetween(null, null)).toBe(0)
  })
  it('solo anterior o solo siguiente', () => {
    expect(positionBetween(2048, null)).toBe(3072)
    expect(positionBetween(null, 0)).toBe(-1024)
  })
  it('punto medio estrictamente entre ambas', () => {
    expect(positionBetween(0, 1024)).toBe(512)
    expect(positionBetween(0, 2)).toBe(1)
    expect(positionBetween(-3, -1)).toBe(-2)
  })
  it('sin hueco → null', () => {
    expect(positionBetween(0, 1)).toBeNull()
    expect(positionBetween(5, 5)).toBeNull()
  })
  it('fuera de int4 → null', () => {
    expect(positionBetween(INT4_MAX - 10, null)).toBeNull()
    expect(positionBetween(null, INT4_MIN + 10)).toBeNull()
    expect(positionBetween(INT4_MAX - 2, INT4_MAX)).toBe(INT4_MAX - 1)
  })
})

describe('renumber', () => {
  it('0, 1024, 2048… en el orden dado', () => {
    expect([...renumber(['c', 'a', 'b'])]).toEqual([
      ['c', 0],
      ['a', 1024],
      ['b', 2048],
    ])
  })
})

describe('planMove', () => {
  it('celda vacía → 0', () => {
    expect(planMove({ cellEntries: [], movingId: 'm' })).toEqual({ position: 0 })
  })

  it('al final', () => {
    const cell = [entry('a', 0), entry('b', 1024)]
    expect(planMove({ cellEntries: cell, movingId: 'm' })).toEqual({ position: 2048 })
  })

  it('beforeId desconocido → al final', () => {
    const cell = [entry('a', 0)]
    expect(planMove({ cellEntries: cell, movingId: 'm', beforeId: 'x' })).toEqual({
      position: 1024,
    })
  })

  it('al principio (posición negativa permitida)', () => {
    const cell = [entry('a', 0), entry('b', 1024)]
    expect(planMove({ cellEntries: cell, movingId: 'm', beforeId: 'a' })).toEqual({
      position: -1024,
    })
  })

  it('en medio con hueco, aunque las entradas lleguen desordenadas', () => {
    const cell = [entry('b', 1024), entry('a', 0), entry('c', 2048)]
    expect(planMove({ cellEntries: cell, movingId: 'm', beforeId: 'b' })).toEqual({
      position: 512,
    })
  })

  it('sin hueco → renumera respetando el orden e incluye la que se mueve', () => {
    const cell = [entry('a', 10), entry('b', 11), entry('c', 500)]
    const plan = planMove({ cellEntries: cell, movingId: 'm', beforeId: 'b' })
    expect(orderOf(plan)).toEqual(['a', 'm', 'b', 'c'])
    expect(plan.position).toBe(1024)
    if ('renumber' in plan) {
      expect(plan.renumber.get('m')).toBe(plan.position)
      expect([...plan.renumber.values()]).toEqual([0, 1024, 2048, 3072])
    }
  })

  it('datos antiguos 0, 1, 2: mover entre 0 y 1 renumera', () => {
    const cell = [entry('a', 0), entry('b', 1), entry('c', 2)]
    const plan = planMove({ cellEntries: cell, movingId: 'm', beforeId: 'b' })
    expect(orderOf(plan)).toEqual(['a', 'm', 'b', 'c'])
  })

  it('datos antiguos 0, 1, 2: al final no renumera', () => {
    const cell = [entry('a', 0), entry('b', 1), entry('c', 2)]
    expect(planMove({ cellEntries: cell, movingId: 'm' })).toEqual({ position: 1026 })
  })

  it('posiciones repetidas → renumera', () => {
    const cell = [entry('a', 5), entry('b', 5)]
    const plan = planMove({ cellEntries: cell, movingId: 'm', beforeId: 'b' })
    expect(orderOf(plan)).toEqual(['a', 'm', 'b'])
  })

  it('al final cerca del máximo de int4 → renumera', () => {
    const cell = [entry('a', 0), entry('b', INT4_MAX - 100)]
    const plan = planMove({ cellEntries: cell, movingId: 'm' })
    expect(orderOf(plan)).toEqual(['a', 'b', 'm'])
    expect(plan.position).toBe(2048)
  })

  it('al principio cerca del mínimo de int4 → renumera', () => {
    const cell = [entry('a', INT4_MIN + 100), entry('b', 0)]
    const plan = planMove({ cellEntries: cell, movingId: 'm', beforeId: 'a' })
    expect(orderOf(plan)).toEqual(['m', 'a', 'b'])
    expect(plan.position).toBe(0)
  })

  it('todas las posiciones resultantes caben en int4', () => {
    const cell = [entry('a', INT4_MAX - 1), entry('b', INT4_MAX)]
    const plan = planMove({ cellEntries: cell, movingId: 'm', beforeId: 'b' })
    expect('renumber' in plan).toBe(true)
    if ('renumber' in plan) expect([...plan.renumber.values()].every(fitsInt4)).toBe(true)
    expect(fitsInt4(plan.position)).toBe(true)
  })
})
