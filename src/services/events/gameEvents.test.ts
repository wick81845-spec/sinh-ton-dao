import { describe, expect, it, vi } from 'vitest'
import { GameEventBus } from './gameEvents'

describe('GameEventBus', () => {
  it('notifies listeners when a survival condition changes and supports unsubscribe', () => {
    const eventBus = new GameEventBus()
    const listener = vi.fn()
    const unsubscribe = eventBus.on('survival:condition-changed', listener)

    eventBus.emit('survival:condition-changed', { condition: 'thirsty', active: true })
    unsubscribe()
    eventBus.emit('survival:condition-changed', { condition: 'thirsty', active: false })

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ condition: 'thirsty', active: true })
  })
})
