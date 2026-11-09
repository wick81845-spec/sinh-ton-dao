import { describe, expect, it } from 'vitest'
import { craftingConceptGroups } from './craftingConceptCatalog'

describe('craftingConceptGroups', () => {
  it('keeps every provided concept image uniquely cataloged', () => {
    const items = craftingConceptGroups.flatMap((group) => group.items)
    const ids = items.map((item) => item.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(items).toHaveLength(122)
    for (const item of items) {
      expect(item.image).toBe(`/assets/crafting/${item.id}.png`)
    }
  })
})
