import { describe, expect, it } from 'vitest'
import { initialGameState } from '../../../data/mockGameState'
import { characterLevelTitle } from '../data/progressionDefinitions'
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

  it('assigns readable rank titles to character levels', () => {
    expect(characterLevelTitle(1)).toBe('Tân thủ')
    expect(characterLevelTitle(5)).toBe('Người khai phá')
    expect(characterLevelTitle(10)).toBe('Người khai đảo')
    expect(characterLevelTitle(20)).toBe('Người khai đảo')
    expect(characterLevelTitle(0)).toBe('Tân thủ')
    expect(characterLevelTitle(Number.NaN)).toBe('Tân thủ')
  })
})
