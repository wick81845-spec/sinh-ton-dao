import { describe, expect, it } from 'vitest'
import { itemDefinitions } from '../items/itemDefinitions'
import { resourceDefinitions, resourceDefinitionsById } from './resourceDefinitions'

describe('resourceDefinitions', () => {
  it('uses stable unique IDs and links every resource to an inventory item and artwork', () => {
    const ids = resourceDefinitions.map((resource) => resource.id)

    expect(new Set(ids).size).toBe(ids.length)
    for (const resource of resourceDefinitions) {
      expect(resourceDefinitionsById[resource.id]).toBe(resource)
      expect(resource.image).toMatch(/^\/assets\/resources\/.+\.(?:png|svg)$/)
      const expectedImage = resource.id === 'small_fish' || resource.id === 'large_fish'
        ? '/assets/resources/marine-life.svg'
        : resource.id === 'fresh_water'
          ? '/assets/resources/marine-life.svg'
          : resource.id === 'rotten_wood'
            ? '/assets/resources/driftwood.png'
            : `/assets/resources/${resource.id.replaceAll('_', '-')}.png`
      expect(resource.image).toBe(expectedImage)
      if (resource.inventoryItemId !== null) {
        expect(itemDefinitions[resource.inventoryItemId]).toBeDefined()
      }
      expect(resource.harvesting.baseYield[0]).toBeGreaterThan(0)
      expect(resource.harvesting.baseYield[1]).toBeGreaterThanOrEqual(resource.harvesting.baseYield[0])
      expect(resource.stackLimit).toBeGreaterThan(0)
      if (resource.inventoryItemId === null) {
        expect(resource.processing.length).toBeGreaterThan(0)
        expect(resource.uses.length).toBeGreaterThan(0)
      }
    }
  })

  it('sets stamina costs according to the effort required for gathering', () => {
    expect(resourceDefinitionsById.driftwood.harvesting.staminaCost).toBe(8)
    expect(resourceDefinitionsById.wild_fruit.harvesting.staminaCost).toBe(5)
    expect(resourceDefinitionsById.wood_soft.harvesting.staminaCost).toBe(18)
    expect(resourceDefinitionsById.small_fish.harvesting.staminaCost).toBe(12)
    expect(resourceDefinitionsById.rough_stone.harvesting.staminaCost).toBe(16)
    expect(resourceDefinitions.every((resource) => resource.harvesting.staminaCost >= 5)).toBe(true)
  })
})
