import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  WEEK_ONE_START,
  addDays,
  dayName,
  dayOfWeek,
  dayShortLetter,
  daysBetween,
  isMonday,
  mondayOf,
  mondayOfWeekNumber,
  todayIso,
  weekDays,
  weekNumber,
  weekRangeLabel,
  weekShortLabel,
  weekTitle,
} from './week'

// Zona con cambio de hora (25-oct-2026) para que los tests de horario signifiquen algo.
// Se fija antes de crear ningún Date; Node aplica el cambio de TZ en caliente.
vi.stubEnv('TZ', 'Europe/Madrid')

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('entorno', () => {
  it('la zona Europe/Madrid está activa (el desfase cambia el 25-oct)', () => {
    const before = new Date(2026, 9, 24, 12).getTimezoneOffset()
    const after = new Date(2026, 9, 26, 12).getTimezoneOffset()
    expect(before).toBe(-120)
    expect(after).toBe(-60)
  })
})

describe('weekNumber / weekTitle', () => {
  it('del 19 al 25-oct-2026 es la semana 1', () => {
    for (let i = 0; i < 7; i++) {
      expect(weekNumber(addDays(WEEK_ONE_START, i))).toBe(1)
    }
    expect(weekTitle('2026-10-19')).toBe('Semana 1')
  })

  it('el 26-oct-2026 empieza la semana 2', () => {
    expect(weekNumber('2026-10-26')).toBe(2)
    expect(weekTitle('2026-10-26')).toBe('Semana 2')
  })

  it('las semanas anteriores dan 0 o negativo y sin título', () => {
    expect(weekNumber('2026-10-12')).toBe(0)
    expect(weekTitle('2026-10-12')).toBe('')
    expect(weekNumber('2026-10-05')).toBe(-1)
  })

  it('mondayOfWeekNumber es el inverso', () => {
    expect(mondayOfWeekNumber(1)).toBe('2026-10-19')
    expect(mondayOfWeekNumber(2)).toBe('2026-10-26')
    expect(mondayOfWeekNumber(0)).toBe('2026-10-12')
    expect(weekNumber(mondayOfWeekNumber(53))).toBe(53)
  })
})

describe('mondayOf / isMonday / dayOfWeek', () => {
  it('el domingo del cambio de hora pertenece a la semana del 19', () => {
    expect(mondayOf('2026-10-25')).toBe('2026-10-19')
    expect(mondayOf('2026-10-26')).toBe('2026-10-26')
    expect(mondayOf('2026-10-21')).toBe('2026-10-19')
  })

  it('cruza años', () => {
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
  })

  it('isMonday', () => {
    expect(isMonday('2026-10-19')).toBe(true)
    expect(isMonday('2026-10-25')).toBe(false)
  })

  it('dayOfWeek con lunes = 1 y domingo = 7', () => {
    expect(dayOfWeek('2026-10-19')).toBe(1)
    expect(dayOfWeek('2026-10-21')).toBe(3)
    expect(dayOfWeek('2026-10-25')).toBe(7)
  })
})

describe('addDays / daysBetween / weekDays', () => {
  it('cruza el cambio de hora sin desfases', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-10-26', -2)).toBe('2026-10-24')
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29')
    expect(daysBetween('2026-10-19', '2026-11-02')).toBe(14)
  })

  it('cruza fin de año y años bisiestos', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('weekDays devuelve lunes a domingo', () => {
    expect(weekDays('2026-10-19')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(() => weekDays('2026-10-20')).toThrow(/lunes/)
  })
})

describe('todayIso', () => {
  it('usa la fecha local del navegador', () => {
    expect(todayIso(new Date(2026, 9, 25, 2, 30))).toBe('2026-10-25')
    expect(todayIso(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05')
    // 23:30 UTC del 18-oct ya es 19-oct en Madrid
    expect(todayIso(new Date(Date.UTC(2026, 9, 18, 23, 30)))).toBe('2026-10-19')
  })
})

describe('etiquetas', () => {
  it('weekRangeLabel en el mismo mes', () => {
    expect(weekRangeLabel('2026-10-19')).toBe('del 19 al 25 de octubre de 2026')
  })

  it('weekRangeLabel cruzando de mes', () => {
    expect(weekRangeLabel('2026-10-26')).toBe('del 26 de octubre al 1 de noviembre de 2026')
  })

  it('weekRangeLabel cruzando de año', () => {
    expect(weekRangeLabel('2026-12-28')).toBe('del 28 de diciembre de 2026 al 3 de enero de 2027')
  })

  it('weekShortLabel', () => {
    expect(weekShortLabel('2026-10-19')).toBe('19–25 oct')
    expect(weekShortLabel('2026-10-26')).toBe('26 oct–1 nov')
    expect(weekShortLabel('2026-12-28')).toBe('28 dic–3 ene')
  })

  it('letras y nombres de los días', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(dayShortLetter).join(' ')).toBe('L M X J V S D')
    expect(dayName(1)).toBe('lunes')
    expect(dayName(3)).toBe('miércoles')
    expect(dayName(7)).toBe('domingo')
    expect(() => dayName(0)).toThrow()
  })
})

describe('validación', () => {
  it('rechaza fechas mal formadas o inexistentes', () => {
    expect(() => addDays('2026-10-1', 1)).toThrow(/Fecha no válida/)
    expect(() => mondayOf('19/10/2026')).toThrow(/Fecha no válida/)
    expect(() => weekNumber('2026-02-30')).toThrow(/no existe/)
    expect(() => addDays('2026-10-19', 1.5)).toThrow()
  })
})
