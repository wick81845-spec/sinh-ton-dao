import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { awardExperience } from './progressionService'

describe('progressionService', () => {
  it('awards skill and character experience and advances a level', () => {
    const character = awardExperience(initialGameState.character, 'gathering', 100)

    expect(character).toMatchObject({
      experience: 100,
      level: 2,
      skillExperience: { gathering: 100 },
    })
  })

  it('ignores invalid experience awards', () => {
    expect(awardExperience(initialGameState.character, 'combat', 0)).toBe(initialGameState.character)
    expect(awardExperience(initialGameState.character, 'combat', -10)).toBe(initialGameState.character)
  })
})
