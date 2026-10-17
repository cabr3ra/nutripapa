// Textos para lector de pantalla del drag-and-drop de comidas (spec 008), en
// español y con nombres legibles ("tostadas con aceite", "martes, desayuno").
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'
import { MEAL_SLOTS, type MealEntryWithFood } from '../../weekly-sheets/api'
import { dayName } from '../../weekly-sheets/week'
import { parseDropId } from './ids'

/** Devuelve el nombre legible de un id de arrastre o de destino. */
export type LabelFor = (id: string | number) => string

/** Instrucciones que se leen al llegar con el teclado a una comida arrastrable. */
export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    // Con teclado, Intro/Espacio abren el panel de la comida (008 T006): el
    // movimiento sin ratón se hace con «Mover a…», no con el arrastre.
    'Para mover esta comida con el teclado, pulsa Intro para abrir su panel y usa «Mover a…». ' +
    'Con el ratón o el dedo, arrástrala (en el móvil, mantenla pulsada) y suéltala en otra celda.',
}

/** Anuncios de cada fase del arrastre, a partir de un resolutor de etiquetas. */
export function buildAnnouncements(labelFor: LabelFor): Announcements {
  return {
    onDragStart({ active }) {
      return `Has cogido ${labelFor(active.id)}.`
    },
    onDragOver({ active, over }) {
      if (over === null) return `Llevas ${labelFor(active.id)} fuera de la tabla.`
      if (over.id === active.id) return `Llevas ${labelFor(active.id)} en su sitio.`
      return `Llevas ${labelFor(active.id)} sobre ${labelFor(over.id)}.`
    },
    onDragEnd({ active, over }) {
      if (over === null || over.id === active.id) {
        return `Has soltado ${labelFor(active.id)}. Se queda donde estaba.`
      }
      return `Has soltado ${labelFor(active.id)} en ${labelFor(over.id)}.`
    },
    onDragCancel({ active }) {
      return `Has cancelado el movimiento. ${capitalize(labelFor(active.id))} vuelve a su sitio.`
    },
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

const SLOT_LABELS = new Map<string, string>(
  MEAL_SLOTS.map(({ slot, label }) => [slot, label.toLocaleLowerCase('es')]),
)

/**
 * Resolutor de etiquetas para las comidas de una tabla:
 * comida → su nombre; celda → "martes, desayuno"; día de la tira → "martes".
 * Un id desconocido se describe como "esta comida" o "este sitio".
 */
export function buildLabelFor(meals: readonly MealEntryWithFood[]): LabelFor {
  const names = new Map(meals.map((e) => [e.id, e.food_name]))
  return (id) => {
    const parsed = parseDropId(id)
    if (parsed === null) return 'este sitio'
    if (parsed.kind === 'entry') return names.get(parsed.entryId) || 'esta comida'
    if (parsed.kind === 'strip-day') return dayName(parsed.day)
    return `${dayName(parsed.day)}, ${SLOT_LABELS.get(parsed.slot) ?? parsed.slot}`
  }
}
