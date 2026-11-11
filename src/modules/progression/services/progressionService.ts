import type { Character, SkillId } from '../../../shared/types/game'
import { levelForExperience } from '../data/progressionDefinitions'

export const experienceRewardMultiplier = 2

export function awardExperience(character: Character, skill: SkillId, amount: number): Character {
  if (!Number.isInteger(amount) || amount <= 0) return character
  const awardedExperience = amount * experienceRewardMultiplier
  const experience = character.experience + awardedExperience
  const skillExperience = character.skillExperience ?? {}
  return {
    ...character,
    experience,
    level: levelForExperience(experience),
    skillExperience: {
      ...skillExperience,
      [skill]: (skillExperience[skill] ?? 0) + awardedExperience,
    },
  }
}
