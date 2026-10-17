import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock encadenable del query builder de supabase-js (mismo enfoque que en
// weekly-sheets): cada llamada a from() crea un builder que registra sus
// métodos y resuelve (await, single o maybeSingle) con la siguiente respuesta
// de la cola.
type Result = { data: unknown; error: { message: string; code?: string } | null }
type Call = { method: string; args: unknown[] }
type Query = { table: string; calls: Call[] }

const mocks = vi.hoisted(() => {
  const state = {
    queue: [] as Result[],
    queries: [] as Query[],
  }
  const CHAIN = ['select', 'insert', 'update', 'eq', 'is', 'order', 'limit'] as const
  const TERMINAL = ['single', 'maybeSingle'] as const

  function next(): Result {
    const result = state.queue.shift()
    if (!result) throw new Error('Mock: no quedan respuestas en la cola')
    return result
  }

  function from(table: string) {
    const query: Query = { table, calls: [] }
    state.queries.push(query)
    let result: Result | undefined
    const take = () => (result ??= next())
    const builder: Record<string, unknown> = {}
    for (const method of CHAIN) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args })
        return builder
      }
    }
    for (const method of TERMINAL) {
      builder[method] = (...args: unknown[]) => {
        query.calls.push({ method, args })
        return Promise.resolve(take())
      }
    }
    builder.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve().then(take).then(resolve, reject)
    return builder
  }

  return { state, from: vi.fn(from), rpc: vi.fn() }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

import {
  type Food,
  getFoodUsage,
  listFoods,
  renameFood,
  resolveFoodForName,
  restoreEntry,
  saveMealEntry,
  setFavorite,
  softDeleteEntry,
  topFoodsForSlot,
} from './api'
import { prepareCatalog } from './normalize'

function respond(...results: Result[]) {
  mocks.state.queue.push(...results)
}

function ok(data: unknown): Result {
  return { data, error: null }
}

function fail(message: string, code?: string): Result {
  return { data: null, error: { message, code } }
}

function food(overrides: Partial<Food> = {}): Food {
  return {
    id: 'f1',
    owner_id: 'u1',
    name: 'Tostada',
    default_quantity: null,
    default_unit: null,
    is_favorite: false,
    created_at: '2026-10-16T10:00:00Z',
    updated_at: '2026-10-16T10:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

function calls(i: number) {
  return mocks.state.queries[i].calls
}

beforeEach(() => {
  mocks.state.queue.length = 0
  mocks.state.queries.length = 0
  mocks.from.mockClear()
  mocks.rpc.mockReset()
})

describe('listFoods', () => {
  it('filtra las borradas y ordena por nombre', async () => {
    respond(ok([food()]))
    await expect(listFoods()).resolves.toEqual([food()])
    expect(mocks.state.queries[0].table).toBe('foods')
    expect(calls(0)).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'is', args: ['deleted_at', null] },
      { method: 'order', args: ['name'] },
    ])
  })

  it('propaga el error en español', async () => {
    respond(fail('boom'))
    await expect(listFoods()).rejects.toThrow('No se ha podido cargar tus comidas: boom')
  })
})

describe('getFoodUsage / topFoodsForSlot', () => {
  it('cuenta en el cliente las veces por comida y momento', async () => {
    respond(
      ok([
        { food_id: 'f1', meal_slot: 'breakfast' },
        { food_id: 'f1', meal_slot: 'breakfast' },
        { food_id: 'f1', meal_slot: 'dinner' },
        { food_id: 'f2', meal_slot: 'breakfast' },
      ]),
    )
    const usage = await getFoodUsage()
    expect(usage.get('f1')).toEqual({ breakfast: 2, dinner: 1 })
    expect(usage.get('f2')).toEqual({ breakfast: 1 })
    expect(usage.has('f3')).toBe(false)
    expect(mocks.state.queries[0].table).toBe('meal_entries')
    expect(calls(0)).toEqual([
      { method: 'select', args: ['food_id, meal_slot'] },
      { method: 'is', args: ['deleted_at', null] },
    ])
  })

  it('propaga el error', async () => {
    respond(fail('x'))
    await expect(getFoodUsage()).rejects.toThrow('No se ha podido cargar las comidas que más tomas')
  })

  it('ordena por veces desc y luego por nombre, sin las no usadas, con límite', () => {
    const foods = [
      food({ id: 'a', name: 'Zumo' }),
      food({ id: 'b', name: 'Café' }),
      food({ id: 'c', name: 'Avena' }),
      food({ id: 'd', name: 'Pan' }),
      food({ id: 'e', name: 'Nunca' }),
    ]
    const usage = new Map([
      ['a', { breakfast: 3 }],
      ['b', { breakfast: 1, lunch: 5 }],
      ['c', { breakfast: 1 }],
      ['d', { dinner: 2 }],
    ])
    expect(topFoodsForSlot(usage, foods, 'breakfast').map((f) => f.id)).toEqual(['a', 'c', 'b'])
    expect(topFoodsForSlot(usage, foods, 'breakfast', 2).map((f) => f.id)).toEqual(['a', 'c'])
    expect(topFoodsForSlot(usage, foods, 'lunch').map((f) => f.id)).toEqual(['b'])
    expect(topFoodsForSlot(usage, foods, 'mid_morning')).toEqual([])
  })

  it('devuelve como mucho 6 por defecto', () => {
    const foods = Array.from({ length: 8 }, (_, i) => food({ id: `f${i}`, name: `Comida ${i}` }))
    const usage = new Map(foods.map((f) => [f.id, { dinner: 1 }]))
    expect(topFoodsForSlot(usage, foods, 'dinner')).toHaveLength(6)
  })
})

