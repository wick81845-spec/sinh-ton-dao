import { isAccessoryItem, itemDefinitions } from '../../../data/items/itemDefinitions'
import { survivalConfig } from '../../survival/data/survivalConfig'
import { inflictPoisoning } from '../../survival/services/ailmentService'
import { getSurvivalConditions } from '../../survival/utils/survivalCalculator'
import type {
  GameSnapshot,
  InventorySlot,
  ItemContainer,
  ItemId,
  ItemQuantity,
  SurvivalAilmentId,
} from '../../../shared/types/game'

export type ItemContainerUpdate =
  | { ok: true; container: ItemContainer }
  | { ok: false; message: string }

export type TransferResult =
  | { ok: true; source: ItemContainer; destination: ItemContainer }
  | { ok: false; message: string }

export type UseItemResult =
  | { ok: true; state: GameSnapshot; message: string; itemId: ItemId }
  | { ok: false; message: string }

export type InventoryActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export interface ItemDurabilityUse {
  state: GameSnapshot
  remaining: number
  broke: boolean
}

export interface FoodFreshnessResult {
  state: GameSnapshot
  changed: boolean
  spoiledQuantity: number
}

const baseInventoryCapacity = 12
const backpackInventoryCapacity = 24
export const carriedWeightPerSlotKg = 2.5
const freshnessBucketMs = 15 * 60 * 1000
const toolRepairCosts: Partial<Record<ItemId, readonly ItemQuantity[]>> = {
  item_wooden_axe: [
    { itemId: 'item_wood', quantity: 2 },
    { itemId: 'item_stone', quantity: 1 },
  ],
  item_wooden_spear: [
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_stone', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_stone_pickaxe: [
    { itemId: 'item_rough_stone', quantity: 2 },
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_shovel: [
    { itemId: 'item_stone', quantity: 1 },
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_fishing_spear: [
    { itemId: 'item_stone', quantity: 1 },
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_copper_axe: [
    { itemId: 'item_copper_ingot', quantity: 1 },
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_iron_axe: [
    { itemId: 'item_iron_ingot', quantity: 1 },
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_fishing_rod: [
    { itemId: 'item_branch', quantity: 1 },
    { itemId: 'item_plant_fiber', quantity: 1 },
  ],
  item_fishing_rod_2: [
    { itemId: 'item_wood', quantity: 2 },
    { itemId: 'item_plant_fiber', quantity: 1 },
  ],
  item_fishing_rod_3: [
    { itemId: 'item_wood_hard', quantity: 2 },
    { itemId: 'item_rope', quantity: 1 },
  ],
  item_fishing_rod_4: [
    { itemId: 'item_copper_ingot', quantity: 1 },
    { itemId: 'item_wood_hard', quantity: 1 },
  ],
  item_fishing_rod_5: [
    { itemId: 'item_bronze_ingot', quantity: 1 },
    { itemId: 'item_rope', quantity: 2 },
  ],
  item_fishing_rod_6: [
    { itemId: 'item_iron_ingot', quantity: 1 },
    { itemId: 'item_wood_hard', quantity: 2 },
  ],
  item_fishing_rod_7: [
    { itemId: 'item_iron_ingot', quantity: 2 },
    { itemId: 'item_bronze_ingot', quantity: 1 },
  ],
}

export function getCarriedWeight(container: ItemContainer): number {
  return container.slots.reduce(
    (total, slot) => total + itemDefinitions[slot.itemId].weight * slot.quantity,
    0,
  )
}

export function getCarriedWeightLimit(container: ItemContainer): number {
  return container.maxSlots * carriedWeightPerSlotKg
}

export function isInventoryOverloaded(container: ItemContainer): boolean {
  return getCarriedWeight(container) >= getCarriedWeightLimit(container)
}

function getExpiry(itemId: ItemId, now: number): number | undefined {
  const shelfLife = itemDefinitions[itemId].shelfLifeMs
  return shelfLife === undefined ? undefined : now + shelfLife
}

function isSameFreshnessBatch(first: number | undefined, second: number | undefined): boolean {
  if (first === undefined || second === undefined) return first === second
  return Math.floor(first / freshnessBucketMs) === Math.floor(second / freshnessBucketMs)
}

function prepareContainerFreshness(container: ItemContainer, now: number): { container: ItemContainer; changed: boolean } {
  let changed = false
  const slots = container.slots.map((slot) => {
    if (slot.expiresAt !== undefined || itemDefinitions[slot.itemId].shelfLifeMs === undefined) return slot
    changed = true
    return { ...slot, expiresAt: getExpiry(slot.itemId, now) }
  })
  return { container: changed ? { ...container, slots } : container, changed }
}

function convertExpiredFood(container: ItemContainer, now: number): { container: ItemContainer; quantity: number } {
  let quantity = 0
  const remainingSlots = container.slots.filter((slot) => {
    if (slot.expiresAt === undefined || slot.expiresAt > now) return true
    quantity += slot.quantity
    return false
  }).filter((slot) => slot.itemId !== 'item_spoiled_food')
  const existingSpoiled = container.slots
    .filter((slot) => slot.itemId === 'item_spoiled_food')
    .reduce((total, slot) => total + slot.quantity, 0)
  if (quantity === 0) return { container, quantity: 0 }

  const spoiledSlots: InventorySlot[] = []
  let spoiledRemaining = existingSpoiled + quantity
  while (spoiledRemaining > 0) {
    const stack = Math.min(itemDefinitions.item_spoiled_food.maxStack, spoiledRemaining)
    spoiledSlots.push({ itemId: 'item_spoiled_food', quantity: stack })
    spoiledRemaining -= stack
  }
  return {
    container: { ...container, slots: [...remainingSlots, ...spoiledSlots] },
    quantity,
  }
}

export function initializeFoodFreshness(state: GameSnapshot, now: number): FoodFreshnessResult {
  const inventory = prepareContainerFreshness(state.inventory, now)
  const storage = prepareContainerFreshness(state.storage, now)
  const changed = inventory.changed || storage.changed
  return {
    state: changed ? { ...state, inventory: inventory.container, storage: storage.container } : state,
    changed,
    spoiledQuantity: 0,
  }
}

export function spoilExpiredFood(state: GameSnapshot, now: number): FoodFreshnessResult {
  const inventory = convertExpiredFood(state.inventory, now)
  const storage = convertExpiredFood(state.storage, now)
  const spoiledQuantity = inventory.quantity + storage.quantity
  const changed = spoiledQuantity > 0
  return {
    state: changed ? { ...state, inventory: inventory.container, storage: storage.container } : state,
    changed,
    spoiledQuantity,
  }
}

export function degradeItemDurability(state: GameSnapshot, itemId: ItemId): ItemDurabilityUse {
  const maximum = itemDefinitions[itemId].maxDurability
  const carried = state.inventory.slots.some((slot) => slot.itemId === itemId)
    || state.equippedWeaponId === itemId
  if (!maximum || !carried) return { state, remaining: 0, broke: false }

  const remaining = Math.max(0, (state.itemDurability?.[itemId] ?? maximum) - 1)
  const itemDurability = { ...state.itemDurability }
  if (remaining === 0) delete itemDurability[itemId]
  else itemDurability[itemId] = remaining

  const inventory = remaining === 0
    && state.inventory.slots.some((slot) => slot.itemId === itemId)
      ? removeItems(state.inventory, itemId, 1)
    : null
  return {
    state: {
      ...state,
      ...(inventory?.ok ? { inventory: inventory.container } : {}),
      ...(remaining === 0 && state.equippedWeaponId === itemId ? { equippedWeaponId: undefined } : {}),
      itemDurability,
    },
    remaining,
    broke: remaining === 0,
  }
}

export function equipWeapon(state: GameSnapshot, itemId: ItemId): InventoryActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi trang bị vũ khí.' }
  if (state.activeCombat) return { ok: false, message: 'Không thể đổi vũ khí trong khi chiến đấu.' }
  if (state.equippedWeaponId === itemId) return { ok: false, message: 'Dụng cụ này đã được trang bị.' }
  if (itemDefinitions[itemId].category !== 'tool' || itemId === 'item_backpack') {
    return { ok: false, message: 'Chỉ có thể trang bị vũ khí hoặc dụng cụ vào ô này.' }
  }
  const removed = removeItems(state.inventory, itemId, 1)
  if (!removed.ok) return { ok: false, message: 'Dụng cụ không có trong hành trang.' }
  const returned = state.equippedWeaponId
    ? addItems(removed.container, state.equippedWeaponId, 1)
    : { ok: true as const, container: removed.container }
  if (!returned.ok) return { ok: false, message: 'Không thể cất dụng cụ đang trang bị vào hành trang.' }
  const maxDurability = itemDefinitions[itemId].maxDurability
  const previousName = state.equippedWeaponId
    ? itemDefinitions[state.equippedWeaponId].name
    : undefined
  return {
    ok: true,
    state: {
      ...state,
      inventory: returned.container,
      equippedWeaponId: itemId,
      ...(maxDurability
        ? {
          itemDurability: {
            ...state.itemDurability,
            [itemId]: state.itemDurability?.[itemId] ?? maxDurability,
          },
        }
        : {}),
    },
    message: previousName
      ? `Đã thay ${previousName} bằng ${itemDefinitions[itemId].name}.`
      : `Đã đưa ${itemDefinitions[itemId].name} vào ô vũ khí / dụng cụ.`,
  }
}

export function unequipWeapon(state: GameSnapshot): InventoryActionResult {
  const itemId = state.equippedWeaponId
  if (!itemId) return { ok: false, message: 'Bạn chưa trang bị vũ khí.' }
  const added = addItems(state.inventory, itemId, 1)
  if (!added.ok) return { ok: false, message: 'Hãy chừa một ô trống trong túi để cất vũ khí.' }
  return {
    ok: true,
    state: { ...state, inventory: added.container, equippedWeaponId: undefined },
    message: `Đã cất ${itemDefinitions[itemId].name} vào hành trang.`,
  }
}

export function equipAccessory(state: GameSnapshot, itemId: ItemId): InventoryActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi chọn phụ kiện.' }
  const definition = itemDefinitions[itemId]
  if (!isAccessoryItem(itemId)) return { ok: false, message: 'Chỉ có thể chọn thức ăn, nước uống hoặc vật phẩm hồi phục.' }
  if (!state.inventory.slots.some((slot) => slot.itemId === itemId)) {
    return { ok: false, message: 'Vật phẩm này không có trong hành trang.' }
  }
  if (state.equippedAccessoryId === itemId) {
    return { ok: false, message: `${definition.name} đã nằm trong ô phụ kiện.` }
  }
  return {
    ok: true,
    state: { ...state, equippedAccessoryId: itemId },
    message: `Đã chọn ${definition.name} vào ô phụ kiện.`,
  }
}

export function unequipAccessory(state: GameSnapshot): InventoryActionResult {
  if (!state.equippedAccessoryId) return { ok: false, message: 'Ô phụ kiện đang trống.' }
  return {
    ok: true,
    state: { ...state, equippedAccessoryId: undefined },
    message: `Đã bỏ ${itemDefinitions[state.equippedAccessoryId].name} khỏi ô phụ kiện.`,
  }
}

export function hasItemOrEquipped(state: GameSnapshot, itemId: ItemId): boolean {
  return state.equippedWeaponId === itemId
    || state.inventory.slots.some((slot) => slot.itemId === itemId)
}

export function repairItem(state: GameSnapshot, itemId: ItemId): InventoryActionResult {
  const maximum = itemDefinitions[itemId].maxDurability
  if (!maximum || !hasItemOrEquipped(state, itemId)) {
    return { ok: false, message: 'Không tìm thấy công cụ cần sửa.' }
  }
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi sửa công cụ.' }
  if (state.activeCombat || state.activeGathering || state.activeExploration || state.craftingQueue.length > 0) {
    return { ok: false, message: 'Hãy kết thúc hoạt động hiện tại trước khi sửa công cụ.' }
  }
  if (!state.buildings.some((building) => (
    building.definitionId === 'building_workbench'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))) return { ok: false, message: 'Cần có bàn chế tạo đã hoàn thành để sửa công cụ.' }

  const currentDurability = state.itemDurability?.[itemId] ?? maximum
  if (currentDurability >= maximum) return { ok: false, message: `${itemDefinitions[itemId].name} chưa cần sửa.` }
  const cost = toolRepairCosts[itemId]
  if (!cost) return { ok: false, message: `Chưa có vật liệu sửa ${itemDefinitions[itemId].name.toLocaleLowerCase('vi-VN')}.` }

  const missingMaterials = cost
    .filter((ingredient) => state.inventory.slots
      .filter((slot) => slot.itemId === ingredient.itemId)
      .reduce((total, slot) => total + slot.quantity, 0) < ingredient.quantity)
    .map((ingredient) => itemDefinitions[ingredient.itemId].name)
  if (missingMaterials.length > 0) {
    return { ok: false, message: `Không đủ nguyên liệu để sửa: ${missingMaterials.join(', ')}.` }
  }

  let inventory = state.inventory
  for (const ingredient of cost) {
    const removed = removeItems(inventory, ingredient.itemId, ingredient.quantity)
    if (!removed.ok) return { ok: false, message: `Không thể tiêu hao nguyên liệu sửa ${itemDefinitions[itemId].name.toLocaleLowerCase('vi-VN')}.` }
    inventory = removed.container
  }
  return {
    ok: true,
    state: {
      ...state,
      inventory,
      itemDurability: { ...state.itemDurability, [itemId]: maximum },
    },
    message: `Đã sửa ${itemDefinitions[itemId].name} lên độ bền tối đa (${maximum}).`,
  }
}

export function discardItems(state: GameSnapshot, itemId: ItemId, quantity: number): InventoryActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi quản lý hành trang.' }
  const result = removeItems(state.inventory, itemId, quantity)
  if (!result.ok) return result
  return {
    ok: true,
    state: { ...state, inventory: result.container },
    message: `Đã vứt bỏ ${quantity} ${itemDefinitions[itemId].name}.`,
  }
}

export function equipBackpack(state: GameSnapshot): InventoryActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi trang bị ba lô.' }
  if (state.backpackEquipped) return { ok: false, message: 'Ba lô đã được trang bị.' }
  const backpack = removeItems(state.inventory, 'item_backpack', 1)
  if (!backpack.ok) return { ok: false, message: 'Bạn không có ba lô trong hành trang.' }
  return {
    ok: true,
    state: {
      ...state,
      inventory: { ...backpack.container, maxSlots: backpackInventoryCapacity },
      backpackEquipped: true,
    },
    message: `Đã trang bị ba lô. Sức chứa tăng lên ${backpackInventoryCapacity} ô.`,
  }
}

export function unequipBackpack(state: GameSnapshot): InventoryActionResult {
  if (!state.backpackEquipped) return { ok: false, message: 'Bạn chưa trang bị ba lô.' }
  if (state.inventory.slots.length >= baseInventoryCapacity) {
    return { ok: false, message: `Hãy để trống ít nhất ${state.inventory.slots.length - baseInventoryCapacity + 1} ô trước khi tháo ba lô.` }
  }
  const inventory = addItems(
    { ...state.inventory, maxSlots: baseInventoryCapacity },
    'item_backpack',
    1,
  )
  if (!inventory.ok) return { ok: false, message: 'Không đủ chỗ để cất ba lô sau khi tháo.' }
  return {
    ok: true,
    state: { ...state, inventory: inventory.container, backpackEquipped: false },
    message: `Đã tháo ba lô. Sức chứa trở về ${baseInventoryCapacity} ô.`,
  }
}

export function addItems(
  container: ItemContainer,
  itemId: ItemId,
  quantity: number,
  now = Date.now(),
  expiresAtOverride?: number,
): ItemContainerUpdate {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, message: 'Số lượng phải là số nguyên lớn hơn 0.' }
  }

  const definition = itemDefinitions[itemId]
  const expiresAt = expiresAtOverride ?? getExpiry(itemId, now)
  const slots = container.slots.map((slot) => (
    slot.itemId === itemId
    && slot.expiresAt === undefined
    && expiresAt !== undefined
      ? { ...slot, expiresAt }
      : { ...slot }
  ))
  let remaining = quantity

  for (const slot of slots) {
    if (slot.itemId !== itemId
      || slot.quantity >= definition.maxStack
      || !isSameFreshnessBatch(slot.expiresAt, expiresAt)) continue
    const added = Math.min(definition.maxStack - slot.quantity, remaining)
    slot.quantity += added
    if (expiresAt !== undefined) slot.expiresAt = Math.min(slot.expiresAt ?? expiresAt, expiresAt)
    remaining -= added
    if (remaining === 0) break
  }

  while (remaining > 0 && slots.length < container.maxSlots) {
    const added = Math.min(definition.maxStack, remaining)
    slots.push({ itemId, quantity: added, ...(expiresAt === undefined ? {} : { expiresAt }) })
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
  const expiryBatches: Array<{ quantity: number; expiresAt?: number }> = []
  let quantityToMove = quantity
  for (const slot of source.slots) {
    if (slot.itemId !== itemId || quantityToMove <= 0) continue
    const moved = Math.min(slot.quantity, quantityToMove)
    expiryBatches.push({
      quantity: moved,
      ...(itemDefinitions[itemId].shelfLifeMs === undefined
        ? {}
        : { expiresAt: slot.expiresAt ?? getExpiry(itemId, Date.now()) }),
    })
    quantityToMove -= moved
  }
  const reducedSource = removeItems(source, itemId, quantity)
  if (!reducedSource.ok) return reducedSource

  let expandedDestination = destination
  for (const batch of expiryBatches) {
    const result = addItems(expandedDestination, itemId, batch.quantity, Date.now(), batch.expiresAt)
    if (!result.ok) return result
    expandedDestination = result.container
  }

  return {
    ok: true,
    source: reducedSource.container,
    destination: expandedDestination,
  }
}

