import { addItems, removeItems } from './inventoryService'
import type { GameSnapshot, ItemId } from '../../../shared/types/game'

export type SalvageContainerItemId = Extract<
  ItemId,
  'item_sunken_crate' | 'item_metal_box' | 'item_small_chest'
>

interface SalvageReward {
  itemId: ItemId
  weight: number
  minQuantity: number
  maxQuantity: number
}

const salvageRewards: Record<SalvageContainerItemId, readonly SalvageReward[]> = {
  item_sunken_crate: [
    { itemId: 'item_dried_fruit', weight: 4, minQuantity: 1, maxQuantity: 3 },
    { itemId: 'item_rope', weight: 3, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_wood', weight: 4, minQuantity: 2, maxQuantity: 5 },
    { itemId: 'item_wood_plank', weight: 2, minQuantity: 1, maxQuantity: 3 },
    { itemId: 'item_dried_fish', weight: 3, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_stone', weight: 3, minQuantity: 2, maxQuantity: 4 },
  ],
  item_metal_box: [
    { itemId: 'item_iron_ore', weight: 4, minQuantity: 1, maxQuantity: 3 },
    { itemId: 'item_copper_ore', weight: 4, minQuantity: 1, maxQuantity: 3 },
    { itemId: 'item_iron_ingot', weight: 2, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_copper_ingot', weight: 2, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_ship_parts', weight: 3, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_ship_cable', weight: 2, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_wreckage_material', weight: 1, minQuantity: 1, maxQuantity: 1 },
  ],
  item_small_chest: [
    { itemId: 'item_wreckage_material', weight: 3, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_ship_bell', weight: 2, minQuantity: 1, maxQuantity: 1 },
    { itemId: 'item_ship_parts', weight: 3, minQuantity: 1, maxQuantity: 2 },
    { itemId: 'item_steel_ingot', weight: 1, minQuantity: 1, maxQuantity: 1 },
    { itemId: 'item_ship_cable', weight: 2, minQuantity: 1, maxQuantity: 2 },
  ],
}

export type OpenSalvageContainerResult =
  | { ok: true; state: GameSnapshot; reward: { itemId: ItemId; quantity: number } }
  | { ok: false; message: string }

export function openSalvageContainer(
  state: GameSnapshot,
  containerId: SalvageContainerItemId,
  now = Date.now(),
  random = Math.random,
): OpenSalvageContainerResult {
  if (state.character.status !== 'alive') {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi mở vật phẩm trục vớt.' }
  }

  const removed = removeItems(state.inventory, containerId, 1)
  if (!removed.ok) return removed

  const rewards = salvageRewards[containerId]
  const totalWeight = rewards.reduce((total, reward) => total + reward.weight, 0)
  const rewardRoll = random()
  if (!Number.isFinite(rewardRoll) || rewardRoll < 0 || rewardRoll >= 1) {
    return { ok: false, message: 'Không thể xác định phần thưởng lúc này.' }
  }
  let selectedReward = rewards[0]
  let remainingWeight = rewardRoll * totalWeight
  for (const reward of rewards) {
    remainingWeight -= reward.weight
    if (remainingWeight < 0) {
      selectedReward = reward
      break
    }
  }

  const quantityRoll = random()
  if (!Number.isFinite(quantityRoll) || quantityRoll < 0 || quantityRoll >= 1) {
    return { ok: false, message: 'Không thể xác định số lượng phần thưởng lúc này.' }
  }
  const quantity = selectedReward.minQuantity
    + Math.floor(quantityRoll * (selectedReward.maxQuantity - selectedReward.minQuantity + 1))
  const added = addItems(removed.container, selectedReward.itemId, quantity, now)
  if (!added.ok) return added

  return {
    ok: true,
    state: { ...state, inventory: added.container },
    reward: { itemId: selectedReward.itemId, quantity },
  }
}
