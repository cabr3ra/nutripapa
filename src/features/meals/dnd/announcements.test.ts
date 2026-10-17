import { describe, expect, it } from 'vitest'
import type { Active, Over } from '@dnd-kit/core'
import type { MealEntryWithFood } from '../../weekly-sheets/api'
import { buildAnnouncements, buildLabelFor, screenReaderInstructions } from './announcements'
import { cellDropId, entryDragId, stripDayDropId } from './ids'

const tostadas: MealEntryWithFood = {
  id: 't1',
  day_of_week: 2,
  meal_slot: 'breakfast',
  quantity: null,
  unit: null,
  position: 0,
  food_id: 'f1',
  food_name: 'tostadas con aceite',
}

const labelFor = buildLabelFor([tostadas])
const announcements = buildAnnouncements(labelFor)

// Solo se usa el id en los anuncios: basta con objetos mínimos.
const active = { id: entryDragId('t1') } as Active
const over = (id: string) => ({ id }) as Over

describe('buildLabelFor', () => {
  it('da nombres legibles en español', () => {
    expect(labelFor(entryDragId('t1'))).toBe('tostadas con aceite')
    expect(labelFor(cellDropId(2, 'breakfast'))).toBe('martes, desayuno')
    expect(labelFor(cellDropId(3, 'afternoon_snack'))).toBe('miércoles, media tarde')
    expect(labelFor(stripDayDropId(7))).toBe('domingo')
    expect(labelFor(entryDragId('desconocida'))).toBe('esta comida')
    expect(labelFor('otra-cosa')).toBe('este sitio')
  })
})

describe('anuncios', () => {
  it('al coger', () => {
    expect(announcements.onDragStart({ active })).toBe('Has cogido tostadas con aceite.')
  })

  it('al pasar por encima', () => {
    expect(announcements.onDragOver({ active, over: over(cellDropId(3, 'lunch')) })).toBe(
      'Llevas tostadas con aceite sobre miércoles, comida.',
    )
    expect(announcements.onDragOver({ active, over: null })).toBe(
      'Llevas tostadas con aceite fuera de la tabla.',
    )
    expect(announcements.onDragOver({ active, over: over(entryDragId('t1')) })).toBe(
      'Llevas tostadas con aceite en su sitio.',
    )
  })

  it('al soltar', () => {
    expect(announcements.onDragEnd({ active, over: over(stripDayDropId(4)) })).toBe(
      'Has soltado tostadas con aceite en jueves.',
    )
    expect(announcements.onDragEnd({ active, over: null })).toBe(
      'Has soltado tostadas con aceite. Se queda donde estaba.',
    )
  })

  it('al cancelar', () => {
    expect(announcements.onDragCancel({ active, over: null })).toBe(
      'Has cancelado el movimiento. Tostadas con aceite vuelve a su sitio.',
    )
  })

  it('las instrucciones están en español y mencionan la alternativa sin arrastre', () => {
    // Con teclado no se arrastra: Intro abre el panel y se usa «Mover a…» (008 T006)
    expect(screenReaderInstructions.draggable).toMatch(/pulsa Intro para abrir su panel/)
    expect(screenReaderInstructions.draggable).toMatch(/Mover a…/)
    expect(screenReaderInstructions.draggable).not.toMatch(/para cogerla/)
  })
})
