import { describe, expect, it } from 'vitest'
import { fishCatalog, fishRarities } from '../../../data/items/fishCatalog'
import { getFishingLootAvailableAt } from '../../../data/items/fishingLootCatalog'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { fishItemIds } from '../../../shared/types/fish'
import { getMarketListing } from '../../economy/data/marketDefinitions'
import { islandDefinitions } from '../../world/data/worldDefinitions'
import {
  getFishAvailableAt,
  getFishFightProfile,
  getFishRarityChances,
  getSpearFishAvailableAt,
  getFishingSkillCastPower,
  rollFishMeasurement,
  rollFishCatch,
  rollFishingCatch,
} from './fishingConfig'

describe('fishingConfig', () => {
  it('defines exactly 89 unique fish across every rarity tier', () => {
    expect(fishCatalog).toHaveLength(89)
    expect(new Set(fishCatalog.map((fish) => fish.itemId)).size).toBe(89)
    for (const rarity of ['common', 'uncommon', 'unusual', 'rare', 'very_rare', 'epic', 'legendary']) {
      expect(fishCatalog.some((fish) => fish.rarity === rarity)).toBe(true)
    }
    expect(fishItemIds).toHaveLength(89)
  })

  it('uses the shared fish placeholder and keeps legendary species collectible only', () => {
    for (const fish of fishCatalog) {
      expect(itemDefinitions[fish.itemId].image).toBe('/assets/resources/fresh-fish.svg')
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
      if (item.itemId !== 'item_wood') {
        expect(itemDefinitions[item.itemId].image).toBe(item.image)
      }
      expect(item.image).toMatch(/^\/assets\/fishing\/loot\/(trash|treasure)\/.+\.png$/)
    }
    expect(itemDefinitions.item_wood.name).toBe('Gỗ trôi dạt')
    expect(Object.keys(itemDefinitions)).not.toContain('item_driftwood')
  })

  it('registers only the new fish species as individual inventory items', () => {
    expect(fishCatalog.map((fish) => fish.itemId).sort()).toEqual([...fishItemIds].sort())
    for (const itemId of fishItemIds) expect(itemDefinitions[itemId]).toBeDefined()
    expect(Object.keys(itemDefinitions)).not.toContain('item_leviathan')
  })

  it('limits catches by biome and ocean zone', () => {
    const coastalFish = getFishAvailableAt('tropical_island', undefined, 'coastal_water')
    const coralFish = getFishAvailableAt('coral_island', undefined, 'coral_sea')
    const desertCoastFish = getFishAvailableAt('desert_island', undefined, 'coastal_water')
    const shipwreckFish = getFishAvailableAt('ancient_island', undefined, 'shipwreck_zone')
    const calmOffshoreFish = getFishAvailableAt('tropical_island', 'calm_sea', 'open_ocean')
    const stormOffshoreFish = getFishAvailableAt('tropical_island', 'thunderstorm', 'open_ocean')

    expect(coastalFish.some((fish) => fish.itemId === 'item_damselfish')).toBe(false)
    expect(coralFish.some((fish) => fish.itemId === 'item_damselfish')).toBe(false)
    expect(desertCoastFish.length).toBeGreaterThan(0)
    expect(coastalFish.some((fish) => fish.itemId === 'item_conger_eel')).toBe(false)
    expect(shipwreckFish.some((fish) => fish.itemId === 'item_conger_eel')).toBe(true)
    expect(shipwreckFish.some((fish) => fish.itemId === 'item_anchovy')).toBe(false)
    expect(calmOffshoreFish.some((fish) => fish.itemId === 'item_yellowfin_tuna')).toBe(true)
    expect(stormOffshoreFish.some((fish) => fish.itemId === 'item_yellowfin_tuna')).toBe(false)
  })

  it('limits spear fishing to common and uncommon coastal and reef fish', () => {
    const coastalFish = getSpearFishAvailableAt('tropical_island', undefined, 'coastal_water')
    const reefFish = getSpearFishAvailableAt('coral_island', undefined, 'coral_sea')
    const offshoreFish = getSpearFishAvailableAt('tropical_island', undefined, 'open_ocean')

    expect(coastalFish.length).toBeGreaterThan(0)
    expect(reefFish.length).toBeGreaterThan(0)
    expect([...coastalFish, ...reefFish].every((fish) => ['common', 'uncommon'].includes(fish.rarity))).toBe(true)
    expect(offshoreFish).toEqual([])
  })

  it('keeps fishing available in each of the 12 island sea regions', () => {
    for (const island of islandDefinitions) {
      expect(getFishAvailableAt(island.biomeId, undefined, island.oceanZoneId).length)
        .toBeGreaterThan(0)
    }
  })

  it('lets a stronger cast improve the chance of a legendary catch', () => {
    const testFish = [
      fishCatalog.find((fish) => fish.itemId === 'item_anchovy')!,
      fishCatalog.find((fish) => fish.rarity === 'legendary')!,
    ]

    expect(rollFishCatch(testFish, 0.9998, 0)).toBe('item_anchovy')
    expect(rollFishCatch(testFish, 0.9998, 100)).toBe(testFish[1].itemId)
  })

  it('rolls species-specific fish measurements within realistic weight ranges', () => {
    const anchovy = fishCatalog.find((fish) => fish.itemId === 'item_anchovy')!
    const bluefinTuna = fishCatalog.find((fish) => fish.itemId === 'item_bluefin_tuna')!

    expect(rollFishMeasurement(anchovy, 0, 0)).toEqual({ lengthCm: 5, weightKg: 0.01 })
    expect(rollFishMeasurement(bluefinTuna, 1, 0.5)).toEqual({ lengthCm: 450, weightKg: 500 })
    expect(rollFishMeasurement(anchovy, -1, 2).lengthCm).toBe(5)
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
