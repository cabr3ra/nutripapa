import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock encadenable del query builder de supabase-js: cada llamada a from()
// crea un builder que registra sus métodos y resuelve (await, single o
// maybeSingle) con la siguiente respuesta de la cola.
type Result = { data: unknown; error: { message: string } | null }
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
  MEAL_SLOTS,
  type WeeklySheet,
  __resetForTests,
  createSheet,
  duplicateSheet,
  getOrCreateCurrentSheet,
  getSheet,
  groupSheetsByWeek,
  isOnlySheetOfWeek,
  listSheets,
  restoreSheet,
  softDeleteSheet,
  updateMenuNumber,
} from './api'

function respond(...results: Result[]) {
  mocks.state.queue.push(...results)
}

function ok(data: unknown): Result {
  return { data, error: null }
}

function sheet(overrides: Partial<WeeklySheet> = {}): WeeklySheet {
  return {
    id: 's1',
    owner_id: 'u1',
    start_date: '2026-10-19',
    menu_number: null,
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
  __resetForTests()
})

describe('MEAL_SLOTS', () => {
  it('lista los 5 momentos en orden con etiqueta española', () => {
    expect(MEAL_SLOTS.map((m) => m.slot)).toEqual([
      'breakfast',
      'mid_morning',
      'lunch',
      'afternoon_snack',
      'dinner',
    ])
    expect(MEAL_SLOTS.map((m) => m.label)).toEqual([
      'Desayuno',
      'Media mañana',
      'Comida',
      'Media tarde',
      'Cena',
    ])
  })
})

describe('getOrCreateCurrentSheet', () => {
  it('devuelve la tabla existente del lunes de esa semana', async () => {
    const existing = sheet()
    respond(ok([existing]))

    // Jueves 22-oct → lunes 19-oct
    await expect(getOrCreateCurrentSheet('2026-10-22')).resolves.toEqual(existing)

    expect(mocks.state.queries).toHaveLength(1)
    expect(calls(0)).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'eq', args: ['start_date', '2026-10-19'] },
      { method: 'is', args: ['deleted_at', null] },
      { method: 'order', args: ['created_at', { ascending: false }] },
      { method: 'limit', args: [1] },
    ])
  })

  it('crea una tabla vacía si no hay ninguna esa semana', async () => {
    const created = sheet({ id: 'new' })
    respond(ok([]), ok(created))

    await expect(getOrCreateCurrentSheet('2026-10-25')).resolves.toEqual(created)

    expect(mocks.state.queries).toHaveLength(2)
    expect(calls(1)[0]).toEqual({ method: 'insert', args: [{ start_date: '2026-10-19' }] })
  })

  it('dos llamadas simultáneas comparten la misma promesa: un solo insert', async () => {
    respond(ok([]), ok(sheet({ id: 'new' })))

    const a = getOrCreateCurrentSheet('2026-10-20')
    const b = getOrCreateCurrentSheet('2026-10-21')
    expect(b).toBe(a)
    await Promise.all([a, b])

    const inserts = mocks.state.queries.filter((q) => q.calls.some((c) => c.method === 'insert'))
    expect(inserts).toHaveLength(1)

    // Al terminar se limpia: una llamada nueva vuelve a consultar
    respond(ok([sheet({ id: 'new' })]))
    await getOrCreateCurrentSheet('2026-10-20')
    expect(mocks.state.queries).toHaveLength(3)
  })

  it('lanza un error en español y permite reintentar', async () => {
    respond({ data: null, error: { message: 'boom' } })
    await expect(getOrCreateCurrentSheet('2026-10-19')).rejects.toThrow(
      'No se ha podido cargar la tabla de esta semana: boom',
    )
    respond(ok([sheet()]))
    await expect(getOrCreateCurrentSheet('2026-10-19')).resolves.toEqual(sheet())
  })
})

