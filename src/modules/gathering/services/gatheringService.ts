import {
  getGatheringActivityData,
  initialResourceNodes,
  gatheringActivities,
  gatheringOutcomeChances,
  randomGatheringActivityId,
  resourceNodeDefinitions,
} from '../data/gatheringConfig'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { getResourceDefinition } from '../../../data/resources/resourceDefinitions'
import { addItems, degradeItemDurability, hasItemOrEquipped } from '../../inventory/services/inventoryService'
import type { GameSnapshot, ItemId, ItemQuantity, ResourceNodeState } from '../../../shared/types/game'
import { awardExperience } from '../../progression/services/progressionService'
import {
  getFishingLootAvailableAt,
  getFishAvailableAt,
  getFishingMethod,
  getSpearFishAvailableAt,
  isSpearFishingZone,
  isFishingActivityId,
  fishingActivity,
  rollFishCatch,
} from '../data/fishingConfig'
import { islandDefinitions } from '../../world/data/worldDefinitions'
import { getFishingLootDefinition } from '../../../data/items/fishingLootCatalog'
import { fishCatalog } from '../../../data/items/fishCatalog'
import { getBestFishingRod } from '../../../data/items/fishingRodCatalog'

export type GatheringActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export type GatheringCompletionResult =
  | { status: 'pending'; state: GameSnapshot }
  | { status: 'completed'; state: GameSnapshot; activityId: string; itemId: ItemId; quantity: number; rewards: ItemQuantity[]; message: string }
  | { status: 'failed'; state: GameSnapshot; message: string }

type GatheringOutcome = NonNullable<GameSnapshot['activeGathering']>['outcome']

function getNodeState(states: ResourceNodeState[], nodeId: string): ResourceNodeState | undefined {
  return states.find((node) => node.nodeId === nodeId)
}

function addUpToQuantity(inventory: GameSnapshot['inventory'], itemId: ItemId, requested: number, now: number) {
  for (let quantity = requested; quantity > 0; quantity -= 1) {
    const result = addItems(inventory, itemId, quantity, now)
    if (result.ok) return { inventory: result.container, quantity }
  }
  return null
}

function getFishingIssue(state: GameSnapshot, activityId: string): string | null {
  const method = getFishingMethod(activityId)
  if (!method) return 'Phương pháp đánh cá chưa được cấu hình đúng.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi câu cá.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi câu cá.'
  if (state.craftingQueue.length > 0) return 'Hãy chờ hàng đợi chế tạo hoàn tất trước.'
  if (state.activeExploration) return 'Hãy chờ hoạt động thám hiểm hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể câu cá khi đang trên hành trình.'
  }
  const actionName = method === 'spear' ? 'đánh cá' : 'câu cá'
  if (state.survival.stamina < fishingActivity.staminaCost) return `Không đủ thể lực để ${actionName}.`
  if (method === 'rod' && !getBestFishingRod(state)) {
    return 'Bạn cần chế tạo một cần câu còn sử dụng được trước khi câu cá.'
  }

  const island = islandDefinitions.find((entry) => entry.id === state.character.currentLocationId)
  if (!island) return 'Không tìm thấy vùng biển để câu cá.'
  if (method === 'spear' && !isSpearFishingZone(island.oceanZoneId)) {
    return 'Lao đánh cá chỉ dùng được ở vùng ven bờ hoặc rạn san hô.'
  }
  if (method === 'spear' && !hasItemOrEquipped(state, 'item_fishing_spear')) {
    return 'Cần có Lao đánh cá trong túi hoặc ô trang bị.'
  }
  const weatherId = state.weather?.locationId === island.id ? state.weather.weatherId : undefined
  const availableFish = method === 'spear'
    ? getSpearFishAvailableAt(island.biomeId, weatherId, island.oceanZoneId)
    : getFishAvailableAt(island.biomeId, weatherId, island.oceanZoneId)
  const availableLoot = method === 'spear' ? [] : getFishingLootAvailableAt(island.oceanZoneId)
  if (availableFish.length === 0 && availableLoot.length === 0) {
    return 'Vùng biển này hiện không có cá hay vật phẩm phù hợp.'
  }
  if (![...availableFish, ...availableLoot].some((item) => addItems(state.inventory, item.itemId, 1).ok)) {
    return `Túi đồ đã đầy; hãy cất bớt vật phẩm trước khi ${actionName}.`
  }
  return null
}

