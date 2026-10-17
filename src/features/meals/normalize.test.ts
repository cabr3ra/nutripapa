import { describe, expect, it } from 'vitest'
import { findExactMatch, normalizeName, prepareCatalog, searchFoods } from './normalize'

type Food = { id: string; name: string }

const food = (id: string, name: string): Food => ({ id, name })
const names = (foods: { name: string }[]) => foods.map((f) => f.name)

describe('normalizeName', () => {
  it('quita las tildes', () => {
    expect(normalizeName('Plátano')).toBe('platano')
    expect(normalizeName('café con leche')).toBe('cafe con leche')
    expect(normalizeName('Pingüino')).toBe('pinguino')
  })

  it('pasa a minúsculas', () => {
    expect(normalizeName('TOSTADAS')).toBe('tostadas')
    expect(normalizeName('ÁRBOL')).toBe('arbol')
  })

  it('recorta y colapsa espacios', () => {
    expect(normalizeName('  pan   con\ttomate  ')).toBe('pan con tomate')
    expect(normalizeName('   ')).toBe('')
  })

  it('la "ñ" queda como "n" (decisión: "pina" encuentra "piña")', () => {
    expect(normalizeName('Piña')).toBe('pina')
    expect(normalizeName('pina')).toBe(normalizeName('piña'))
  })

  it('"platano" y "Plátano" normalizan igual', () => {
    expect(normalizeName('platano')).toBe(normalizeName('Plátano'))
  })
})

describe('prepareCatalog', () => {
  it('añade el nombre normalizado y conserva el resto de campos', () => {
    const [prepared] = prepareCatalog([food('1', '  Plátano  Canario ')])
    expect(prepared).toEqual({
      id: '1',
      name: '  Plátano  Canario ',
      normalized: 'platano canario',
    })
  })
})

describe('searchFoods', () => {
  const catalog = prepareCatalog([
    food('1', 'pan con tostadas'),
    food('2', 'tostadas con aceite'),
    food('3', 'Tostadas'),
    food('4', 'pantostadas'),
    food('5', 'Plátano'),
    food('6', 'Piña'),
    food('7', 'Café con leche'),
  ])

  it('ordena: empieza por > palabra que empieza por > contiene', () => {
    expect(names(searchFoods(catalog, 'tostadas'))).toEqual([
      'Tostadas',
      'tostadas con aceite',
      'pan con tostadas',
      'pantostadas',
    ])
  })

  it('desempata por nombre en orden alfabético', () => {
    const extra = prepareCatalog([food('a', 'Tostón'), food('b', 'tostada'), food('c', 'Tomate')])
    expect(names(searchFoods(extra, 'to'))).toEqual(['Tomate', 'tostada', 'Tostón'])
  })

  it('ignora tildes y mayúsculas en la búsqueda', () => {
    expect(names(searchFoods(catalog, 'PLATANO'))).toEqual(['Plátano'])
    expect(names(searchFoods(catalog, 'plát'))).toEqual(['Plátano'])
    expect(names(searchFoods(catalog, 'cafe'))).toEqual(['Café con leche'])
  })

  it('"pina" encuentra "Piña" y viceversa', () => {
    expect(names(searchFoods(catalog, 'pina'))).toEqual(['Piña'])
    expect(names(searchFoods(prepareCatalog([food('x', 'pina colada')]), 'piña'))).toEqual([
      'pina colada',
    ])
  })

  it('admite espacios dobles en la búsqueda', () => {
    expect(names(searchFoods(catalog, '  café   con '))).toEqual(['Café con leche'])
  })

  it('una búsqueda vacía o solo con espacios no devuelve nada', () => {
    expect(searchFoods(catalog, '')).toEqual([])
    expect(searchFoods(catalog, '   ')).toEqual([])
  })

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(searchFoods(catalog, 'yogur')).toEqual([])
  })

  it('respeta el límite (8 por defecto)', () => {
    const many = prepareCatalog(Array.from({ length: 12 }, (_, i) => food(String(i), `queso ${i}`)))
    expect(searchFoods(many, 'queso')).toHaveLength(8)
    expect(searchFoods(many, 'queso', 3)).toHaveLength(3)
    expect(searchFoods(catalog, 'tostadas', 2).map((f) => f.id)).toEqual(['3', '2'])
  })
})

describe('findExactMatch', () => {
  const catalog = prepareCatalog([
    food('1', 'Plátano'),
    food('2', 'Piña'),
    food('3', 'pan con tomate'),
  ])

  it('encuentra la misma comida sin tildes, mayúsculas ni espacios de más', () => {
    expect(findExactMatch(catalog, 'platano')?.id).toBe('1')
    expect(findExactMatch(catalog, ' PLÁTANO ')?.id).toBe('1')
    expect(findExactMatch(catalog, 'pina')?.id).toBe('2')
    expect(findExactMatch(catalog, 'pan  con  tomate')?.id).toBe('3')
  })

  it('no confunde un nombre que solo empieza igual', () => {
    expect(findExactMatch(catalog, 'platano canario')).toBeUndefined()
    expect(findExactMatch(catalog, 'pan')).toBeUndefined()
  })

  it('un nombre vacío no coincide con nada', () => {
    expect(findExactMatch(catalog, '   ')).toBeUndefined()
  })
})
