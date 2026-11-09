import { fishCatalog, fishRarities, type FishCatalogEntry, type FishRarity } from '../../../data/items/fishCatalog'
import type { FishItemId } from '../../../shared/types/game'
import { getFishingLootAvailableAt, type FishingLootEntry, type FishingLootKind } from '../../../data/items/fishingLootCatalog'
import type { BiomeId } from '../../world/data/biomeDefinitions'

export type FishDefinition = FishCatalogEntry
export type FishFightProfile = {
  label: string
  description: string
  movement: 'small' | 'swim' | 'dive' | 'thrash'
  force: number
  reelSpeed: number
  tireRate: number
  fightCycleMs: number
  fightDurationMs: number
}

export const fishRarityNames: Readonly<Record<FishRarity, string>> = {
  common: 'Phổ thông',
  uncommon: 'Không phổ biến',
  unusual: 'Khá hiếm',
  rare: 'Hiếm',
  very_rare: 'Rất hiếm',
  epic: 'Cực hiếm',
  legendary: 'Huyền thoại',
}

const fishFightProfiles: Readonly<Record<FishRarity, FishFightProfile>> = {
  common: {
    label: 'Cá nhỏ',
    description: 'Lực kéo yếu, nhanh xuống sức.',
    movement: 'small',
    force: 0.55,
    reelSpeed: 1.3,
    tireRate: 1.8,
    fightCycleMs: 5_600,
    fightDurationMs: 900,
  },
  uncommon: {
    label: 'Cá vừa',
    description: 'Hay giật dây và bơi ngang.',
    movement: 'swim',
    force: 0.75,
    reelSpeed: 1.15,
    tireRate: 1.55,
    fightCycleMs: 5_200,
    fightDurationMs: 1_050,
  },
  unusual: {
    label: 'Cá khá khỏe',
    description: 'Giật dây liên tục và bơi ngang để thoát câu.',
    movement: 'swim',
    force: 0.95,
    reelSpeed: 1,
    tireRate: 1.3,
    fightCycleMs: 4_800,
    fightDurationMs: 1_250,
  },
  rare: {
    label: 'Cá lớn',
    description: 'Kéo khỏe, thường lao xuống nước.',
    movement: 'dive',
    force: 1.15,
    reelSpeed: 0.88,
    tireRate: 1.05,
    fightCycleMs: 4_500,
    fightDurationMs: 1_400,
  },
  very_rare: {
    label: 'Cá rất khỏe',
    description: 'Kéo mạnh và thường lao xuống vùng nước sâu.',
    movement: 'dive',
    force: 1.35,
    reelSpeed: 0.78,
    tireRate: 0.9,
    fightCycleMs: 4_100,
    fightDurationMs: 1_550,
  },
  epic: {
    label: 'Cá cực hiếm',
    description: 'Lực kéo dữ dội, giằng co lâu và khó kiểm soát.',
    movement: 'thrash',
    force: 1.6,
    reelSpeed: 0.68,
    tireRate: 0.78,
    fightCycleMs: 3_800,
    fightDurationMs: 1_750,
  },
  legendary: {
    label: 'Cá huyền thoại',
    description: 'Vùng vẫy liên tục, rất khó kiểm soát.',
    movement: 'thrash',
    force: 1.85,
    reelSpeed: 0.62,
    tireRate: 0.7,
    fightCycleMs: 3_500,
    fightDurationMs: 2_000,
  },
}

export function getFishFightProfile(rarity: FishRarity, skillLevel = 1): FishFightProfile {
  const skillBonus = Math.min(9, Math.max(0, Math.floor(skillLevel) - 1))
  const profile = fishFightProfiles[rarity]
  return {
    ...profile,
    force: profile.force * (1 - skillBonus * 0.025),
    reelSpeed: profile.reelSpeed * (1 + skillBonus * 0.025),
    tireRate: profile.tireRate * (1 + skillBonus * 0.04),
  }
}

export function getFishingSkillCastPower(castPower: number, skillLevel: number): number {
  const skillBonus = Math.min(18, Math.max(0, Math.floor(skillLevel) - 1) * 2)
  return Math.min(100, Math.max(0, castPower) + skillBonus)
}

export const fishingZoneNames: Readonly<Record<string, string>> = {
  coastal_water: 'Ven bờ & rạn san hô',
  open_ocean: 'Ngoài khơi',
  shipwreck_zone: 'Vùng xác tàu',
}

export const fishingZoneDefinitions = [
  {
    id: 'coastal_water',
    name: fishingZoneNames.coastal_water,
    image: '/assets/fishing/locations/coast.jpg',
    description: 'Bờ cát nông và rạn san hô quanh Đảo Mầm Xanh.',
  },
  {
    id: 'open_ocean',
    name: fishingZoneNames.open_ocean,
    image: '/assets/fishing/locations/open-ocean.jpg',
    description: 'Vùng biển sâu ngoài khơi Đảo Rừng Dạt.',
  },
  {
    id: 'shipwreck_zone',
    name: fishingZoneNames.shipwreck_zone,
    image: '/assets/fishing/locations/shipwreck.jpg',
    description: 'Khu vực xác tàu cổ quanh Tàn Tích San Hô.',
  },
] as const

