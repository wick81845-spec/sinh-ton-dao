import { describe, expect, it } from 'vitest'
import { biomeDefinitions, getBiomeResources, isBiomeId } from './biomeDefinitions'
import { islandDefinitions, worldLocations } from './worldDefinitions'
import { oceanZoneDefinitions } from './oceanZoneDefinitions'

describe('world and biome database', () => {
  it('defines all 12 biomes and assigns every island a valid biome and ocean zone', () => {
    expect(biomeDefinitions).toHaveLength(12)
    expect(new Set(biomeDefinitions.map((biome) => biome.id)).size).toBe(12)
    expect(islandDefinitions).toHaveLength(12)
    expect(new Set(islandDefinitions.map((island) => island.id)).size).toBe(12)
    expect(new Set(islandDefinitions.map((island) => island.biomeId)).size).toBe(12)
    expect(new Set(islandDefinitions.map((island) => island.artwork)).size).toBe(12)
    expect(worldLocations).toHaveLength(12)
    for (const island of islandDefinitions) {
      expect(isBiomeId(island.biomeId)).toBe(true)
      expect(oceanZoneDefinitions.some((zone) => zone.id === island.oceanZoneId)).toBe(true)
      expect(worldLocations.some((location) => location.islandId === island.id)).toBe(true)
    }
    for (const biome of biomeDefinitions) {
      expect(biome.freshwaterSources.length).toBeGreaterThan(0)
      expect(biome.foodSources.length).toBeGreaterThan(0)
      expect(biome.regenerationNotes.length).toBeGreaterThan(0)
      expect(getBiomeResources(biome.id).length).toBeGreaterThan(0)
    }
  })

  it('maps starting tropical island resources to the approved starter biome', () => {
    const ids = getBiomeResources('tropical_island').map((resource) => resource.id)

    expect(ids).toEqual(expect.arrayContaining(['driftwood', 'pebble', 'wild_fruit', 'wood_soft', 'palm_leaf', 'small_fish']))
  })
})
