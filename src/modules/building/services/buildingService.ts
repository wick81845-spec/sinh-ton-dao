import { removeItems } from '../../inventory/services/inventoryService'
import type { ConstructionJob, GameSnapshot, PlayerBuilding } from '../../../shared/types/game'
import { buildingDefinitions, constructionQueueLimit, type BuildingDefinition } from '../data/buildingDefinitions'
import type { ItemQuantity } from '../../../shared/types/game'
import { awardExperience } from '../../progression/services/progressionService'

export type BuildingActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export interface ConstructionCompletionResult {
  state: GameSnapshot
  completedBuildingIds: string[]
}

export function getShelterRestBonusMultiplier(state: GameSnapshot): number {
  const shelter = state.buildings.find((building) => (
    building.definitionId === 'building_shelter'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
  return shelter ? 1 + 0.25 + Math.max(0, shelter.level - 1) * 0.15 : 1
}

function getBuildingDefinition(definitionId: string): BuildingDefinition | undefined {
  return buildingDefinitions.find((definition) => definition.id === definitionId)
}

function hasIngredients(state: GameSnapshot, ingredients: ItemQuantity[]): boolean {
  return ingredients.every((ingredient) => state.inventory.slots
    .filter((slot) => slot.itemId === ingredient.itemId)
    .reduce((total, slot) => total + slot.quantity, 0) >= ingredient.quantity)
}

function consumeCost(state: GameSnapshot, cost: ItemQuantity[]): GameSnapshot | null {
  let inventory = state.inventory
  for (const ingredient of cost) {
    const result = removeItems(inventory, ingredient.itemId, ingredient.quantity)
    if (!result.ok) return null
    inventory = result.container
  }
  return { ...state, inventory }
}

function getBuildingIssue(state: GameSnapshot, definition: BuildingDefinition): string | null {
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi xây dựng.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi xây dựng.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể xây dựng khi đang trên hành trình.'
  }
  if (state.character.currentLocationId !== state.character.homeIslandId) {
    return 'Bạn phải ở đảo nhà để xây dựng.'
  }
  if (state.character.level < (definition.requiredLevel ?? 1)) {
    return `Cần đạt cấp ${definition.requiredLevel} để xây ${definition.name.toLocaleLowerCase('vi-VN')}.`
  }
  if (definition.technologyId && !(state.character.researchedTechnologyIds ?? []).includes(definition.technologyId)) {
    return 'Cần nghiên cứu công nghệ mở khóa công trình này.'
  }
  if (definition.requiredDiscoveryId && !state.discoveredIslandIds.includes(definition.requiredDiscoveryId)) {
    return `Cần khám phá ${definition.requiredDiscoveryId === 'island_004' ? 'Đảo Mạch Đá' : 'đảo mới'} để xây công trình này.`
  }
  if (state.constructionQueue.length >= constructionQueueLimit) return 'Hàng đợi xây dựng đã đầy.'
  if (!hasIngredients(state, definition.constructionCost)) return 'Không đủ nguyên liệu để xây công trình này.'
  return null
}

export function getConstructionAvailability(state: GameSnapshot, definitionId: string): string | null {
  const definition = getBuildingDefinition(definitionId)
  if (!definition) return 'Loại công trình không tồn tại.'
  return getBuildingIssue(state, definition)
}

export function getUpgradeAvailability(state: GameSnapshot, buildingId: string): string | null {
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi nâng cấp.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi nâng cấp.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể nâng cấp khi đang trên hành trình.'
  }
  if (state.constructionQueue.length >= constructionQueueLimit) return 'Hàng đợi xây dựng đã đầy.'

  const building = state.buildings.find((entry) => entry.id === buildingId)
  if (!building) return 'Không tìm thấy công trình.'
  if (building.status !== 'completed') return 'Chỉ có thể nâng cấp công trình đã hoàn thành.'

  const definition = getBuildingDefinition(building.definitionId)
  if (!definition) return 'Định nghĩa công trình không tồn tại.'
  if (building.level >= definition.maxLevel) return 'Công trình đã đạt cấp tối đa.'
  if (state.character.currentLocationId !== building.islandId) return 'Bạn không ở đúng hòn đảo.'

  const targetLevel = building.level + 1
  const requirements = definition.upgradeRequirements?.[targetLevel]
  if (requirements?.requiredLevel && state.character.level < requirements.requiredLevel) {
    return `Cần đạt cấp ${requirements.requiredLevel} để nâng cấp ${definition.name.toLocaleLowerCase('vi-VN')}.`
  }
  if (requirements?.technologyId
    && !(state.character.researchedTechnologyIds ?? []).includes(requirements.technologyId)) {
    return 'Cần nghiên cứu công nghệ mở khóa cấp nâng cấp này.'
  }
  if (requirements?.requiredDiscoveryId
    && !state.discoveredIslandIds.includes(requirements.requiredDiscoveryId)) {
    return `Cần khám phá ${requirements.requiredDiscoveryId === 'island_002' ? 'Đảo Rừng Dạt' : 'Đảo Mạch Đá'} trước khi nâng cấp.`
  }
  const cost = definition.upgradeCosts[targetLevel]
  const duration = definition.upgradeDurationSeconds[targetLevel]
  if (!cost || duration === undefined) return 'Chưa có cấu hình nâng cấp cho cấp này.'
  if (!hasIngredients(state, cost)) return 'Không đủ nguyên liệu để nâng cấp.'
  return null
}