const rarityFactor: Readonly<Record<FishRarity, number>> = {
  common: 0,
  uncommon: 0.2,
  unusual: 0.4,
  rare: 0.6,
  very_rare: 0.9,
  epic: 1.2,
  legendary: 1.5,
}

const rarityOrder = fishRarities

export const fishingActivity = {
  id: 'shore-fishing',
  durationSeconds: 60,
  staminaCost: 12,
  baseYield: 1,
} as const

export const fishDefinitions = fishCatalog

export { getFishingLootAvailableAt }

export interface FishingCatch {
  itemId: FishItemId | FishingLootEntry['itemId']
  kind: 'fish' | FishingLootKind
}

export interface FishMeasurement {
  lengthCm: number
  weightKg: number
}

const fishLengthRanges: Readonly<Record<FishRarity, readonly [number, number]>> = {
  common: [8, 24],
  uncommon: [14, 45],
  unusual: [20, 80],
  rare: [35, 180],
  very_rare: [50, 300],
  epic: [80, 600],
  legendary: [100, 1_200],
}

function clampRandomValue(value: number): number {
  return Math.max(0, Math.min(0.999_999_999, value))
}

export function rollFishMeasurement(
  fish: FishDefinition,
  lengthRoll: number,
  weightRoll: number,
): FishMeasurement {
  const [minimumLength, maximumLength] = fishLengthRanges[fish.rarity]
  const lengthCm = Math.round(minimumLength + (maximumLength - minimumLength) * clampRandomValue(lengthRoll))
  const weightVariation = 0.9 + clampRandomValue(weightRoll) * 0.2
  const weightKg = Math.max(0.01, Math.round(lengthCm ** 3 * 0.000_015 * weightVariation * 100) / 100)
  return { lengthCm, weightKg }
}

function rollLoot(loot: FishingLootEntry[], kind: FishingLootKind, randomValue: number): FishingLootEntry | undefined {
  const eligible = loot.filter((item) => item.kind === kind)
  const totalWeight = eligible.reduce((total, item) => total + item.weight, 0)
  if (totalWeight === 0) return undefined

  let ticket = Math.max(0, Math.min(0.999_999_999, randomValue)) * totalWeight
  for (const item of eligible) {
    ticket -= item.weight
    if (ticket < 0) return item
  }
  return eligible.at(-1)
}

export function rollFishingCatch(
  fish: FishDefinition[],
  loot: FishingLootEntry[],
  outcomeRoll: number,
  itemRoll: number,
  castPower = 0,
): FishingCatch | undefined {
  const outcome = Math.max(0, Math.min(0.999_999_999, outcomeRoll))
  if (outcome < 0.75 && fish.length > 0) {
    const itemId = rollFishCatch(fish, itemRoll, castPower)
    return itemId ? { itemId, kind: 'fish' } : undefined
  }
  if (outcome < 0.93) {
    const item = rollLoot(loot, 'trash', itemRoll)
    if (item) return { itemId: item.itemId, kind: item.kind }
  }
  const treasure = rollLoot(loot, 'treasure', itemRoll)
  if (treasure) return { itemId: treasure.itemId, kind: treasure.kind }
  const fishFallback = rollFishCatch(fish, itemRoll, castPower)
  return fishFallback ? { itemId: fishFallback, kind: 'fish' } : undefined
}

export function getFishRarityChances(
  fish: FishDefinition[],
  castPower = 0,
): { rarity: FishRarity; chance: number }[] {
  const powerBonus = Math.max(0, Math.min(100, castPower)) / 100
  const getWeight = (entry: FishDefinition) => entry.weight * (1 + powerBonus * rarityFactor[entry.rarity])
  const totalWeight = fish.reduce((total, entry) => total + getWeight(entry), 0)
  if (totalWeight === 0) return []

  return rarityOrder.map((rarity) => ({
    rarity,
    chance: fish.filter((entry) => entry.rarity === rarity)
      .reduce((total, entry) => total + getWeight(entry), 0) / totalWeight * 100,
  }))
}

export function getFishAvailableAt(biomeId: BiomeId, weatherId?: string, oceanZoneId?: string): FishDefinition[] {
  return fishDefinitions.filter((fish) => fish.biomes.includes(biomeId)
    && (!oceanZoneId || fish.oceanZones.includes(oceanZoneId))
    && (!fish.weatherIds || fish.weatherIds.includes(weatherId ?? '')))
}

export function rollFishCatch(fish: FishDefinition[], randomValue: number, castPower = 0): FishItemId | undefined {
  if (fish.length === 0) return undefined
  const powerBonus = Math.max(0, Math.min(100, castPower)) / 100
  const getWeight = (entry: FishDefinition) => entry.weight * (1 + powerBonus * rarityFactor[entry.rarity])
  const totalWeight = fish.reduce((total, entry) => total + getWeight(entry), 0)
  let ticket = Math.max(0, Math.min(0.999_999_999, randomValue)) * totalWeight
  for (const entry of fish) {
    ticket -= getWeight(entry)
    if (ticket < 0) return entry.itemId
  }
  return fish.at(-1)?.itemId
}
