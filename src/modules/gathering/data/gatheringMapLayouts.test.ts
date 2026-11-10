import { describe, expect, it } from 'vitest'
import { getResourceDefinition } from '../../../data/resources/resourceDefinitions'
import { islandDefinitions } from '../../world/data/worldDefinitions'
import { resourceNodeDefinitions } from './gatheringConfig'
import { gatheringMapLayouts, type GatheringMapPosition } from './gatheringMapLayouts'

describe('gathering map layouts', () => {
  it('defines an island-specific layout and fishing point for all 13 islands', () => {
    expect(Object.keys(gatheringMapLayouts).sort()).toEqual(islandDefinitions.map((island) => island.id).sort())

    for (const layout of Object.values(gatheringMapLayouts)) {
      expect(layout.fishing.x).toBeGreaterThanOrEqual(0)
      expect(layout.fishing.x).toBeLessThanOrEqual(100)
      expect(layout.fishing.y).toBeGreaterThanOrEqual(0)
      expect(layout.fishing.y).toBeLessThanOrEqual(100)
    }
  })

  it('places every resource node available in an island biome', () => {
    for (const island of islandDefinitions) {
      const layout = gatheringMapLayouts[island.id]
      const availableNodes = resourceNodeDefinitions.filter((node) =>
        getResourceDefinition(node.resourceId)?.sources.biomes.includes(island.biomeId))

      for (const node of availableNodes) {
        const position = layout.nodes[node.id]
        expect(position, `${node.id} on ${island.id}`).toBeDefined()
        expect(position?.x).toBeGreaterThanOrEqual(0)
        expect(position?.x).toBeLessThanOrEqual(100)
        expect(position?.y).toBeGreaterThanOrEqual(0)
        expect(position?.y).toBeLessThanOrEqual(100)
      }
    }
  })

  it('keeps map markers far enough apart to avoid covering one another', () => {
    for (const [islandId, layout] of Object.entries(gatheringMapLayouts)) {
      const positions = [
        ...Object.values(layout.nodes).filter((position): position is GatheringMapPosition => position !== undefined),
        layout.fishing,
      ]

      positions.forEach((first, firstIndex) => {
        positions.slice(firstIndex + 1).forEach((second) => {
          const separatedHorizontally = Math.abs(first.x - second.x) >= 18
          const separatedVertically = Math.abs(first.y - second.y) >= 6
          expect(
            separatedHorizontally || separatedVertically,
            `${islandId} has overlapping markers at (${first.x}, ${first.y}) and (${second.x}, ${second.y})`,
          ).toBe(true)
        })
      })
    }
  })
})
