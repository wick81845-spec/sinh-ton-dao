import { describe, expect, it } from 'vitest'
import { foodWebLinks, speciesDefinitions } from './ecologyDefinitions'

describe('ecology database', () => {
  it('uses unique species IDs and provides habitat, population and conservation data', () => {
    const ids = speciesDefinitions.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(speciesDefinitions.some((entry) => entry.role === 'flora')).toBe(true)
    expect(speciesDefinitions.some((entry) => entry.protected)).toBe(true)

    for (const entry of speciesDefinitions) {
      expect(entry.habitats.length).toBeGreaterThan(0)
      expect(entry.reproductionDays).toBeGreaterThan(0)
      expect(entry.populationCap).toBeGreaterThan(0)
    }
  })

  it('links food web relations to defined species or documented producers', () => {
    const ids = new Set(speciesDefinitions.map((entry) => entry.id))
    const producers = new Set(['plant', 'wild_fruit', 'kelp'])
    for (const link of foodWebLinks) {
      expect(ids.has(link.from) || producers.has(link.from)).toBe(true)
      expect(ids.has(link.to)).toBe(true)
    }
  })
})
