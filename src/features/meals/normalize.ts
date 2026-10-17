// Búsqueda de comidas sin tildes ni mayúsculas (spec 007).
// Funciones puras, sin dependencias: el catálogo de un solo usuario es pequeño,
// se carga entero y se precalcula el nombre normalizado una vez en memoria.

/**
 * Normaliza un nombre para comparar y buscar: descompone (NFD), quita los
 * diacríticos, pasa a minúsculas, recorta y colapsa los espacios.
 *
 * Decisión: la "ñ" se descompone en "n" + tilde y queda como "n". Para buscar
 * es aceptable (y cómodo en teclados sin ñ): "pina" encontrará "piña". Como
 * contrapartida, "pina" y "piña" cuentan como el mismo nombre al evitar duplicados.
 */
export function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Comida del catálogo con su nombre normalizado ya calculado. */
export type SearchableFood<T> = T & { normalized: string }

/** Precalcula `normalized` para cada comida (hacerlo una vez al cargar el catálogo). */
export function prepareCatalog<T extends { name: string }>(
  foods: readonly T[],
): SearchableFood<T>[] {
  return foods.map((food) => ({ ...food, normalized: normalizeName(food.name) }))
}

/**
 * Puntuación de una coincidencia (menor = mejor):
 * 0 = el nombre empieza por la búsqueda, 1 = alguna palabra empieza por ella,
 * 2 = la contiene en cualquier sitio. `null` si no coincide.
 */
function matchScore(normalized: string, query: string): number | null {
  if (normalized.startsWith(query)) return 0
  if (normalized.includes(` ${query}`)) return 1
  if (normalized.includes(query)) return 2
  return null
}

/**
 * Busca comidas cuyo nombre coincide con `query` (sin tildes ni mayúsculas).
 * Orden: empieza por > palabra que empieza por > contiene; a igualdad, por
 * nombre en orden alfabético español. Devuelve como mucho `limit` resultados.
 */
export function searchFoods<T extends { name: string }>(
  catalog: readonly SearchableFood<T>[],
  query: string,
  limit = 8,
): SearchableFood<T>[] {
  const q = normalizeName(query)
  if (q === '' || limit <= 0) return []

  const scored: { food: SearchableFood<T>; score: number }[] = []
  for (const food of catalog) {
    const score = matchScore(food.normalized, q)
    if (score !== null) scored.push({ food, score })
  }

  scored.sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name, 'es'))
  return scored.slice(0, limit).map((item) => item.food)
}

/**
 * Devuelve la comida cuyo nombre normalizado es igual al de `name`, o `undefined`.
 * Sirve para no crear duplicados: "platano" reutiliza "Plátano".
 */
export function findExactMatch<T extends { name: string }>(
  catalog: readonly SearchableFood<T>[],
  name: string,
): SearchableFood<T> | undefined {
  const target = normalizeName(name)
  if (target === '') return undefined
  return catalog.find((food) => food.normalized === target)
}