export function getNodeUnlockIssue(state: GameSnapshot, nodeId: string): string | null {
  const node = resourceNodeDefinitions.find((entry) => entry.id === nodeId)
  if (!node) return 'Không tìm thấy địa điểm thu hoạch.'
  if (node.unlockStage === 'exploration' && state.explorationLog.length === 0) {
    return 'Hãy hoàn thành một lần thám hiểm để mở khóa địa điểm này.'
  }
  const toolItemId = getResourceDefinition(node.resourceId)?.harvesting.toolItemId
  if (toolItemId && !hasItemOrEquipped(state, toolItemId)) {
    return `Cần có ${itemDefinitions[toolItemId].name} trong túi hoặc ô trang bị.`
  }
  return null
}

function getGatheringIssue(state: GameSnapshot, activityId: string, now: number): string | null {
  if (isFishingActivityId(activityId)) return getFishingIssue(state, activityId)
  const data = getGatheringActivityData(activityId)
  if (!data) return 'Hoạt động thu thập chưa được cấu hình đúng.'
  const { resource, node: nodeDefinition } = data
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi thu thập.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi thu thập.'
  if (state.craftingQueue.length > 0) return 'Hãy chờ hàng đợi chế tạo hoàn tất trước.'
  if (state.activeExploration) return 'Hãy chờ hoạt động thám hiểm hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể thu thập khi đang trên hành trình.'
  }
  const island = islandDefinitions.find((entry) => entry.id === state.character.currentLocationId)
  if (!island) return 'Không tìm thấy hòn đảo để thu thập tài nguyên.'
  if (!resource.sources.biomes.includes(island.biomeId)) {
    return 'Bạn không ở đúng địa điểm để thu thập tài nguyên này.'
  }
  const unlockIssue = getNodeUnlockIssue(state, nodeDefinition.id)
  if (unlockIssue) return unlockIssue
  if (state.survival.stamina < resource.harvesting.staminaCost) return 'Không đủ thể lực để thực hiện hoạt động này.'

  if (resource.harvesting.toolItemId) {
    if (!hasItemOrEquipped(state, resource.harvesting.toolItemId)) {
      return `Cần có ${itemDefinitions[resource.harvesting.toolItemId].name} trong túi hoặc ô trang bị.`
    }
  }

  const node = getNodeState(refreshResourceNodes(state.resourceNodes, now), nodeDefinition.id)
  const minimumYield = Math.max(1, resource.harvesting.baseYield[0] - 1)
  if (!node || node.available < minimumYield) {
    return 'Điểm tài nguyên đã cạn; hãy chờ tài nguyên tái tạo.'
  }

  if (!addItems(state.inventory, resource.inventoryItemId, minimumYield).ok) {
    return 'Túi đồ đã đầy; hãy cất bớt vật phẩm trước khi thu thập.'
  }
  return null
}

function getAvailableRandomGatheringActivities(state: GameSnapshot, now: number) {
  const island = islandDefinitions.find((entry) => entry.id === state.character.currentLocationId)
  if (!island) return []
  return gatheringActivities.filter((activity) =>
    !isFishingActivityId(activity.id)
    && getGatheringActivityData(activity.id)?.resource.sources.biomes.includes(island.biomeId)
    && getGatheringIssue(state, activity.id, now) === null)
}

