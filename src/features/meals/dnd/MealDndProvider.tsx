// Contexto de drag-and-drop de las comidas de una tabla (spec 008): sensores,
// colisiones, anuncios en español y traducción de "soltar" a un movimiento.
import { useMemo, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import type { MealEntryWithFood } from '../../weekly-sheets/api'
import type { MoveTarget } from '../api'
import { buildAnnouncements, screenReaderInstructions, type LabelFor } from './announcements'
import { mealCollisionDetection } from './collision'
import { parseDropId } from './ids'
import { resolveDrop, type DndMealEntry } from './resolveDrop'
import { useMealDndSensors } from './sensors'
import './MealDndProvider.css'

type Props = {
  /** Todas las comidas de la tabla. */
  meals: readonly DndMealEntry[]
  /** Nombre legible de cada id (comida, celda o día de la tira) para los anuncios. */
  labelFor: LabelFor
  /** Se llama al soltar en un destino válido que cambia algo. */
  onMove: (entry: MealEntryWithFood, target: MoveTarget, cellEntries: MealEntryWithFood[]) => void
  children: ReactNode
}

export function MealDndProvider({ meals, labelFor, onMove, children }: Props) {
  const sensors = useMealDndSensors()
  const announcements = useMemo(() => buildAnnouncements(labelFor), [labelFor])
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  /** Comida viva a la que corresponde un id de arrastre. */
  function entryFor(id: UniqueIdentifier): DndMealEntry | undefined {
    const parsed = parseDropId(id)
    if (parsed?.kind !== 'entry') return undefined
    return meals.find((e) => e.id === parsed.entryId && !e.deleted_at)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    const entry = entryFor(active.id)
    if (entry === undefined || over === null) return
    const drop = resolveDrop({ activeEntry: entry, overId: over.id, meals })
    if (drop !== null) onMove(entry, drop.target, drop.cellEntries)
  }

  const activeEntry = activeId === null ? undefined : entryFor(activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={mealCollisionDetection}
      accessibility={{ announcements, screenReaderInstructions }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {children}
      <DragOverlay>
        {activeEntry !== undefined ? (
          <div className="meal-dnd-overlay">{activeEntry.food_name}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
