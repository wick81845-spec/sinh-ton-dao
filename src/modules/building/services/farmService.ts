import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { CropId, FarmPlot, GameSnapshot, ItemId } from '../../../shared/types/game'
import { addItems, removeItems } from '../../inventory/services/inventoryService'
import { awardExperience } from '../../progression/services/progressionService'

export interface CropDefinition {
  id: CropId
  name: string
  seedItemId: ItemId
  harvestItemId: ItemId
  harvestQuantity: number
  growthMilliseconds: number
  requiredDiscoveryId?: string
}

export const cropDefinitions: readonly CropDefinition[] = [
  {
    id: 'fruit',
    name: 'Cây ăn quả',
    seedItemId: 'item_fruit_seed',
    harvestItemId: 'item_wild_fruit',
    harvestQuantity: 4,
    growthMilliseconds: 5 * 60 * 1000,
  },
  {
    id: 'herb',
    name: 'Thảo mộc',
    seedItemId: 'item_herb_seed',
    harvestItemId: 'item_wild_herb',
    harvestQuantity: 3,
    growthMilliseconds: 4 * 60 * 1000,
  },
  {
    id: 'coconut',
    name: 'Cây dừa',
    seedItemId: 'item_coconut_seed',
    harvestItemId: 'item_coconut',
    harvestQuantity: 2,
    growthMilliseconds: 15 * 60 * 1000,
    requiredDiscoveryId: 'island_001',
  },
]

export type FarmActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

function getCrop(cropId: CropId): CropDefinition | undefined {
  return cropDefinitions.find((crop) => crop.id === cropId)
}

function getGardenBed(state: GameSnapshot, buildingId: string) {
  return state.buildings.find((building) => (
    building.id === buildingId
    && building.definitionId === 'building_garden_bed'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

function getPlantingIssue(state: GameSnapshot, buildingId: string, crop: CropDefinition): string | null {
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi trồng cây.'
  if (state.activeCombat || state.activeGathering || state.activeExploration || state.craftingQueue.length > 0) {
    return 'Hãy kết thúc hoạt động hiện tại trước khi trồng cây.'
  }
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể trồng cây khi đang trên hành trình.'
  }
  if (!getGardenBed(state, buildingId)) return 'Cần có luống trồng đã hoàn thành tại đảo hiện tại.'
  if (!(state.character.researchedTechnologyIds ?? []).includes('tech_agriculture')) {
    return 'Cần nghiên cứu công nghệ trồng trọt trên đảo.'
  }
  if ((state.farmPlots ?? []).some((plot) => plot.buildingId === buildingId)) return 'Luống này đang có cây trồng.'
  if (crop.requiredDiscoveryId && !state.discoveredIslandIds.includes(crop.requiredDiscoveryId)) {
    return 'Cần khám phá đảo có cây giống phù hợp trước khi trồng.'
  }
  if (!state.inventory.slots.some((slot) => slot.itemId === crop.seedItemId && slot.quantity > 0)) {
    return `Cần có ${itemDefinitions[crop.seedItemId].name}.`
  }
  return null
}

export function getCropPlantAvailability(state: GameSnapshot, buildingId: string, cropId: CropId): string | null {
  const crop = getCrop(cropId)
  if (!crop) return 'Không tìm thấy giống cây.'
  return getPlantingIssue(state, buildingId, crop)
}

export function plantCrop(
  state: GameSnapshot,
  buildingId: string,
  cropId: CropId,
  now: number,
): FarmActionResult {
  const crop = getCrop(cropId)
  if (!crop) return { ok: false, message: 'Không tìm thấy giống cây.' }
  const issue = getPlantingIssue(state, buildingId, crop)
  if (issue) return { ok: false, message: issue }
  const inventory = removeItems(state.inventory, crop.seedItemId, 1)
  if (!inventory.ok) return { ok: false, message: inventory.message }
  const plot: FarmPlot = {
    id: `farm-${buildingId}-${now}`,
    buildingId,
    cropId,
    plantedAt: now,
    readyAt: now + crop.growthMilliseconds,
  }
  return {
    ok: true,
    state: { ...state, inventory: inventory.container, farmPlots: [...(state.farmPlots ?? []), plot] },
    message: `Đã gieo ${crop.name}; có thể thu hoạch sau ${Math.ceil(crop.growthMilliseconds / 60_000)} phút.`,
  }
}

export function harvestCrop(state: GameSnapshot, plotId: string, now: number): FarmActionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi thu hoạch.' }
  const plot = (state.farmPlots ?? []).find((entry) => entry.id === plotId)
  if (!plot) return { ok: false, message: 'Không tìm thấy luống cây.' }
  if (!getGardenBed(state, plot.buildingId)) return { ok: false, message: 'Luống trồng không còn hoạt động tại đảo này.' }
  if (now < plot.readyAt) return { ok: false, message: 'Cây trồng chưa phát triển xong.' }
  const crop = getCrop(plot.cropId)
  if (!crop) return { ok: false, message: 'Giống cây không còn được hỗ trợ.' }
  const inventory = addItems(state.inventory, crop.harvestItemId, crop.harvestQuantity, now)
  if (!inventory.ok) return { ok: false, message: 'Túi đồ không đủ chỗ để thu hoạch.' }
  return {
    ok: true,
    state: {
      ...state,
      inventory: inventory.container,
      farmPlots: (state.farmPlots ?? []).filter((entry) => entry.id !== plotId),
      character: awardExperience(state.character, 'gathering', 4),
    },
    message: `Đã thu hoạch ${itemDefinitions[crop.harvestItemId].name} × ${crop.harvestQuantity}.`,
  }
}
