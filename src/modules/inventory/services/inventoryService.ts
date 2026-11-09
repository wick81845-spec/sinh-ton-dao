import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { survivalConfig } from '../../survival/data/survivalConfig'
import { getSurvivalConditions } from '../../survival/utils/survivalCalculator'
import type { GameSnapshot, InventorySlot, ItemContainer, ItemId } from '../../../shared/types/game'

export type ItemContainerUpdate =
  | { ok: true; container: ItemContainer }
  | { ok: false; message: string }

export type TransferResult =
  | { ok: true; source: ItemContainer; destination: ItemContainer }
  | { ok: false; message: string }

export type UseItemResult =
  | { ok: true; state: GameSnapshot; message: string; itemId: ItemId }
  | { ok: false; message: string }

export function addItems(container: ItemContainer, itemId: ItemId, quantity: number): ItemContainerUpdate {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, message: 'Số lượng phải là số nguyên lớn hơn 0.' }
  }

  const definition = itemDefinitions[itemId]
  const slots = container.slots.map((slot) => ({ ...slot }))
  let remaining = quantity

  for (const slot of slots) {
    if (slot.itemId !== itemId || slot.quantity >= definition.maxStack) continue
    const added = Math.min(definition.maxStack - slot.quantity, remaining)
    slot.quantity += added
    remaining -= added
    if (remaining === 0) break
  }

  while (remaining > 0 && slots.length < container.maxSlots) {
    const added = Math.min(definition.maxStack, remaining)
    slots.push({ itemId, quantity: added })
    remaining -= added
  }

  if (remaining > 0) {
    return { ok: false, message: 'Không đủ ô trống trong vật chứa.' }
  }

  return { ok: true, container: { ...container, slots } }
}

export function removeItems(container: ItemContainer, itemId: ItemId, quantity: number): ItemContainerUpdate {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, message: 'Số lượng phải là số nguyên lớn hơn 0.' }
  }

  const totalQuantity = container.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((total, slot) => total + slot.quantity, 0)
  if (totalQuantity < quantity) {
    return { ok: false, message: 'Không đủ vật phẩm trong vật chứa.' }
  }

  let remaining = quantity
  const slots: InventorySlot[] = []
  for (const slot of container.slots) {
    if (slot.itemId !== itemId || remaining === 0) {
      slots.push({ ...slot })
      continue
    }

    const removed = Math.min(slot.quantity, remaining)
    remaining -= removed
    if (slot.quantity > removed) {
      slots.push({ ...slot, quantity: slot.quantity - removed })
    }
  }

  return { ok: true, container: { ...container, slots } }
}

export function transferItems(
  source: ItemContainer,
  destination: ItemContainer,
  itemId: ItemId,
  quantity: number,
): TransferResult {
  const reducedSource = removeItems(source, itemId, quantity)
  if (!reducedSource.ok) return reducedSource

  const expandedDestination = addItems(destination, itemId, quantity)
  if (!expandedDestination.ok) return expandedDestination

  return {
    ok: true,
    source: reducedSource.container,
    destination: expandedDestination.container,
  }
}

export function consumeItem(state: GameSnapshot, itemId: ItemId): UseItemResult {
  if (state.character.status !== 'alive') {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi sử dụng vật phẩm.' }
  }
  const definition = itemDefinitions[itemId]
  const hungerRestore = definition.hungerRestore ?? 0
  const thirstRestore = definition.thirstRestore ?? 0
  if (!definition.usable || (hungerRestore <= 0 && thirstRestore <= 0)) {
    return { ok: false, message: 'Vật phẩm này chưa thể sử dụng.' }
  }
  const canRestoreHunger = hungerRestore > 0 && state.survival.hunger < survivalConfig.hunger.max
  const canRestoreThirst = thirstRestore > 0 && state.survival.thirst < survivalConfig.thirst.max
  if (!canRestoreHunger && !canRestoreThirst) {
    if (thirstRestore > 0 && hungerRestore === 0) {
      return { ok: false, message: 'Bạn hiện không khát.' }
    }
    return { ok: false, message: 'Bạn hiện không đói.' }
  }

  const updatedInventory = removeItems(state.inventory, itemId, 1)
  if (!updatedInventory.ok) return updatedInventory

  const hunger = Math.min(survivalConfig.hunger.max, state.survival.hunger + hungerRestore)
  const thirst = Math.min(survivalConfig.thirst.max, state.survival.thirst + thirstRestore)
  const survival = {
    ...state.survival,
    hunger,
    thirst,
    conditions: getSurvivalConditions({ ...state.survival, hunger, thirst }),
  }
  const restoredHunger = hunger - state.survival.hunger
  const restoredThirst = thirst - state.survival.thirst
  const restorationMessage = [
    restoredHunger > 0 ? `No bụng +${restoredHunger}.` : '',
    restoredThirst > 0 ? `Nước +${restoredThirst}.` : '',
  ].filter(Boolean).join(' ')

  return {
    ok: true,
    state: { ...state, inventory: updatedInventory.container, survival },
    itemId,
    message: `Đã dùng ${definition.name}. ${restorationMessage}`,
  }
}
