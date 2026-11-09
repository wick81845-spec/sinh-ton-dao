import type { ItemId, ItemQuantity } from '../../shared/types/game'

export type GameEventMap = {
  'inventory:item-used': { itemId: ItemId; quantity: number }
  'survival:stat-changed': { stat: string; value: number }
  'survival:condition-changed': { condition: string; active: boolean }
  'gathering:completed': { activityId: string; itemId: ItemId; quantity: number; rewards: ItemQuantity[] }
  'crafting:completed': { jobId: string; recipeId: string; itemId: ItemId; quantity: number }
  'technology:researched': { technologyId: string }
  'character:died': { characterId: string }
  'building:completed': { buildingId: string }
  'exploration:completed': { taskId: string; eventId: string | null }
  'ship:completed': { shipId: string; definitionId: string }
  'combat:completed': { encounterId: string; outcome: 'victory' | 'defeat' | 'retreated' }
  'voyage:arrived': { voyageId: string; locationId: string }
}

type EventListener<T> = (payload: T) => void

export class GameEventBus {
  private listeners = new Map<keyof GameEventMap, Set<EventListener<unknown>>>()

  on<K extends keyof GameEventMap>(event: K, listener: EventListener<GameEventMap[K]>): () => void {
    const listeners = this.listeners.get(event) ?? new Set<EventListener<unknown>>()
    listeners.add(listener as EventListener<unknown>)
    this.listeners.set(event, listeners)

    return () => {
      listeners.delete(listener as EventListener<unknown>)
      if (listeners.size === 0) this.listeners.delete(event)
    }
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload))
  }
}

export const gameEventBus = new GameEventBus()
