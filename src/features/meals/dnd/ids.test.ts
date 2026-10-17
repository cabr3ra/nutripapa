import { describe, expect, it } from 'vitest'
import { cellDropId, entryDragId, parseDropId, stripDayDropId } from './ids'

describe('ids de arrastre', () => {
  it('codifica y decodifica una comida', () => {
    expect(entryDragId('abc-1')).toBe('entry:abc-1')
    expect(parseDropId('entry:abc-1')).toEqual({ kind: 'entry', entryId: 'abc-1' })
  })

  it('codifica y decodifica una celda', () => {
    expect(cellDropId(2, 'breakfast')).toBe('cell:2:breakfast')
    expect(parseDropId('cell:2:breakfast')).toEqual({ kind: 'cell', day: 2, slot: 'breakfast' })
    expect(parseDropId(cellDropId(7, 'afternoon_snack'))).toEqual({
      kind: 'cell',
      day: 7,
      slot: 'afternoon_snack',
    })
  })

  it('codifica y decodifica un día de la tira', () => {
    expect(stripDayDropId(3)).toBe('strip-day:3')
    expect(parseDropId('strip-day:3')).toEqual({ kind: 'strip-day', day: 3 })
  })

  it.each([
    'entry:',
    'cell:0:breakfast',
    'cell:8:lunch',
    'cell:2:brunch',
    'cell:2',
    'cell:2:lunch:extra',
    'strip-day:0',
    'strip-day:12',
    'strip-day:',
    'otra-cosa',
    '',
    42,
  ])('devuelve null para un id no válido (%s)', (id) => {
    expect(parseDropId(id)).toBeNull()
  })
})
