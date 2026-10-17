import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock encadenable del query builder de supabase-js (mismo enfoque que en
// weekly-sheets y meals): cada llamada a from() crea un builder que registra
// sus métodos y resuelve (await, single o maybeSingle) con la siguiente
// respuesta de la cola.
type Result = { data: unknown; error: { message: string; code?: string } | null }
type Call = { method: string; args: unknown[] }
type Query = { table: string; calls: Call[] }

const mocks = vi.hoisted(() => {
  const state = {
    queue: [] as Result[],
    queries: [] as Query[],
  }
  const CHAIN = ['select', 'insert', 'update', 'upsert', 'eq', 'is', 'order', 'limit'] as const
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

  return { state, from: vi.fn(from) }
})

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mocks.from },
}))

import { type DailyLog, type DailyLogValues, saveDailyLog } from './api'

function respond(...results: Result[]) {
  mocks.state.queue.push(...results)
}

function log(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: 'd1',
    owner_id: 'u1',
    sheet_id: 's1',
    day_of_week: 2,
    water_liters: 1.5,
    pee_count: 5,
    poop_count: 1,
    steps: 8500,
    created_at: '2026-10-17T10:00:00Z',
    updated_at: '2026-10-17T10:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

const VALUES: DailyLogValues = { water_liters: 1.5, pee_count: 5, poop_count: 1, steps: 8500 }
const EMPTY: DailyLogValues = { water_liters: null, pee_count: null, poop_count: null, steps: null }

beforeEach(() => {
  mocks.state.queue.length = 0
  mocks.state.queries.length = 0
  mocks.from.mockClear()
})

describe('saveDailyLog', () => {
  it('hace upsert por (sheet_id, day_of_week) con deleted_at null y devuelve la fila', async () => {
    const row = log()
    respond({ data: row, error: null })

    await expect(saveDailyLog('s1', 2, VALUES)).resolves.toEqual(row)

    expect(mocks.state.queries).toHaveLength(1)
    const [query] = mocks.state.queries
    expect(query.table).toBe('daily_logs')
    expect(query.calls).toEqual([
      {
        method: 'upsert',
        args: [
          {
            sheet_id: 's1',
            day_of_week: 2,
            water_liters: 1.5,
            pee_count: 5,
            poop_count: 1,
            steps: 8500,
            deleted_at: null,
          },
          { onConflict: 'sheet_id,day_of_week' },
        ],
      },
      { method: 'select', args: [] },
      { method: 'single', args: [] },
    ])
  })

  it('no envía owner_id (lo pone la BD)', async () => {
    respond({ data: log(), error: null })
    await saveDailyLog('s1', 2, VALUES)
    const payload = mocks.state.queries[0].calls[0].args[0] as Record<string, unknown>
    expect(payload).not.toHaveProperty('owner_id')
  })

  it('permite valores null (no apuntado) y 0', async () => {
    respond({ data: log(), error: null }, { data: log(), error: null })

    await saveDailyLog('s1', 1, EMPTY)
    await saveDailyLog('s1', 7, { water_liters: 0, pee_count: 0, poop_count: 0, steps: 0 })

    const first = mocks.state.queries[0].calls[0].args[0]
    expect(first).toMatchObject({ day_of_week: 1, ...EMPTY, deleted_at: null })
    const second = mocks.state.queries[1].calls[0].args[0]
    expect(second).toMatchObject({ day_of_week: 7, water_liters: 0, steps: 0 })
  })

  it('acepta el máximo de agua (99,99 L)', async () => {
    respond({ data: log(), error: null })
    await expect(saveDailyLog('s1', 3, { ...EMPTY, water_liters: 99.99 })).resolves.toBeDefined()
  })

  it.each([0, 8, 1.5, Number.NaN])('rechaza el día %s sin llamar a Supabase', async (day) => {
    await expect(saveDailyLog('s1', day, VALUES)).rejects.toThrow(/entre el lunes/)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it.each<[string, Partial<DailyLogValues>, RegExp]>([
    ['agua negativa', { water_liters: -0.25 }, /agua no puede ser negativa/],
    ['agua no finita', { water_liters: Number.POSITIVE_INFINITY }, /agua no puede ser negativa/],
    ['agua > 99,99', { water_liters: 100 }, /99,99 litros/],
    ['pis negativo', { pee_count: -1 }, /pis tienen que ser un número entero/],
    ['caca negativa', { poop_count: -1 }, /caca tienen que ser un número entero/],
    ['pasos negativos', { steps: -10 }, /pasos tienen que ser un número entero/],
    ['pis decimal', { pee_count: 1.5 }, /pis/],
    ['caca decimal', { poop_count: 0.5 }, /caca/],
    ['pasos decimales', { steps: 8500.5 }, /pasos/],
  ])('rechaza %s sin llamar a Supabase', async (_label, change, message) => {
    await expect(saveDailyLog('s1', 2, { ...VALUES, ...change })).rejects.toThrow(message)
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('propaga el error de Supabase con mensaje en español', async () => {
    respond({ data: null, error: { message: 'permission denied', code: '42501' } })
    await expect(saveDailyLog('s1', 2, VALUES)).rejects.toThrow(
      'No se ha podido guardar el seguimiento del día: permission denied',
    )
  })
})
