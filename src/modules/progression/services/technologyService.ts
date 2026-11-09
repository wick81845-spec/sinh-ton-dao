import { removeItems } from '../../inventory/services/inventoryService'
import type { GameSnapshot, ItemContainer, ItemId } from '../../../shared/types/game'
import { technologyDefinitions } from '../data/progressionDefinitions'
import { awardExperience } from './progressionService'

export type TechnologyActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function countItem(container: ItemContainer, itemId: ItemId): number {
  return container.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((total, slot) => total + slot.quantity, 0)
}

export function getTechnologyResearchAvailability(state: GameSnapshot, technologyId: string): string | null {
  const technology = technologyDefinitions.find((entry) => entry.id === technologyId)
  if (!technology) return 'Không tìm thấy công nghệ.'
  const researched = state.character.researchedTechnologyIds ?? []
  if (researched.includes(technology.id)) return 'Công nghệ này đã được nghiên cứu.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi nghiên cứu.'
  if (state.activeCombat) return 'Không thể nghiên cứu trong khi chiến đấu.'
  if (state.activeGathering || state.activeExploration || state.craftingQueue.length > 0) {
    return 'Hãy chờ hoạt động hiện tại hoàn tất trước khi nghiên cứu.'
  }
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể nghiên cứu khi đang trên hành trình.'
  }
  if (state.character.currentLocationId !== state.character.homeIslandId) {
    return 'Nghiên cứu chỉ khả dụng tại đảo nhà.'
  }
  if (state.character.level < technology.requiredLevel) return `Cần đạt cấp ${technology.requiredLevel}.`
  const missingPrerequisite = technology.prerequisites.find((id) => !researched.includes(id))
  if (missingPrerequisite) {
    const prerequisite = technologyDefinitions.find((entry) => entry.id === missingPrerequisite)
    return `Cần nghiên cứu ${prerequisite?.name ?? 'công nghệ tiên quyết'} trước.`
  }
  const missingCost = technology.researchCost.find((cost) => (
    countItem(state.inventory, cost.itemId) + countItem(state.storage, cost.itemId) < cost.quantity
  ))
  if (missingCost) return 'Không đủ tài nguyên trong túi đồ để nghiên cứu.'
  return null
}

export function researchTechnology(state: GameSnapshot, technologyId: string): TechnologyActionResult {
  const issue = getTechnologyResearchAvailability(state, technologyId)
  if (issue) return { ok: false, message: issue }
  const technology = technologyDefinitions.find((entry) => entry.id === technologyId)
  if (!technology) return { ok: false, message: 'Không tìm thấy công nghệ.' }

  let inventory = state.inventory
  let storage = state.storage
  for (const cost of technology.researchCost) {
    const fromInventory = Math.min(countItem(inventory, cost.itemId), cost.quantity)
    if (fromInventory > 0) {
      const result = removeItems(inventory, cost.itemId, fromInventory)
      if (!result.ok) return { ok: false, message: 'Không thể tiêu hao tài nguyên nghiên cứu.' }
      inventory = result.container
    }
    const fromStorage = cost.quantity - fromInventory
    if (fromStorage > 0) {
      const result = removeItems(storage, cost.itemId, fromStorage)
      if (!result.ok) return { ok: false, message: 'Không thể tiêu hao tài nguyên nghiên cứu.' }
      storage = result.container
    }
  }

  const character = awardExperience(state.character, technology.skillId, 20)
  const researchedTechnologyIds = [...(character.researchedTechnologyIds ?? []), technology.id]
  return {
    ok: true,
    state: {
      ...state,
      inventory,
      storage,
      character: { ...character, researchedTechnologyIds },
    },
    message: `Đã nghiên cứu ${technology.name}; nhận 20 XP chuyên môn.`,
  }
}
