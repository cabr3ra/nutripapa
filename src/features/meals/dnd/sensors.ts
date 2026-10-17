// Sensores del drag-and-drop de comidas (spec 008).
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type PointerSensorOptions,
  type TouchSensorOptions,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Ratón (y lápiz): el arrastre empieza al moverse 5 px, para que un clic normal
 * siga abriendo el panel de la comida.
 */
export const POINTER_OPTIONS: PointerSensorOptions = {
  activationConstraint: { distance: 5 },
}

/**
 * Táctil: hay que mantener pulsado 250 ms sin moverse más de 5 px. Así deslizar
 * el dedo sigue haciendo scroll normal y solo la pulsación larga coge la comida
 * (requisitos de 008). Los arrastrables llevan `touch-action: manipulation`.
 */
export const TOUCH_OPTIONS: TouchSensorOptions = {
  activationConstraint: { delay: 250, tolerance: 5 },
}

/**
 * PointerSensor que ignora los toques. En Chrome/Edge un dedo también genera
 * eventos de puntero: sin este filtro, el PointerSensor (5 px) se adelantaría a
 * la pulsación larga del TouchSensor y deslizar para hacer scroll cogería la comida.
 */
export class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: (
        { nativeEvent: event }: ReactPointerEvent,
        { onActivation }: PointerSensorOptions,
      ): boolean => {
        if (event.pointerType === 'touch') return false
        // Mismo criterio que el PointerSensor original: solo el botón principal.
        if (!event.isPrimary || event.button !== 0) return false
        onActivation?.({ event })
        return true
      },
    },
  ]
}

/**
 * Sensores del contexto de comidas: ratón (5 px), táctil (pulsación larga de
 * 250 ms con 5 px de tolerancia) y teclado (espacio o Intro para coger y soltar,
 * flechas para moverse entre comidas ordenables, Escape para cancelar).
 */
export function useMealDndSensors() {
  return useSensors(
    useSensor(MousePointerSensor, POINTER_OPTIONS),
    useSensor(TouchSensor, TOUCH_OPTIONS),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}
