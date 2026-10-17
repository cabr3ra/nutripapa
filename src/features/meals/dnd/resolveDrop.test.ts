import { describe, expect, it } from 'vitest'
import type { MealEntryWithFood, MealSlot } from '../../weekly-sheets/api'
import { cellDropId, entryDragId, stripDayDropId } from './ids'
import { resolveDrop, type DndMealEntry } from './resolveDrop'

function entry(
  id: string,
  day: number,
  slot: MealSlot,
  position: number,
  extra: Partial<DndMealEntry> = {},
): DndMealEntry {
  return {
    id,
    day_of_week: day,
    meal_slot: slot,
    position,
    quantity: null,
    unit: null,
    food_id: `food-${id}`,
    food_name: `comida ${id}`,
    ...extra,
  }
}

// Martes·desayuno: tostadas, café, fruta. Miércoles·comida: lentejas, ensalada.
const tostadas = entry('tostadas', 2, 'breakfast', 0)
const cafe = entry('cafe', 2, 'breakfast', 1024)
const fruta = entry('fruta', 2, 'breakfast', 2048)
const lentejas = entry('lentejas', 3, 'lunch', 1024)
const ensalada = entry('ensalada', 3, 'lunch', 0)
const meals: DndMealEntry[] = [fruta, tostadas, cafe, lentejas, ensalada]

const ids = (list: MealEntryWithFood[]) => list.map((e) => e.id)

describe('resolveDrop', () => {
  it('sobre una celda vacía: al final de esa celda, sin vecinas', () => {
    const drop = resolveDrop({ activeEntry: tostadas, overId: cellDropId(4, 'dinner'), meals })
    expect(drop).toEqual({ target: { day: 4, slot: 'dinner' }, cellEntries: [] })
  })

  it('sobre una celda con comidas: al final, con sus entradas ordenadas por posición', () => {
    const drop = resolveDrop({ activeEntry: tostadas, overId: cellDropId(3, 'lunch'), meals })
    expect(drop?.target).toEqual({ day: 3, slot: 'lunch' })
    expect(ids(drop!.cellEntries)).toEqual(['ensalada', 'lentejas'])
  })

  it('sobre otra comida de otra celda: antes de ella, en su celda', () => {
    const drop = resolveDrop({ activeEntry: tostadas, overId: entryDragId('lentejas'), meals })
    expect(drop?.target).toEqual({ day: 3, slot: 'lunch', beforeId: 'lentejas' })
    expect(ids(drop!.cellEntries)).toEqual(['ensalada', 'lentejas'])
  })

  it('dentro de la misma celda, subiendo: antes de la comida de destino (sin la activa)', () => {
    const drop = resolveDrop({ activeEntry: fruta, overId: entryDragId('tostadas'), meals })
    expect(drop?.target).toEqual({ day: 2, slot: 'breakfast', beforeId: 'tostadas' })
    expect(ids(drop!.cellEntries)).toEqual(['tostadas', 'cafe'])
  })

  it('dentro de la misma celda, bajando: justo después de la comida de destino', () => {
    const toMiddle = resolveDrop({ activeEntry: tostadas, overId: entryDragId('cafe'), meals })
    expect(toMiddle?.target).toEqual({ day: 2, slot: 'breakfast', beforeId: 'fruta' })

    const toEnd = resolveDrop({ activeEntry: tostadas, overId: entryDragId('fruta'), meals })
    expect(toEnd?.target).toEqual({ day: 2, slot: 'breakfast' })
    expect(ids(toEnd!.cellEntries)).toEqual(['cafe', 'fruta'])
  })

  it('sobre sí misma → null', () => {
    expect(resolveDrop({ activeEntry: cafe, overId: entryDragId('cafe'), meals })).toBeNull()
  })

  it('sin cambios (última comida soltada en su propia celda) → null', () => {
    expect(
      resolveDrop({ activeEntry: fruta, overId: cellDropId(2, 'breakfast'), meals }),
    ).toBeNull()
  })

  it('soltar la primera en su celda la lleva al final', () => {
    const drop = resolveDrop({ activeEntry: tostadas, overId: cellDropId(2, 'breakfast'), meals })
    expect(drop?.target).toEqual({ day: 2, slot: 'breakfast' })
    expect(ids(drop!.cellEntries)).toEqual(['cafe', 'fruta'])
  })

  it('sobre un día de la tira: mismo momento, al final de ese día', () => {
    const extra = entry('yogur', 5, 'breakfast', 512)
    const drop = resolveDrop({
      activeEntry: cafe,
      overId: stripDayDropId(5),
      meals: [...meals, extra],
    })
    expect(drop?.target).toEqual({ day: 5, slot: 'breakfast' })
    expect(ids(drop!.cellEntries)).toEqual(['yogur'])
  })

  it('sobre el día de la tira en el que ya está: sin cambios si es la última', () => {
    expect(resolveDrop({ activeEntry: fruta, overId: stripDayDropId(2), meals })).toBeNull()
  })

  it('ignora las comidas borradas en la celda destino', () => {
    const borrada = entry('borrada', 3, 'lunch', 4096, { deleted_at: '2026-10-17T10:00:00Z' })
    const drop = resolveDrop({
      activeEntry: tostadas,
      overId: cellDropId(3, 'lunch'),
      meals: [...meals, borrada],
    })
    expect(ids(drop!.cellEntries)).toEqual(['ensalada', 'lentejas'])
  })

  it('soltar sobre una comida borrada → null', () => {
    const borrada = entry('borrada', 3, 'lunch', 4096, { deleted_at: '2026-10-17T10:00:00Z' })
    expect(
      resolveDrop({
        activeEntry: tostadas,
        overId: entryDragId('borrada'),
        meals: [...meals, borrada],
      }),
    ).toBeNull()
  })

  it.each(['entry:no-existe', 'cell:9:lunch', 'otra-cosa'])(
    'destino no válido (%s) → null',
    (overId) => {
      expect(resolveDrop({ activeEntry: tostadas, overId, meals })).toBeNull()
    },
  )
})