export function getGatheringAvailability(state: GameSnapshot, activityId: string, now: number): string | null {
  if (state.activeGathering) return 'Đang có một hoạt động thu thập khác.'
  if (activityId === randomGatheringActivityId) {
    if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi thu thập.'
    if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi thu thập.'
    if (state.craftingQueue.length > 0) return 'Hãy chờ hàng đợi chế tạo hoàn tất trước.'
    if (state.activeExploration) return 'Hãy chờ hoạt động thám hiểm hoàn tất trước.'
    if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
      return 'Không thể thu thập khi đang trên hành trình.'
    }
    if (getAvailableRandomGatheringActivities(state, now).length === 0) {
      return 'Hiện không có tài nguyên phù hợp để thu thập tại hòn đảo này.'
    }
    return null
  }
  return getGatheringIssue(state, activityId, now)
}

export function refreshResourceNodes(nodes: ResourceNodeState[], now: number): ResourceNodeState[] {
  return nodes.map((node) => {
    const definition = resourceNodeDefinitions.find((entry) => entry.id === node.nodeId)
    if (!definition || node.available >= definition.capacity) return node
    const intervalMilliseconds = definition.respawnSeconds * 1000
    if (node.respawnAt === null) return { ...node, respawnAt: now + intervalMilliseconds }
    if (now < node.respawnAt) return node
    const elapsedIntervals = 1 + Math.floor((now - node.respawnAt) / intervalMilliseconds)
    const available = Math.min(definition.capacity, node.available + elapsedIntervals)
    return {
      ...node,
      available,
      respawnAt: available >= definition.capacity
        ? null
        : node.respawnAt + elapsedIntervals * intervalMilliseconds,
    }
  })
}

export function ensureResourceNodeStates(nodes: ResourceNodeState[] | undefined): ResourceNodeState[] {
  const existingNodes = nodes ?? []
  const existingNodeIds = new Set(existingNodes.map((node) => node.nodeId))
  const missingNodes = initialResourceNodes.filter((node) => !existingNodeIds.has(node.nodeId))
  return missingNodes.length === 0
    ? existingNodes
    : [...existingNodes, ...missingNodes.map((node) => ({ ...node }))]
}

export function startGathering(state: GameSnapshot, activityId: string, now: number): GatheringActionResult {
  const issue = getGatheringAvailability(state, activityId, now)
  if (issue) return { ok: false, message: issue }

  if (activityId === randomGatheringActivityId) {
    const outcome = rollGatheringOutcome()
    const durationSeconds = 6 + (outcome === 'adverse' ? 30 : 0)
    return {
      ok: true,
      state: {
        ...state,
        resourceNodes: refreshResourceNodes(state.resourceNodes, now),
        activeGathering: {
          activityId,
          startedAt: now,
          completesAt: now + durationSeconds * 1000,
          outcome,
        },
      },
      message: 'Bắt đầu thu thập quanh đây.',
    }
  }

  const activity = gatheringActivities.find((entry) => entry.id === activityId)
  const data = getGatheringActivityData(activityId)
  if (!activity) return { ok: false, message: 'Hoạt động thu thập chưa được cấu hình đúng.' }
  const durationSeconds = isFishingActivityId(activityId)
    ? fishingActivity.durationSeconds
    : data?.resource.harvesting.durationSeconds
  if (!durationSeconds) return { ok: false, message: 'Hoạt động thu thập chưa được cấu hình đúng.' }
  const outcome = isFishingActivityId(activityId) ? undefined : rollGatheringOutcome()
  const effectiveDuration = durationSeconds + (outcome === 'adverse' ? 30 : 0)

  return {
    ok: true,
    state: {
      ...state,
      resourceNodes: refreshResourceNodes(state.resourceNodes, now),
      activeGathering: {
        activityId,
        startedAt: now,
        completesAt: now + effectiveDuration * 1000,
        ...(outcome ? { outcome } : {}),
      },
    },
    message: `Bắt đầu: ${activity.name}.`,
  }
}

export function cancelGathering(state: GameSnapshot): GameSnapshot {
  return { ...state, activeGathering: null }
}

