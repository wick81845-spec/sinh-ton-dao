import { describe, expect, it } from 'vitest'
import { fishCatalog, fishRarities } from '../../../data/items/fishCatalog'
import { getFishingLootAvailableAt } from '../../../data/items/fishingLootCatalog'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { legacyFishItemIds } from '../../../shared/types/game'
import { getMarketListing } from '../../economy/data/marketDefinitions'
import {
  getFishAvailableAt,
  getFishFightProfile,
  getFishRarityChances,
  getFishingSkillCastPower,
  rollFishMeasurement,
  rollFishCatch,
  rollFishingCatch,
} from './fishingConfig'

describe('fishingConfig', () => {
  it('defines exactly 70 unique fish with ten in each rarity tier', () => {
    expect(fishCatalog).toHaveLength(70)
    expect(new Set(fishCatalog.map((fish) => fish.itemId)).size).toBe(70)
    for (const rarity of ['common', 'uncommon', 'unusual', 'rare', 'very_rare', 'epic', 'legendary']) {
      expect(fishCatalog.filter((fish) => fish.rarity === rarity)).toHaveLength(10)
    }
  })

  it('registers individual artwork for every current species while keeping legendary species collectible only', () => {
    for (const fish of fishCatalog) {
      expect(itemDefinitions[fish.itemId].image).toMatch(/^\/assets\/fish\/.+\.png$/)
      expect(itemDefinitions[fish.itemId].tradable).toBe(fish.rarity !== 'legendary')
      if (fish.rarity === 'legendary') expect(itemDefinitions[fish.itemId].usable).toBe(false)
    }
    for (const fish of fishCatalog.filter((entry) => entry.rarity === 'legendary')) {
      for (const islandId of ['island_001', 'island_002', 'island_003']) {
        expect(getMarketListing(fish.itemId, islandId)).toBeUndefined()
      }
    }
  })

  it('uses the uploaded illustrations for every fishing loot item', () => {
    const loot = ['coastal_water', 'open_ocean', 'shipwreck_zone']
      .flatMap((zone) => getFishingLootAvailableAt(zone))

    expect(new Set(loot.map((item) => item.itemId)).size).toBe(16)
    for (const item of loot) {
      expect(itemDefinitions[item.itemId].image).toBe(item.image)
      expect(item.image).toMatch(/^\/assets\/fishing\/loot\/(trash|treasure)\/.+\.png$/)
    }
  })

  it('keeps archived fish IDs valid for existing saves without including them in the new catalog', () => {
    const archivedIds = new Set<string>(legacyFishItemIds)

    expect(fishCatalog.some((fish) => archivedIds.has(fish.itemId))).toBe(false)
    for (const itemId of legacyFishItemIds) expect(itemDefinitions[itemId]).toBeDefined()
  })

  it('limits catches by biome and ocean zone', () => {
    const coastalFish = getFishAvailableAt('tropical_island', undefined, 'coastal_water')
    const shipwreckFish = getFishAvailableAt('ancient_island', undefined, 'shipwreck_zone')
    const calmOffshoreFish = getFishAvailableAt('tropical_island', 'calm_sea', 'open_ocean')
    const stormOffshoreFish = getFishAvailableAt('tropical_island', 'thunderstorm', 'open_ocean')

    expect(coastalFish.some((fish) => fish.itemId === 'item_damselfish')).toBe(true)
    expect(coastalFish.some((fish) => fish.itemId === 'item_leviathan')).toBe(false)
    expect(shipwreckFish.some((fish) => fish.itemId === 'item_leviathan')).toBe(true)
    expect(shipwreckFish.some((fish) => fish.itemId === 'item_anchovy')).toBe(false)
    expect(calmOffshoreFish.some((fish) => fish.itemId === 'item_yellowfin_tuna')).toBe(true)
    expect(stormOffshoreFish.some((fish) => fish.itemId === 'item_yellowfin_tuna')).toBe(false)
  })

  it('lets a stronger cast improve the chance of a legendary catch', () => {
    const testFish = [
      fishCatalog.find((fish) => fish.itemId === 'item_anchovy')!,
      fishCatalog.find((fish) => fish.itemId === 'item_leviathan')!,
    ]

    expect(rollFishCatch(testFish, 0.9998, 0)).toBe('item_anchovy')
    expect(rollFishCatch(testFish, 0.9998, 100)).toBe('item_leviathan')
  })

  it('rolls fish length and weight within rarity-based bounds', () => {
    const commonFish = fishCatalog.find((fish) => fish.rarity === 'common')!
    const legendaryFish = fishCatalog.find((fish) => fish.rarity === 'legendary')!

    expect(rollFishMeasurement(commonFish, 0, 0)).toEqual({ lengthCm: 8, weightKg: 0.01 })
    expect(rollFishMeasurement(legendaryFish, 1, 0.5)).toEqual({ lengthCm: 1_200, weightKg: 25_920 })
    expect(rollFishMeasurement(commonFish, -1, 2).lengthCm).toBe(8)
  })

  it('uses the 75/18/7 fish, trash, and treasure outcome ranges', () => {
    const fish = getFishAvailableAt('tropical_island')
    const loot = getFishingLootAvailableAt('coastal_water')

    expect(rollFishingCatch(fish, loot, 0.7499, 0.5)?.kind).toBe('fish')
    expect(rollFishingCatch(fish, loot, 0.75, 0.5)?.kind).toBe('trash')
    expect(rollFishingCatch(fish, loot, 0.93, 0.5)?.kind).toBe('treasure')
  })

  it('restricts special salvage to ocean zones where it can be found', () => {
    const coastalLoot = getFishingLootAvailableAt('coastal_water')
    const wreckLoot = getFishingLootAvailableAt('shipwreck_zone')

    expect(coastalLoot.some((item) => item.itemId === 'item_small_chest')).toBe(false)
    expect(wreckLoot.some((item) => item.itemId === 'item_small_chest')).toBe(true)
    expect(wreckLoot.some((item) => item.itemId === 'item_plastic_bag')).toBe(true)
  })

  it('makes fish fights harder with each rarity tier', () => {
    const profiles = fishRarities.map((rarity) => getFishFightProfile(rarity))

    expect(profiles.map((profile) => profile.force))
      .toEqual([...profiles.map((profile) => profile.force)].sort((a, b) => a - b))
    expect(profiles[0].label).toBe('Cá nhỏ')
    expect(profiles.at(-1)?.label).toBe('Cá huyền thoại')
    expect(profiles[0].tireRate).toBeGreaterThan(profiles.at(-1)!.tireRate)
    expect(profiles[0].fightDurationMs).toBeLessThan(profiles.at(-1)!.fightDurationMs)
  })

  it('lets gathering skill improve fishing without changing level-one balance', () => {
    const rarity = fishRarities.at(-1)!
    const novice = getFishFightProfile(rarity)
    const expert = getFishFightProfile(rarity, 10)

    expect(getFishFightProfile(rarity, 1)).toEqual(novice)
    expect(expert.force).toBeLessThan(novice.force)
    expect(expert.reelSpeed).toBeGreaterThan(novice.reelSpeed)
    expect(expert.tireRate).toBeGreaterThan(novice.tireRate)
    expect(getFishingSkillCastPower(50, 1)).toBe(50)
    expect(getFishingSkillCastPower(50, 10)).toBe(68)
    expect(getFishingSkillCastPower(95, 10)).toBe(100)
  })

  it('keeps legendary catches very rare while a strong cast improves their odds', () => {
    const fish = getFishAvailableAt('ancient_island', undefined, 'shipwreck_zone')
    const baseChance = getFishRarityChances(fish, 0).find((chance) => chance.rarity === 'legendary')?.chance ?? 0
    const strongCastChance = getFishRarityChances(fish, 100).find((chance) => chance.rarity === 'legendary')?.chance ?? 0

    expect(baseChance).toBeGreaterThan(0)
    expect(baseChance).toBeLessThan(1)
    expect(strongCastChance).toBeGreaterThan(baseChance)
    expect(strongCastChance).toBeLessThan(1)
  })
})