export function startConstruction(state: GameSnapshot, definitionId: string, now: number): BuildingActionResult {
  const definition = getBuildingDefinition(definitionId)
  if (!definition) return { ok: false, message: 'Loại công trình không tồn tại.' }
  const issue = getBuildingIssue(state, definition)
  if (issue) return { ok: false, message: issue }

  const consumedState = consumeCost(state, definition.constructionCost)
  if (!consumedState) return { ok: false, message: 'Không thể tiêu hao nguyên liệu xây dựng.' }

  const buildingId = `${definition.id}-${now}-${state.buildings.length + 1}`
  const job: ConstructionJob = {
    id: `construction-${now}-${state.constructionQueue.length}`,
    buildingId,
    kind: 'construction',
    targetLevel: 1,
    startedAt: now,
    completesAt: now + definition.constructionDurationSeconds * 1000,
  }
  const building: PlayerBuilding = {
    id: buildingId,
    definitionId: definition.id,
    islandId: state.character.homeIslandId,
    level: 1,
    health: definition.maxHealth,
    status: 'building',
  }

  return {
    ok: true,
    state: {
      ...consumedState,
      buildings: [...state.buildings, building],
      constructionQueue: [...state.constructionQueue, job],
    },
    message: `Đã bắt đầu xây ${definition.name}.`,
  }
}

export function upgradeBuilding(state: GameSnapshot, buildingId: string, now: number): BuildingActionResult {
  const issue = getUpgradeAvailability(state, buildingId)
  if (issue) return { ok: false, message: issue }
  const building = state.buildings.find((entry) => entry.id === buildingId)
  if (!building) return { ok: false, message: 'Không tìm thấy công trình.' }

  const definition = getBuildingDefinition(building.definitionId)
  if (!definition) return { ok: false, message: 'Định nghĩa công trình không tồn tại.' }

  const targetLevel = building.level + 1
  const cost = definition.upgradeCosts[targetLevel]
  const duration = definition.upgradeDurationSeconds[targetLevel]
  if (!cost || duration === undefined) return { ok: false, message: 'Chưa có cấu hình nâng cấp cho cấp này.' }
  if (!hasIngredients(state, cost)) return { ok: false, message: 'Không đủ nguyên liệu để nâng cấp.' }

  const consumedState = consumeCost(state, cost)
  if (!consumedState) return { ok: false, message: 'Không thể tiêu hao nguyên liệu nâng cấp.' }

  const job: ConstructionJob = {
    id: `upgrade-${building.id}-${now}`,
    buildingId: building.id,
    kind: 'upgrade',
    targetLevel,
    startedAt: now,
    completesAt: now + duration * 1000,
  }

  return {
    ok: true,
    state: {
      ...consumedState,
      buildings: state.buildings.map((entry) => entry.id === buildingId ? { ...entry, status: 'building' } : entry),
      constructionQueue: [...state.constructionQueue, job],
    },
    message: `Đã bắt đầu nâng cấp ${definition.name} lên cấp ${targetLevel}.`,
  }
}

export function completeConstructions(state: GameSnapshot, now: number): ConstructionCompletionResult {
  const completedJobs = state.constructionQueue.filter((job) => job.completesAt <= now)
  if (completedJobs.length === 0) return { state, completedBuildingIds: [] }

  const completedById = new Map(completedJobs.map((job) => [job.buildingId, job]))
  const awardedExperience = completedJobs.reduce((total, job) => total + (job.kind === 'construction' ? 15 : 10), 0)
  const buildings = state.buildings.map((building) => {
    const job = completedById.get(building.id)
    return job
      ? { ...building, level: job.targetLevel, status: 'completed' as const }
      : building
  })

  return {
    state: {
      ...state,
      character: awardExperience(state.character, 'building', awardedExperience),
      buildings,
      constructionQueue: state.constructionQueue.filter((job) => job.completesAt > now),
    },
    completedBuildingIds: completedJobs.map((job) => job.buildingId),
  }
}

export { buildingDefinitions }
