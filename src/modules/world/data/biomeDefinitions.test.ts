import { describe, expect, it } from 'vitest'
import { biomeDefinitions, getBiomeResources, isBiomeId } from './biomeDefinitions'
import { islandDefinitions } from './worldDefinitions'
import { oceanZoneDefinitions } from './oceanZoneDefinitions'

describe('world and biome database', () => {
  it('defines all 12 biomes and assigns every island a valid biome and ocean zone', () => {
    expect(biomeDefinitions).toHaveLength(12)
    expect(new Set(biomeDefinitions.map((biome) => biome.id)).size).toBe(12)
    for (const island of islandDefinitions) {
      expect(isBiomeId(island.biomeId)).toBe(true)
      expect(oceanZoneDefinitions.some((zone) => zone.id === island.oceanZoneId)).toBe(true)
    }
  })

  it('maps starting tropical island resources to the approved starter biome', () => {
    const ids = getBiomeResources('tropical_island').map((resource) => resource.id)

    expect(ids).toEqual(expect.arrayContaining(['driftwood', 'pebble', 'wild_fruit', 'wood_soft', 'palm_leaf', 'small_fish']))
  })
})