export function consumeItem(state: GameSnapshot, itemId: ItemId, now = Date.now()): UseItemResult {
  if (state.character.status !== 'alive') {
    return { ok: false, message: 'Bạn cần hồi sinh trước khi sử dụng vật phẩm.' }
  }
  const definition = itemDefinitions[itemId]
  if (state.inventory.slots.some((slot) => (
    slot.itemId === itemId
    && slot.expiresAt !== undefined
    && slot.expiresAt <= now
  ))) {
    return { ok: false, message: 'Thức ăn này đã ôi thiu, không thể sử dụng.' }
  }
  const hungerRestore = definition.hungerRestore ?? 0
  const thirstRestore = definition.thirstRestore ?? 0
  const healthRestore = definition.healthRestore ?? 0
  if (!definition.usable || (hungerRestore <= 0 && thirstRestore <= 0 && healthRestore <= 0)) {
    return { ok: false, message: 'Vật phẩm này chưa thể sử dụng.' }
  }
  const canRestoreHunger = hungerRestore > 0 && state.survival.hunger < survivalConfig.hunger.max
  const canRestoreThirst = thirstRestore > 0 && state.survival.thirst < survivalConfig.thirst.max
  const canRestoreHealth = healthRestore > 0 && state.survival.health < survivalConfig.health.max
  const curedAilments = state.ailments?.filter((ailment) => definition.curesAilments?.includes(ailment.id)) ?? []
  if (!canRestoreHunger && !canRestoreThirst && !canRestoreHealth && curedAilments.length === 0) {
    if (healthRestore > 0 && hungerRestore === 0 && thirstRestore === 0) {
      return { ok: false, message: 'Bạn hiện không cần hồi phục sức khỏe.' }
    }
    if (thirstRestore > 0 && hungerRestore === 0) {
      return { ok: false, message: 'Bạn hiện không khát.' }
    }
    return { ok: false, message: 'Bạn hiện không đói.' }
  }

  const updatedInventory = removeItems(state.inventory, itemId, 1)
  if (!updatedInventory.ok) return updatedInventory

  const hunger = Math.min(survivalConfig.hunger.max, state.survival.hunger + hungerRestore)
  const thirst = Math.min(survivalConfig.thirst.max, state.survival.thirst + thirstRestore)
  const health = Math.min(survivalConfig.health.max, state.survival.health + healthRestore)
  const survival = {
    ...state.survival,
    hunger,
    thirst,
    health,
    ...(definition.bodyTemperatureDelta !== undefined
      ? {
        bodyTemperature: Math.max(
          32,
          Math.min(42, (state.survival.bodyTemperature ?? 37) + definition.bodyTemperatureDelta),
        ),
      }
      : {}),
    conditions: getSurvivalConditions({ ...state.survival, hunger, thirst, health }),
  }
  const restoredHunger = hunger - state.survival.hunger
  const restoredThirst = thirst - state.survival.thirst
  const restoredHealth = health - state.survival.health
  const curedAilmentNames: Record<SurvivalAilmentId, string> = {
    bleeding: 'chảy máu',
    infection: 'nhiễm trùng',
    heatstroke: 'say nắng',
    hypothermia: 'hạ thân nhiệt',
    poisoning: 'ngộ độc',
    sunburn: 'cháy nắng',
    sprain: 'bong gân',
    fracture: 'gãy xương',
    blisters: 'phồng rộp',
    insectBites: 'côn trùng cắn',
    tropicalFever: 'sốt nhiệt đới',
    diarrhea: 'tiêu chảy',
    allergy: 'dị ứng',
    smoke: 'hít phải khói',
    marineSting: 'sinh vật biển đốt',
    dehydration: 'mất nước',
    burns: 'bỏng',
    frostbite: 'tê cóng',
    animalBite: 'động vật cắn',
    exhaustion: 'kiệt sức',
  }
  const curedAilmentMessage = curedAilments.length > 0
    ? ` Đã chữa: ${curedAilments.map((ailment) => curedAilmentNames[ailment.id]).join(', ')}.`
    : ''
  const causedPoisoning = definition.causesAilment === 'poisoning'
    && !state.ailments?.some((ailment) => ailment.id === 'poisoning')
  const stateAfterUse = definition.causesAilment === 'poisoning'
    ? inflictPoisoning(state)
    : state
  const causedAilmentMessage = causedPoisoning ? ' Bạn bị ngộ độc; hãy dùng thuốc giải độc.' : ''
  const restorationMessage = [
    restoredHunger > 0 ? `No bụng +${restoredHunger}.` : '',
    restoredThirst > 0 ? `Nước +${restoredThirst}.` : '',
    restoredHealth > 0 ? `Sức khỏe +${restoredHealth}.` : '',
  ].filter(Boolean).join(' ')

  return {
    ok: true,
    state: {
      ...stateAfterUse,
      inventory: updatedInventory.container,
      survival,
      ailments: (stateAfterUse.ailments ?? [])
        .filter((ailment) => !definition.curesAilments?.includes(ailment.id)),
    },
    itemId,
    message: `Đã dùng ${definition.name}. ${restorationMessage}${curedAilmentMessage}${causedAilmentMessage}`,
  }
}