describe('resolveFoodForName', () => {
  const catalog = prepareCatalog([food({ id: 'p', name: 'Plátano' }), food({ id: 't' })])

  it('reutiliza la comida con el mismo nombre normalizado', () => {
    expect(resolveFoodForName(catalog, 'platano')).toEqual({ foodId: 'p' })
    expect(resolveFoodForName(catalog, '  PLÁTANO ')).toEqual({ foodId: 'p' })
  })

  it('si no existe, devuelve el nombre recortado para crearla', () => {
    expect(resolveFoodForName(catalog, '  Kiwi  ')).toEqual({ foodName: 'Kiwi' })
  })
})

describe('saveMealEntry', () => {
  const base = { sheetId: 's1', dayOfWeek: 2, mealSlot: 'lunch' as const }

  it('entrada nueva con comida nueva: parámetros exactos', async () => {
    mocks.rpc.mockResolvedValue(ok('e-new'))
    await expect(
      saveMealEntry({ ...base, foodName: 'Lentejas', quantity: 1, unit: 'plato' }),
    ).resolves.toBe('e-new')
    expect(mocks.rpc).toHaveBeenCalledWith('save_meal_entry', {
      p_entry_id: null,
      p_sheet_id: 's1',
      p_day_of_week: 2,
      p_meal_slot: 'lunch',
      p_food_id: null,
      p_food_name: 'Lentejas',
      p_quantity: 1,
      p_unit: 'plato',
    })
  })

  it('edición con comida del catálogo y sin cantidad', async () => {
    mocks.rpc.mockResolvedValue(ok('e1'))
    await expect(
      saveMealEntry({ ...base, entryId: 'e1', foodId: 'f1', quantity: null, unit: null }),
    ).resolves.toBe('e1')
    expect(mocks.rpc).toHaveBeenCalledWith('save_meal_entry', {
      p_entry_id: 'e1',
      p_sheet_id: 's1',
      p_day_of_week: 2,
      p_meal_slot: 'lunch',
      p_food_id: 'f1',
      p_food_name: null,
      p_quantity: null,
      p_unit: null,
    })
  })

  it.each([
    ['ninguna', {}],
    ['las dos', { foodId: 'f1', foodName: 'Pan' }],
    ['nombre vacío', { foodName: '   ' }],
  ])('rechaza %s sin llamar a Supabase', async (_label, food) => {
    await expect(saveMealEntry({ ...base, ...food, quantity: null, unit: null })).rejects.toThrow(
      'Indica una comida',
    )
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('propaga el error de la RPC', async () => {
    mocks.rpc.mockResolvedValue(fail('No se encuentra la tabla semanal.'))
    await expect(
      saveMealEntry({ ...base, foodId: 'f1', quantity: null, unit: null }),
    ).rejects.toThrow('No se ha podido guardar la comida: No se encuentra la tabla semanal.')
  })
})

describe('softDeleteEntry / restoreEntry', () => {
  it('marca deleted_at con una fecha ISO', async () => {
    respond(ok(null))
    await softDeleteEntry('e1')
    expect(mocks.state.queries[0].table).toBe('meal_entries')
    const update = calls(0).find((c) => c.method === 'update')!
    const payload = update.args[0] as { deleted_at: string }
    expect(Number.isNaN(Date.parse(payload.deleted_at))).toBe(false)
    expect(calls(0)).toContainEqual({ method: 'eq', args: ['id', 'e1'] })
  })

  it('recupera poniendo deleted_at a null', async () => {
    respond(ok(null))
    await restoreEntry('e1')
    expect(calls(0)).toEqual([
      { method: 'update', args: [{ deleted_at: null }] },
      { method: 'eq', args: ['id', 'e1'] },
    ])
  })

  it('propaga los errores', async () => {
    respond(fail('a'), fail('b'))
    await expect(softDeleteEntry('e1')).rejects.toThrow('No se ha podido quitar la comida: a')
    await expect(restoreEntry('e1')).rejects.toThrow('No se ha podido recuperar la comida: b')
  })
})

describe('setFavorite', () => {
  it.each([true, false])('guarda is_favorite = %s', async (value) => {
    respond(ok(null))
    await setFavorite('f1', value)
    expect(mocks.state.queries[0].table).toBe('foods')
    expect(calls(0)).toContainEqual({ method: 'update', args: [{ is_favorite: value }] })
    expect(calls(0)).toContainEqual({ method: 'eq', args: ['id', 'f1'] })
  })

  it('propaga el error', async () => {
    respond(fail('x'))
    await expect(setFavorite('f1', true)).rejects.toThrow('No se ha podido guardar la favorita')
  })
})

describe('renameFood', () => {
  it('guarda el nombre recortado', async () => {
    respond(ok(null))
    await renameFood('f1', '  Pan integral ')
    expect(calls(0)).toContainEqual({ method: 'update', args: [{ name: 'Pan integral' }] })
    expect(calls(0)).toContainEqual({ method: 'eq', args: ['id', 'f1'] })
  })

  it('rechaza un nombre vacío sin llamar a Supabase', async () => {
    await expect(renameFood('f1', '   ')).rejects.toThrow('Escribe un nombre')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('traduce el choque de nombre (23505)', async () => {
    respond(fail('duplicate key value violates unique constraint', '23505'))
    await expect(renameFood('f1', 'Pan')).rejects.toThrow('Ya tienes una comida con ese nombre')
  })

  it('propaga otros errores', async () => {
    respond(fail('boom', '42501'))
    await expect(renameFood('f1', 'Pan')).rejects.toThrow(
      'No se ha podido cambiar el nombre de la comida: boom',
    )
  })
})
