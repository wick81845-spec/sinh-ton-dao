import { fishCatalog } from '../../../data/items/fishCatalog'
import { fishingLootCatalog } from '../../../data/items/fishingLootCatalog'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { resourceDefinitions } from '../../../data/resources/resourceDefinitions'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { gatheringActivities, resourceNodeDefinitions } from '../../gathering/data/gatheringConfig'
import { biomeDefinitions } from '../../world/data/biomeDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { recipes } from '../data/recipes'
import type { ItemId } from '../../../shared/types/game'

export interface ItemSourceInfo {
  kind: 'gathering' | 'fishing' | 'crafting'
  label: string
}

const oceanZoneNames: Readonly<Record<string, string>> = {
  coastal_water: 'ven bờ',
  coral_sea: 'rạn san hô',
  open_ocean: 'biển khơi',
  shipwreck_zone: 'khu xác tàu',
  freshwater: 'sông, suối hoặc hồ nước ngọt',
}

const locationNames: Readonly<Record<string, string>> = {
  'bamboo-grove': 'Rừng tre',
  'coastal_water': 'Vùng nước ven bờ',
  'coral-reef': 'Rạn san hô',
  'damp-forest': 'Rừng ẩm',
  'deep_ocean': 'Biển sâu',
  'fiber-plants': 'Bụi sợi thực vật',
  'forest-floor': 'Nền rừng',
  'forest': 'Rừng',
  'freshwater-stream': 'Suối nước',
  'iron-deposit': 'Mạch quặng sắt',
  'limestone-cliff': 'Vách đá vôi',
  'meadow': 'Đồng cỏ',
  'old-growth-forest': 'Rừng cổ thụ',
  'open_ocean': 'Biển khơi',
  'pearl-oyster-bed': 'Bãi hàu ngọc trai',
  'riverbank': 'Bờ sông',
  'riverbed': 'Lòng sông',
  'rock-face': 'Vách đá',
  'rocky-shore': 'Bờ đá',
  'sandy-beach': 'Bãi cát',
  'shallow_seabed': 'Đáy biển nông',
  'shallow-seabed': 'Đáy biển nông',
  'tidal-zone': 'Bãi triều',
  'wildlife-habitat': 'Sinh cảnh động vật',
  'nesting-ground': 'Khu làm tổ',
  'wetland': 'Vùng đất ngập nước',
}

function formatLocationName(locationId: string): string {
  return locationNames[locationId]
    ?? resourceNodeDefinitions.find((node) => node.id === locationId)?.name
    ?? locationId.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('vi'))
}

function getBiomeNames(biomeIds: readonly string[]): string[] {
  return biomeIds.flatMap((biomeId) => {
    const biome = biomeDefinitions.find((entry) => entry.id === biomeId)
    return biome ? [biome.name] : []
  })
}

function getNodeLabel(nodeId: string): string {
  const node = resourceNodeDefinitions.find((entry) => entry.id === nodeId)
  if (!node) return formatLocationName(nodeId)

  const island = getIslandDefinition(node.locationId)
  return island ? `${node.name} · ${island.name}` : node.name
}

export function getItemSourceInfo(itemId: ItemId): ItemSourceInfo[] {
  const sources: ItemSourceInfo[] = []
  const resource = resourceDefinitions.find((entry) => entry.inventoryItemId === itemId)

  if (resource) {
    const nodes = resourceNodeDefinitions.filter((node) => node.resourceId === resource.id)
    if (nodes.length > 0) {
      sources.push(...nodes.map((node) => ({
        kind: 'gathering' as const,
        label: `Thu hoạch tại ${getNodeLabel(node.id)}`,
      })))
    } else {
      const locations = resource.sources.locations.map(formatLocationName)
      const biomes = getBiomeNames(resource.sources.biomes)
      const places = locations.length > 0 ? locations : biomes
      if (places.length > 0) {
        sources.push({
          kind: 'gathering',
          label: `Thu hoạch tại ${places.join(', ')}`,
        })
      }
    }
  }

  const byproductActivities = gatheringActivities.filter((activity) => (
    activity.ordinaryByproducts.some((drop) => drop.itemId === itemId)
    || activity.luckyDrop.itemId === itemId
  ))
  for (const activity of byproductActivities) {
    const nodeLabel = getNodeLabel(activity.nodeId)
    sources.push({
      kind: 'gathering',
      label: `${activity.name} tại ${nodeLabel}`,
    })
  }

  const fish = fishCatalog.find((entry) => entry.itemId === itemId)
  if (fish) {
    if (!fish.catchable) {
      sources.push({
        kind: 'fishing',
        label: `${fish.name} hiện chưa thể câu trong game`,
      })
    } else {
      const zones = fish.oceanZones.map((zone) => oceanZoneNames[zone] ?? formatLocationName(zone))
      const biomes = getBiomeNames(fish.biomes)
      sources.push({
        kind: 'fishing',
        label: `Câu tại ${zones.join(', ')} · ${biomes.join(', ')}`,
      })
    }
  }

  const fishingLoot = fishingLootCatalog.find((entry) => entry.itemId === itemId)
  if (fishingLoot) {
    const zones = fishingLoot.oceanZones.map((zone) => oceanZoneNames[zone] ?? formatLocationName(zone))
    sources.push({
      kind: 'fishing',
      label: `Có thể nhận khi câu cá tại ${zones.join(', ')}`,
    })
  }

  for (const recipe of recipes.filter((entry) => entry.output.itemId === itemId)) {
    const station = recipe.stationId
      ? buildingDefinitions.find((entry) => entry.id === recipe.stationId)?.name
      : undefined
    sources.push({
      kind: 'crafting',
      label: `Chế tạo bằng ${recipe.name}${station ? ` tại ${station}` : ''}`,
    })
  }

  if (sources.length === 0) {
    return [{
      kind: 'gathering',
      label: `${itemDefinitions[itemId].name}: chưa có địa điểm tìm hoặc công thức được khai báo`,
    }]
  }

  return sources.filter((source, index) => (
    sources.findIndex((entry) => entry.kind === source.kind && entry.label === source.label) === index
  ))
}
