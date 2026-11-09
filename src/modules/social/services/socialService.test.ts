import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { addFriend, getVisitAvailability, proposeTrade, resolveTrade, visitPlayerIsland } from './socialService'

describe('socialService', () => {
  it('enforces visit permissions and records friend access', () => {
    expect(getVisitAvailability(initialGameState, 'player_mina')).toBe('Đảo này chỉ đón bạn bè. Hãy kết bạn trước.')
    const friend = addFriend(initialGameState, 'player_mina')
    if (!friend.ok) throw new Error(friend.message)
    expect(getVisitAvailability(friend.state, 'player_mina')).toBeNull()
    const visit = visitPlayerIsland(friend.state, 'player_mina')
    if (!visit.ok) throw new Error(visit.message)

    expect(visit.state.character.currentLocationId).toBe('island_003')
    expect(visit.state.discoveredIslandIds).toContain('island_003')
  })

  it('does not transfer trade items until explicit mock-player confirmation', () => {
    const friend = addFriend(initialGameState, 'player_sora')
    if (!friend.ok) throw new Error(friend.message)
    const visit = visitPlayerIsland(friend.state, 'player_sora')
    if (!visit.ok) throw new Error(visit.message)
    const offer = proposeTrade(visit.state, 'player_sora', 'item_wood', 2, 'item_wild_fruit', 1, 10_000)
    if (!offer.ok) throw new Error(offer.message)

    expect(offer.state.inventory.slots).toEqual(initialGameState.inventory.slots)
    expect(offer.state.socialPlayerInventories[0].slots).toEqual(initialGameState.socialPlayerInventories[0].slots)

    const result = resolveTrade(offer.state, offer.state.tradeOffers[0].id, true, 11_000)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wood', quantity: 10 })
    expect(result.state.inventory.slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 6 })
    expect(result.state.socialPlayerInventories[0].slots).toContainEqual({ itemId: 'item_wood', quantity: 8 })
    expect(result.state.socialPlayerInventories[0].slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 3 })
    expect(result.state.tradeOffers[0]).toMatchObject({ status: 'accepted', resolvedAt: 11_000 })
  })

  it('leaves inventory untouched when the other side declines', () => {
    const friend = addFriend(initialGameState, 'player_sora')
    if (!friend.ok) throw new Error(friend.message)
    const visit = visitPlayerIsland(friend.state, 'player_sora')
    if (!visit.ok) throw new Error(visit.message)
    const offer = proposeTrade(visit.state, 'player_sora', 'item_wood', 1, 'item_stone', 1, 10_000)
    if (!offer.ok) throw new Error(offer.message)
    const result = resolveTrade(offer.state, offer.state.tradeOffers[0].id, false, 11_000)
    if (!result.ok) throw new Error(result.message)

    expect(result.state.inventory).toEqual(offer.state.inventory)
    expect(result.state.tradeOffers[0].status).toBe('declined')
  })

  it('prevents legendary fish from being offered in player trades', () => {
    const friend = addFriend(initialGameState, 'player_sora')
    if (!friend.ok) throw new Error(friend.message)
    const visit = visitPlayerIsland(friend.state, 'player_sora')
    if (!visit.ok) throw new Error(visit.message)

    expect(proposeTrade(
      visit.state, 'player_sora', 'item_leviathan', 1, 'item_wild_fruit', 1, 10_000,
    )).toEqual({ ok: false, message: 'Vật phẩm này chỉ dành cho sưu tầm, không thể giao dịch.' })
  })
})
