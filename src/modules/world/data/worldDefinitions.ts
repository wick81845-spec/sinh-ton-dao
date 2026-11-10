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
  artwork: string
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
  { id: 'region_far_sea', name: 'Quần đảo phương xa' },
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
    artwork: '/assets/world/island-starting.png',
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
    artwork: '/assets/world/island-rainforest.png',
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
    artwork: '/assets/world/island-ancient.png',
    ownerId: null,
    travelDurationSeconds: 22,
    weatherRisk: 'high',
  },
  {
    id: 'island_004',
    name: 'Đảo Mạch Đá',
    type: 'resource',
    biomeId: 'rocky_island',
    subBiomes: ['rocky_cliffs', 'mountain_slope', 'sea_caves'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_outer_sea',
    description: 'Đảo núi đá có hang ven biển, sườn dốc và các mạch khoáng lộ thiên.',
    artwork: '/assets/world/island-rocky.png',
    ownerId: null,
    travelDurationSeconds: 28,
    weatherRisk: 'moderate',
  },
  {
    id: 'island_005',
    name: 'Đảo Hỏa Tâm',
    type: 'resource',
    biomeId: 'volcanic_island',
    subBiomes: ['basalt_field', 'volcanic_crater', 'geothermal_spring'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_outer_sea',
    description: 'Đảo núi lửa với đá bazan, suối địa nhiệt và những vùng khí nóng nguy hiểm.',
    artwork: '/assets/world/island-volcanic.png',
    ownerId: null,
    travelDurationSeconds: 35,
    weatherRisk: 'high',
  },
  {
    id: 'island_006',
    name: 'Đảo Rễ Đước',
    type: 'wild',
    biomeId: 'mangrove_island',
    subBiomes: ['mangrove_forest', 'tidal_mudflat', 'brackish_creek'],
    oceanZoneId: 'coastal_water',
    regionId: 'region_outer_sea',
    description: 'Rừng ngập mặn đan rễ dày, nơi thủy triều quyết định lối đi và vùng kiếm ăn.',
    artwork: '/assets/world/island-mangrove.png',
    ownerId: null,
    travelDurationSeconds: 39,
    weatherRisk: 'moderate',
  },
  {
    id: 'island_007',
    name: 'Đảo Lau Sương',
    type: 'wild',
    biomeId: 'swamp_island',
    subBiomes: ['freshwater_marsh', 'reedbed', 'stillwater_pool'],
    oceanZoneId: 'coastal_water',
    regionId: 'region_outer_sea',
    description: 'Đầm lầy nước ngọt với lau sậy, ao tù và nền đất lún khó đi.',
    artwork: '/assets/world/island-swamp.png',
    ownerId: null,
    travelDurationSeconds: 44,
    weatherRisk: 'moderate',
  },
  {
    id: 'island_008',
    name: 'Đảo Vành San Hô',
    type: 'resource',
    biomeId: 'coral_island',
    subBiomes: ['coral_reef', 'blue_lagoon', 'carbonate_beach'],
    oceanZoneId: 'coral_sea',
    regionId: 'region_far_sea',
    description: 'Đảo thấp quanh đầm phá trong xanh; rạn san hô sống là hệ sinh thái cần được bảo vệ.',
    artwork: '/assets/world/island-coral.png',
    ownerId: null,
    travelDurationSeconds: 50,
    weatherRisk: 'high',
  },
  {
    id: 'island_009',
    name: 'Đảo Bốn Mùa',
    type: 'wild',
    biomeId: 'temperate_island',
    subBiomes: ['deciduous_forest', 'meadow', 'river_lake'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_far_sea',
    description: 'Rừng lá rộng, đồng cỏ và sông hồ thay đổi theo mùa.',
    artwork: '/assets/world/island-temperate.png',
    ownerId: null,
    travelDurationSeconds: 56,
    weatherRisk: 'moderate',
  },
  {
    id: 'island_010',
    name: 'Đảo Thông Bắc',
    type: 'resource',
    biomeId: 'coniferous_island',
    subBiomes: ['pine_forest', 'rocky_hills', 'cold_lake'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_far_sea',
    description: 'Rừng thông và hồ lạnh trong vùng khí hậu có mùa đông kéo dài.',
    artwork: '/assets/world/island-coniferous.png',
    ownerId: null,
    travelDurationSeconds: 62,
    weatherRisk: 'high',
  },
  {
    id: 'island_011',
    name: 'Đảo Băng Trôi',
    type: 'wild',
    biomeId: 'frozen_island',
    subBiomes: ['tundra', 'glacier_coast', 'drifting_ice'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_far_sea',
    description: 'Bờ biển băng giá và lãnh nguyên thưa thớt; cần chuẩn bị chống rét trước khi cập bờ.',
    artwork: '/assets/world/island-frozen.png',
    ownerId: null,
    travelDurationSeconds: 70,
    weatherRisk: 'high',
  },
  {
    id: 'island_012',
    name: 'Đảo Cồn Gió',
    type: 'resource',
    biomeId: 'desert_island',
    subBiomes: ['sand_dunes', 'arid_rock', 'seasonal_oasis'],
    oceanZoneId: 'coastal_water',
    regionId: 'region_far_sea',
    description: 'Đảo khô hạn với cồn cát, bãi đá và một ốc đảo nhỏ phụ thuộc mùa mưa.',
    artwork: '/assets/world/island-desert.png',
    ownerId: null,
    travelDurationSeconds: 78,
    weatherRisk: 'high',
  },
  {
    id: 'island_013',
    name: 'Đảo Nhiệt Đới',
    type: 'wild',
    biomeId: 'tropical_island',
    subBiomes: ['sandy_beach', 'tropical_forest', 'rocky_coast', 'riverbank'],
    oceanZoneId: 'open_ocean',
    regionId: 'region_far_sea',
    description: 'Hòn đảo nhiệt đới xa bờ có rừng xanh, suối nước ngọt và những bãi biển đầy cá.',
    artwork: '/assets/world/island-tropical.png',
    ownerId: null,
    travelDurationSeconds: 82,
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
  {
    id: 'island_004',
    islandId: 'island_004',
    name: 'Hang Mạch Đá',
    description: 'Các khe nứt và hang ven biển mở ra những tầng đá khác nhau.',
  },
  {
    id: 'island_005',
    islandId: 'island_005',
    name: 'Sườn núi lửa',
    description: 'Đường lên miệng núi đi qua đá bazan nóng và các khe địa nhiệt.',
  },
  {
    id: 'island_006',
    islandId: 'island_006',
    name: 'Lạch Rễ Đước',
    description: 'Lạch nước lợ uốn qua rễ cây, thay đổi độ sâu theo thủy triều.',
  },
  {
    id: 'island_007',
    islandId: 'island_007',
    name: 'Đầm Lau Sậy',
    description: 'Vùng nước ngọt tù đọng được bao quanh bởi lau sậy và nền bùn mềm.',
  },
  {
    id: 'island_008',
    islandId: 'island_008',
    name: 'Đầm phá San Hô',
    description: 'Vùng nước nông có rạn sống và bãi cát carbonate.',
  },
  {
    id: 'island_009',
    islandId: 'island_009',
    name: 'Thung lũng Bốn Mùa',
    description: 'Sông nhỏ nối rừng lá rộng với đồng cỏ và hồ nội đảo.',
  },
  {
    id: 'island_010',
    islandId: 'island_010',
    name: 'Hồ Rừng Thông',
    description: 'Hồ nước lạnh nằm dưới tán rừng lá kim và sườn đồi đá.',
  },
  {
    id: 'island_011',
    islandId: 'island_011',
    name: 'Bờ Băng Trôi',
    description: 'Băng biển và các khe nứt thay đổi theo nhiệt độ và thời tiết.',
  },
  {
    id: 'island_012',
    islandId: 'island_012',
    name: 'Ốc đảo Cồn Gió',
    description: 'Một điểm nước theo mùa giữa cồn cát và vùng đá khô cằn.',
  },
  {
    id: 'island_013',
    islandId: 'island_013',
    name: 'Bờ Suối Nhiệt Đới',
    description: 'Dòng suối nước ngọt chảy từ rừng ra bãi biển nhiệt đới.',
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