describe('getSheet', () => {
  it('devuelve null si la tabla no existe o está borrada', async () => {
    respond(ok(null))
    await expect(getSheet('nope')).resolves.toBeNull()
    expect(mocks.state.queries).toHaveLength(1)
  })

  it('mapea food_name y ordena por día, momento real y posición', async () => {
    respond(
      ok(sheet()),
      ok([
        // Orden alfabético de la BD: afternoon_snack antes que breakfast
        {
          id: 'm2',
          day_of_week: 1,
          meal_slot: 'afternoon_snack',
          quantity: null,
          unit: null,
          position: 0,
          food_id: 'f2',
          foods: { name: 'Yogur' },
        },
        {
          id: 'm1',
          day_of_week: 1,
          meal_slot: 'breakfast',
          quantity: 2,
          unit: 'unidades',
          position: 0,
          food_id: 'f1',
          foods: { name: 'Tostada' },
        },
      ]),
      ok([{ id: 'd1', sheet_id: 's1', day_of_week: 1, steps: 8000 }]),
    )

    const detail = await getSheet('s1')

    expect(detail?.sheet).toEqual(sheet())
    expect(detail?.meals).toEqual([
      {
        id: 'm1',
        day_of_week: 1,
        meal_slot: 'breakfast',
        quantity: 2,
        unit: 'unidades',
        position: 0,
        food_id: 'f1',
        food_name: 'Tostada',
      },
      {
        id: 'm2',
        day_of_week: 1,
        meal_slot: 'afternoon_snack',
        quantity: null,
        unit: null,
        position: 0,
        food_id: 'f2',
        food_name: 'Yogur',
      },
    ])
    expect(detail?.dailyLogs).toHaveLength(1)

    const meals = mocks.state.queries.find((q) => q.table === 'meal_entries')!
    expect(meals.calls).toContainEqual({
      method: 'select',
      args: ['id, day_of_week, meal_slot, quantity, unit, position, food_id, foods(name)'],
    })
    expect(meals.calls).toContainEqual({ method: 'eq', args: ['sheet_id', 's1'] })
    expect(meals.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
    const logs = mocks.state.queries.find((q) => q.table === 'daily_logs')!
    expect(logs.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
  })
})

describe('listSheets', () => {
  it('filtra borradas y ordena por start_date y created_at desc', async () => {
    respond(ok([sheet()]))
    await expect(listSheets()).resolves.toEqual([sheet()])
    expect(calls(0)).toEqual([
      { method: 'select', args: ['*'] },
      { method: 'is', args: ['deleted_at', null] },
      { method: 'order', args: ['start_date', { ascending: false }] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ])
  })
})

describe('updateMenuNumber', () => {
  it.each([0, -1, 1.5, Number.NaN])('rechaza %s sin llamar a Supabase', async (value) => {
    await expect(updateMenuNumber('s1', value)).rejects.toThrow('entero mayor que 0')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each([3, null])('guarda %s', async (value) => {
    respond(ok(null))
    await updateMenuNumber('s1', value)
    expect(calls(0)).toContainEqual({ method: 'update', args: [{ menu_number: value }] })
    expect(calls(0)).toContainEqual({ method: 'eq', args: ['id', 's1'] })
  })
})

describe('createSheet', () => {
  it('rechaza una fecha que no es lunes', async () => {
    await expect(createSheet('2026-10-20')).rejects.toThrow('lunes')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('inserta la tabla del lunes', async () => {
    respond(ok(sheet({ start_date: '2026-10-26' })))
    await expect(createSheet('2026-10-26')).resolves.toMatchObject({ start_date: '2026-10-26' })
    expect(calls(0)[0]).toEqual({ method: 'insert', args: [{ start_date: '2026-10-26' }] })
  })
})

describe('duplicateSheet', () => {
  it('llama a la RPC con los parámetros exactos y devuelve el id nuevo', async () => {
    mocks.rpc.mockResolvedValue(ok('new-id'))
    await expect(duplicateSheet('s1', '2026-10-26')).resolves.toBe('new-id')
    expect(mocks.rpc).toHaveBeenCalledWith('duplicate_weekly_sheet', {
      source_id: 's1',
      target_start: '2026-10-26',
    })
  })

  it('lanza si la RPC falla', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    await expect(duplicateSheet('s1', '2026-10-26')).rejects.toThrow(
      'No se ha podido duplicar la tabla',
    )
  })
})

describe('softDeleteSheet', () => {
  it('bloquea la única tabla de su semana', async () => {
    respond(ok({ id: 's1', start_date: '2026-10-19' }), ok([{ id: 's1' }]))
    await expect(softDeleteSheet('s1')).rejects.toThrow('Es la única tabla de esta semana')
    expect(mocks.state.queries).toHaveLength(2)
    expect(mocks.state.queries.some((q) => q.calls.some((c) => c.method === 'update'))).toBe(false)
  })

  it('marca deleted_at si hay otra tabla esa semana', async () => {
    respond(ok({ id: 's1', start_date: '2026-10-19' }), ok([{ id: 's1' }, { id: 's2' }]), ok(null))
    await softDeleteSheet('s1')
    const update = calls(2).find((c) => c.method === 'update')!
    const payload = update.args[0] as { deleted_at: string }
    expect(Number.isNaN(Date.parse(payload.deleted_at))).toBe(false)
    expect(calls(2)).toContainEqual({ method: 'eq', args: ['id', 's1'] })
    expect(calls(1)).toContainEqual({ method: 'eq', args: ['start_date', '2026-10-19'] })
    expect(calls(1)).toContainEqual({ method: 'is', args: ['deleted_at', null] })
  })
})

describe('restoreSheet', () => {
  it('pone deleted_at a null', async () => {
    respond(ok(null))
    await restoreSheet('s1')
    expect(calls(0)).toEqual([
      { method: 'update', args: [{ deleted_at: null }] },
      { method: 'eq', args: ['id', 's1'] },
    ])
  })
})

describe('groupSheetsByWeek / isOnlySheetOfWeek', () => {
  const a = sheet({ id: 'a', start_date: '2026-10-19', created_at: '2026-10-16T10:00:00Z' })
  const b = sheet({ id: 'b', start_date: '2026-10-26', created_at: '2026-10-17T10:00:00Z' })
  const c = sheet({ id: 'c', start_date: '2026-10-19', created_at: '2026-10-18T10:00:00Z' })

  it('agrupa por lunes, semanas y tablas de más reciente a más antigua', () => {
    expect(groupSheetsByWeek([a, b, c])).toEqual([
      { monday: '2026-10-26', sheets: [b] },
      { monday: '2026-10-19', sheets: [c, a] },
    ])
    expect(groupSheetsByWeek([])).toEqual([])
  })

  it('detecta la única tabla de su semana', () => {
    expect(isOnlySheetOfWeek(b, [a, b, c])).toBe(true)
    expect(isOnlySheetOfWeek(a, [a, b, c])).toBe(false)
    expect(isOnlySheetOfWeek(a, [a, b, { ...c, deleted_at: '2026-10-18T11:00:00Z' }])).toBe(true)
  })
})
