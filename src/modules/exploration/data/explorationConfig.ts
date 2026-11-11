import type { ItemQuantity } from '../../../shared/types/game'
import { speciesDefinitions } from '../../ecology/data/ecologyDefinitions'
import { islandDefinitions } from '../../world/data/worldDefinitions'

export interface ExplorationTaskDefinition {
  id: string
  name: string
  description: string
  locationId: string
  durationSeconds: number
  staminaCost: number
  rewards: ItemQuantity[]
  discoveredIslandIds: string[]
  worldEventId: string | null
  observedSpeciesId?: string
}

const islandExplorationTasks: readonly ExplorationTaskDefinition[] = [
  {
    id: 'survey-nearby-island',
    name: 'Dò tìm đảo ngoài khơi',
    description: 'Quan sát đường chân trời và ghi lại tọa độ hòn đảo gần nhất.',
    locationId: 'island_001',
    durationSeconds: 8,
    staminaCost: 5,
    rewards: [{ itemId: 'item_wild_fruit', quantity: 2 }],
    discoveredIslandIds: ['island_002'],
    worldEventId: null,
  },
  {
    id: 'search-drift-cache',
    name: 'Tìm kiếm trong rừng',
    description: 'Lần theo dấu vết để tìm vật dụng bị bỏ lại giữa rừng.',
    locationId: 'island_002',
    durationSeconds: 12,
    staminaCost: 8,
    rewards: [{ itemId: 'item_wood', quantity: 4 }, { itemId: 'item_stone', quantity: 2 }],
    discoveredIslandIds: [],
    worldEventId: 'event_drift_cache',
  },
  {
    id: 'inspect-coral-ruins',
    name: 'Khảo sát tàn tích',
    description: 'Khám phá những dấu khắc cổ dọc bờ biển.',
    locationId: 'island_003',
    durationSeconds: 15,
    staminaCost: 10,
    rewards: [{ itemId: 'item_stone', quantity: 5 }],
    discoveredIslandIds: [],
    worldEventId: 'event_coral_inscription',
  },
]

const islandDiscoveryTasks: readonly ExplorationTaskDefinition[] = islandDefinitions.slice(3).map((island, index) => {
  const previousIsland = islandDefinitions[index + 2]
  return {
    id: `survey-${island.id}`,
    name: `Khảo sát ${island.name}`,
    description: `Tìm tuyến đường và ghi nhận đặc điểm của đảo mới: ${island.description}`,
    locationId: previousIsland.id,
    durationSeconds: 10 + index * 2,
    staminaCost: 6 + Math.ceil(index / 2),
    rewards: [],
    discoveredIslandIds: [island.id],
    worldEventId: null,
  }
})

const islandSurveyTasks: readonly ExplorationTaskDefinition[] = islandDefinitions.map((island) => ({
  id: `explore-island-${island.id}`,
  name: `Khám phá ${island.name}`,
  description: `Khảo sát địa hình, bờ biển và môi trường tự nhiên tại ${island.name}.`,
  locationId: island.id,
  durationSeconds: 10,
  staminaCost: 4,
  rewards: [],
  discoveredIslandIds: [],
  worldEventId: null,
}))

export const wildlifeObservationTasks: readonly ExplorationTaskDefinition[] = islandDefinitions.flatMap((island) => (
  speciesDefinitions
    .filter((species) => species.role !== 'flora'
      && species.role !== 'aquatic'
      && species.habitats.includes(island.biomeId))
    .map((species) => ({
      id: `observe-wildlife-${island.id}-${species.id}`,
      name: 'Dấu vết chưa nhận diện',
      description: species.role === 'insect'
        ? 'Lắng nghe tiếng động nhỏ và quan sát chuyển động giữa các tán lá.'
        : species.role === 'herbivore'
          ? 'Tìm dấu chân nhỏ và những vệt lá non bị gặm gần nơi trú ẩn.'
          : species.role === 'carnivore'
            ? 'Quan sát dấu chân từ xa, giữ khoảng cách an toàn với sinh vật.'
            : 'Lắng nghe tiếng kêu và tìm lông vũ quanh những tán cây.',
      locationId: island.id,
      durationSeconds: 6,
      staminaCost: 3,
      rewards: [],
      discoveredIslandIds: [],
      worldEventId: null,
      observedSpeciesId: species.id,
    }))
))

export const explorationTasks: readonly ExplorationTaskDefinition[] = [
  ...islandExplorationTasks,
  ...islandDiscoveryTasks,
  ...islandSurveyTasks,
  ...wildlifeObservationTasks,
]
