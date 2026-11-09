import type { IslandType } from '../../../shared/types/game'
import type { BiomeId } from './biomeDefinitions'

export interface IslandDefinition {
  id: string
  name: string
  type: IslandType
  biomeId: BiomeId
  subBiomes: string[]
  oceanZoneId: string
  regionId: string
  description: string
  ownerId: string | null
  travelDurationSeconds: number
  weatherRisk: 'low' | 'moderate' | 'high'
}

export interface WorldLocationDefinition {
  id: string
  islandId: string
  name: string
  description: string
}

export interface WorldEventDefinition {
  id: string
  title: string
  description: string
  locationId: string
}

export const worldRegions = [
  { id: 'region_starting_sea', name: 'Vùng biển khởi đầu' },
  { id: 'region_outer_sea', name: 'Vùng biển ngoài khơi' },
] as const

export const islandDefinitions: readonly IslandDefinition[] = [
  {
    id: 'island_001',
    name: 'Đảo Mầm Xanh',
    type: 'personal',
    biomeId: 'tropical_island',
    subBiomes: ['sandy_beach', 'tropical_forest', 'rocky_coast'],
    oceanZoneId: 'coastal_water',
    regionId: 'region_starting_sea',
    description: 'Đảo nhà yên bình, có bờ biển và những điểm tài nguyên đầu tiên.',
    ownerId: 'character_001',
    travelDurationSeconds: 0,
    weatherRisk: 'low',
  },
  {
    id: 'island_002',
    name: 'Đảo Rừng Dạt',
    type: 'wild',
    biomeId: 'rainforest_island',
    subBiomes: ['rainforest', 'riverbank', 'meadow'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_starting_sea',
    description: 'Một hòn đảo xanh rậm rạp vừa được phát hiện ngoài khơi.',
    ownerId: null,
    travelDurationSeconds: 14,
    weatherRisk: 'moderate',
  },
  {
    id: 'island_003',
    name: 'Tàn Tích San Hô',
    type: 'ruins',
    biomeId: 'ancient_island',
    subBiomes: ['ancient_ruins', 'coral_shore', 'underground_chamber'],
    oceanZoneId: 'shipwreck_zone',
    regionId: 'region_outer_sea',
    description: 'Di tích cổ nằm giữa vùng biển có thời tiết thất thường.',
    ownerId: null,
    travelDurationSeconds: 22,
    weatherRisk: 'high',
  },
]

export const worldLocations: readonly WorldLocationDefinition[] = [
  {
    id: 'island_001',
    islandId: 'island_001',
    name: 'Bờ biển Đảo Mầm Xanh',
    description: 'Khu vực an toàn gần căn cứ, thích hợp để chuẩn bị hành trình.',
  },
  {
    id: 'island_002',
    islandId: 'island_002',
    name: 'Rừng trung tâm',
    description: 'Thảm thực vật dày che phủ phần lớn hòn đảo.',
  },
  {
    id: 'island_003',
    islandId: 'island_003',
    name: 'Tàn tích ven biển',
    description: 'Những công trình đá cổ lộ ra khi thủy triều xuống.',
  },
]

export const worldEventDefinitions: readonly WorldEventDefinition[] = [
  {
    id: 'event_drift_cache',
    title: 'Thùng hàng trôi dạt',
    description: 'Một thùng hàng còn nguyên vẹn dạt vào bãi cát.',
    locationId: 'island_002',
  },
  {
    id: 'event_coral_inscription',
    title: 'Dấu khắc san hô',
    description: 'Dấu khắc cổ hé lộ manh mối về vùng biển xung quanh.',
    locationId: 'island_003',
  },
]

export function getIslandDefinition(islandId: string): IslandDefinition | undefined {
  return islandDefinitions.find((island) => island.id === islandId)
}

export function getLocationDefinition(locationId: string): WorldLocationDefinition | undefined {
  return worldLocations.find((location) => location.id === locationId)
}
