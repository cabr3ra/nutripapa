// Detección de colisiones del drag-and-drop de comidas (spec 008).
import { closestCenter, pointerWithin, type CollisionDetection } from '@dnd-kit/core'

/**
 * Con ratón o dedo manda el puntero (`pointerWithin`): las celdas son
 * rectángulos contiguos y los botones de la tira L–D son pequeños, así que
 * "lo que hay bajo el dedo" es el destino que el padre espera; `closestCenter`
 * elegiría a veces la celda vecina o un día de la tira cercano sin tocarlo. Si el
 * puntero está a la vez sobre una comida y su celda, gana la comida (insertar
 * antes de ella). Fuera de cualquier zona no hay destino: soltar no mueve nada.
 *
 * Con teclado no hay coordenadas de puntero y `pointerWithin` no encontraría
 * nada: se usa `closestCenter`, que es lo que espera `sortableKeyboardCoordinates`.
 */
export const mealCollisionDetection: CollisionDetection = (args) => {
  if (args.pointerCoordinates === null) return closestCenter(args)
  const hits = pointerWithin(args)
  const entries = hits.filter((hit) => String(hit.id).startsWith('entry:'))
  return entries.length > 0 ? entries : hits
}