export function failFishing(state: GameSnapshot, rodDamaged: boolean): GatheringActionResult {
  if (!state.activeGathering || !isFishingActivityId(state.activeGathering.activityId)) {
    return { ok: false, message: 'Bạn chưa bắt đầu hoạt động đánh cá.' }
  }
  if (!rodDamaged || getFishingMethod(state.activeGathering.activityId) !== 'rod') {
    return {
      ok: true,
      state: { ...state, activeGathering: null },
      message: 'Cá đã thoát mất.',
    }
  }
  const rod = getBestFishingRod(state)
  if (!rod) {
    return {
      ok: true,
      state: { ...state, activeGathering: null },
      message: 'Cá đã thoát mất.',
    }
  }
  const toolUse = degradeItemDurability(state, rod.itemId)
  return {
    ok: true,
    state: { ...toolUse.state, activeGathering: null },
    message: toolUse.broke
      ? `${rod.name} đã gãy trong lúc cá vùng vẫy.`
      : `Cá đã thoát; ${rod.name} bị hư, độ bền còn ${toolUse.remaining}/${rod.maxDurability}.`,
  }
}

export function completeGathering(
  state: GameSnapshot,
  now: number,
  castPower = 0,
  caughtItemId?: ItemId,
): GatheringCompletionResult {
  const active = state.activeGathering
  if (!active) return { status: 'failed', state, message: 'Không có hoạt động nào đang chờ hoàn tất.' }
  if (!isFishingActivityId(active.activityId) && now < active.completesAt) return { status: 'pending', state }
  if (active.activityId === randomGatheringActivityId) {
    const availableActivities = getAvailableRandomGatheringActivities(
      { ...state, activeGathering: null },
      now,
    )
    if (availableActivities.length === 0) {
      return {
        status: 'failed',
        state: { ...state, activeGathering: null },
        message: 'Hiện không có tài nguyên phù hợp để thu thập tại hòn đảo này.',
      }
    }
    const selectedActivity = availableActivities[Math.floor(Math.random() * availableActivities.length)]
    return completeGathering({
      ...state,
      activeGathering: { ...active, activityId: selectedActivity.id },
    }, now, castPower)
  }

  const issue = getGatheringIssue({ ...state, activeGathering: null }, active.activityId, now)
  const activity = gatheringActivities.find((entry) => entry.id === active.activityId)
  if (isFishingActivityId(active.activityId) && activity) {
    if (issue) {
      return {
        status: 'failed',
        state: { ...state, activeGathering: null },
        message: issue,
      }
    }

    const method = getFishingMethod(active.activityId)
    if (!method) {
      return { status: 'failed', state: { ...state, activeGathering: null }, message: 'Phương pháp đánh cá chưa được cấu hình đúng.' }
    }
    const rod = method === 'rod' ? getBestFishingRod(state) : undefined
    if (method === 'rod' && !rod) {
      return {
        status: 'failed',
        state: { ...state, activeGathering: null },
        message: 'Bạn cần chế tạo một cần câu còn sử dụng được trước khi câu cá.',
      }
    }
    const island = islandDefinitions.find((entry) => entry.id === state.character.currentLocationId)
    if (!island) {
      return { status: 'failed', state: { ...state, activeGathering: null }, message: 'Không tìm thấy vùng biển để câu cá.' }
    }
    const weatherId = state.weather?.locationId === island.id ? state.weather.weatherId : undefined
    const fishAtLocation = method === 'spear'
      ? getSpearFishAvailableAt(island.biomeId, weatherId, island.oceanZoneId)
      : getFishAvailableAt(island.biomeId, weatherId, island.oceanZoneId)
    const lootAtLocation = method === 'spear' ? [] : getFishingLootAvailableAt(island.oceanZoneId)
    const caughtFish = caughtItemId && fishAtLocation.some((fish) => fish.itemId === caughtItemId)
    const caughtLoot = caughtItemId
      && lootAtLocation.some((loot) => loot.itemId === caughtItemId)
      && getFishingLootDefinition(caughtItemId)
    if (caughtItemId && !caughtFish && !caughtLoot) {
      const isFish = fishCatalog.some((fish) => fish.itemId === caughtItemId)
      return {
        status: 'failed',
        state: { ...state, activeGathering: null },
        message: isFish
          ? 'Loài cá này không có ở vùng biển hiện tại.'
          : 'Vật phẩm này không thể câu được ở vùng biển hiện tại.',
      }
    }
    const possibleFish = fishAtLocation.filter((fish) => addItems(state.inventory, fish.itemId, 1).ok)
    const itemId = caughtItemId ?? rollFishCatch(possibleFish, Math.random(), castPower)
    if (!itemId) {
      return { status: 'failed', state: { ...state, activeGathering: null }, message: 'Không tìm được chỗ trống trong túi cho vật phẩm vừa câu.' }
    }
    const isFishReward = fishAtLocation.some((fish) => fish.itemId === itemId)
    const inventoryResult = addItems(state.inventory, itemId, fishingActivity.baseYield, now)
    if (!inventoryResult.ok) {
      return { status: 'failed', state: { ...state, activeGathering: null }, message: inventoryResult.message }
    }
    const toolItemId = method === 'spear' ? 'item_fishing_spear' : rod?.itemId
    if (!toolItemId) {
      return {
        status: 'failed',
        state: { ...state, activeGathering: null },
        message: 'Bạn cần chế tạo một cần câu còn sử dụng được trước khi câu cá.',
      }
    }
    const toolUse = hasItemOrEquipped(state, toolItemId)
      ? degradeItemDurability({ ...state, inventory: inventoryResult.container }, toolItemId)
      : { state: { ...state, inventory: inventoryResult.container }, remaining: 0, broke: false }
    const toolName = method === 'spear' ? 'Lao đánh cá' : rod?.name ?? 'Cần câu'
    const toolMessage = hasItemOrEquipped(state, toolItemId)
      ? toolUse.broke
        ? ` ${toolName} đã hỏng.`
        : ` Độ bền ${toolName.toLowerCase()}: ${toolUse.remaining}/${itemDefinitions[toolItemId].maxDurability}.`
      : ''

    return {
      status: 'completed',
      state: {
        ...toolUse.state,
        character: { ...awardExperience(state.character, 'gathering', 2) },
        inventory: toolUse.state.inventory,
        itemDurability: toolUse.state.itemDurability,
        activeGathering: null,
        survival: {
          ...state.survival,
          stamina: Math.max(0, state.survival.stamina - fishingActivity.staminaCost),
        },
      },
      activityId: activity.id,
      itemId,
      quantity: fishingActivity.baseYield,
      rewards: [{ itemId, quantity: fishingActivity.baseYield }],
      message: `${method === 'spear' ? 'Đánh cá thành công' : isFishReward ? 'Câu cá thành công' : 'Trục vớt thành công'}: ${itemDefinitions[itemId].name} × ${fishingActivity.baseYield}.${toolMessage}`,
    }
  }
  const data = getGatheringActivityData(active.activityId)
  if (issue || !activity || !data) {
    return {
      status: 'failed',
      state: { ...state, activeGathering: null },
      message: issue ?? 'Hoạt động thu thập không còn hợp lệ.',
    }
  }

  const refreshedNodes = refreshResourceNodes(state.resourceNodes, now)
  const node = getNodeState(refreshedNodes, activity.nodeId)
  if (!node) {
    return {
      status: 'failed',
      state: { ...state, activeGathering: null },
      message: 'Không tìm thấy điểm tài nguyên.',
    }
  }

  const fortune = active.outcome ?? rollGatheringOutcome()
  const [baseMinimum, baseMaximum] = data.resource.harvesting.baseYield
  const minimumYield = Math.max(1, baseMinimum - 1)
  const rolledQuantity = minimumYield + Math.floor(Math.random() * (baseMaximum - minimumYield + 1))
  const requestedQuantity = Math.min(rolledQuantity, node.available)
  const gathered = addUpToQuantity(state.inventory, data.resource.inventoryItemId, requestedQuantity, now)
  if (!gathered) {
    return {
      status: 'failed',
      state: { ...state, activeGathering: null },
      message: 'Túi đồ đã đầy; hãy cất bớt vật phẩm trước khi thu thập.',
    }
  }

  const quantity = gathered.quantity
  const remaining = Math.max(0, node.available - quantity)
  const resourceNodes = refreshedNodes.map((entry) => entry.nodeId !== activity.nodeId
    ? entry
    : {
      ...entry,
      available: remaining,
      respawnAt: remaining < data.node.capacity
        ? now + data.node.respawnSeconds * 1000
        : null,
    })

  let inventory = gathered.inventory
  const rewards: ItemQuantity[] = [{ itemId: data.resource.inventoryItemId, quantity }]
  let missedByproducts = false
  for (const byproduct of data.activity.ordinaryByproducts) {
    if (Math.random() >= byproduct.chance) continue
    const amount = rollQuantity(byproduct.quantity)
    const added = addItems(inventory, byproduct.itemId, amount, now)
    if (added.ok) {
      inventory = added.container
      rewards.push({ itemId: byproduct.itemId, quantity: amount })
    } else {
      missedByproducts = true
    }
  }
  if (fortune === 'lucky') {
    const amount = rollQuantity(data.activity.luckyDrop.quantity)
    const added = addItems(inventory, data.activity.luckyDrop.itemId, amount, now)
    if (added.ok) {
      inventory = added.container
      rewards.push({ itemId: data.activity.luckyDrop.itemId, quantity: amount })
    } else {
      missedByproducts = true
    }
  }
  const toolItemId = data.resource.harvesting.toolItemId
  const toolUse = toolItemId
    ? degradeItemDurability({ ...state, inventory }, toolItemId)
    : { state: { ...state, inventory }, remaining: 0, broke: false }
  const fortuneMessage = fortune === 'adverse'
    ? ` ${data.activity.adverseMessage}`
    : fortune === 'lucky'
      ? ' May mắn tìm thấy thêm tài nguyên tại địa điểm này.'
      : ''
  const inventoryMessage = missedByproducts ? ' Túi đồ chật nên bạn bỏ lỡ một phần vật liệu phụ.' : ''
  const durabilityMessage = toolItemId
    ? toolUse.broke
      ? ` ${itemDefinitions[toolItemId].name} đã hỏng.`
      : ` Độ bền ${itemDefinitions[toolItemId].name}: ${toolUse.remaining}/${itemDefinitions[toolItemId].maxDurability}.`
    : ''

  return {
    status: 'completed',
    state: {
      ...state,
      character: { ...awardExperience(state.character, 'gathering', Math.max(1, Math.ceil(quantity / 2))) },
      inventory: toolUse.state.inventory,
      itemDurability: toolUse.state.itemDurability,
      equippedWeaponId: toolUse.state.equippedWeaponId,
      resourceNodes,
      activeGathering: null,
      survival: {
        ...state.survival,
        health: fortune === 'adverse' ? Math.max(1, state.survival.health - 3) : state.survival.health,
        stamina: Math.max(0, state.survival.stamina - data.resource.harvesting.staminaCost),
      },
    },
    activityId: activity.id,
    itemId: data.resource.inventoryItemId,
    quantity,
    rewards,
    message: `Thu thập hoàn tất: ${formatRewards(rewards)}.${fortuneMessage}${inventoryMessage}${durabilityMessage}`,
  }
}

function rollGatheringOutcome(): Exclude<GatheringOutcome, undefined> {
  const roll = Math.random()
  if (roll < gatheringOutcomeChances.adverse) return 'adverse'
  if (roll < gatheringOutcomeChances.adverse + gatheringOutcomeChances.lucky) return 'lucky'
  return 'ordinary'
}

function rollQuantity([minimum, maximum]: [number, number]): number {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1))
}

function formatRewards(rewards: ItemQuantity[]): string {
  return rewards
    .map(({ itemId, quantity }) => `${itemDefinitions[itemId].name} × ${quantity}`)
    .join(', ')
}

export { gatheringActivities, initialResourceNodes, resourceNodeDefinitions }
