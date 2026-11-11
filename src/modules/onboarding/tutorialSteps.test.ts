import { describe, expect, it } from 'vitest'
import {
  completeTutorialStepInState,
  getNextTutorialStep,
  inferTutorialProgress,
  shouldShowTutorialIntro,
  tutorialSteps,
} from './tutorialSteps'
import { newPlayerGameState } from '../../data/mockGameState'
import { awardExperience } from '../progression/services/progressionService'
import { levelForExperience } from '../progression/data/progressionDefinitions'

describe('tutorialSteps', () => {
  it('guides a new player through a playable survival progression in order', () => {
    expect(tutorialSteps.map((step) => step.id)).toEqual([
      'gather-resources',
      'craft-axe',
      'build-campfire',
      'build-leaf-shelter',
      'explore-nearby-island',
      'research-basic-tools',
      'build-workbench',
      'research-island-settlement',
    ])
    expect(tutorialSteps.every((step) => step.destination.startsWith('/'))).toBe(true)
    expect(getNextTutorialStep([])?.id).toBe('gather-resources')
    expect(getNextTutorialStep(tutorialSteps.slice(0, 3).map((step) => step.id))?.id).toBe('build-leaf-shelter')
    expect(getNextTutorialStep(tutorialSteps.map((step) => step.id))).toBeNull()
  })

  it('rewards early quests with enough XP to level up and continue to exploration', () => {
    let state = newPlayerGameState
    const earlyActions = [
      { stepId: 'gather-resources', skill: 'gathering' as const, activityExperience: 1 },
      { stepId: 'craft-axe', skill: 'processing' as const, activityExperience: 10 },
      { stepId: 'build-campfire', skill: 'building' as const, activityExperience: 15 },
      { stepId: 'build-leaf-shelter', skill: 'building' as const, activityExperience: 15 },
    ]

    for (const action of earlyActions) {
      state = {
        ...state,
        character: awardExperience(state.character, action.skill, action.activityExperience),
      }
      state = completeTutorialStepInState(state, action.stepId)
    }

    expect(state.character.experience).toBe(212)
    expect(levelForExperience(state.character.experience)).toBe(2)
    expect(getNextTutorialStep(state.tutorialCompletedStepIds ?? [])?.id).toBe('explore-nearby-island')
    expect(tutorialSteps.slice(0, 4).reduce((total, step) => total + step.experienceReward, 0)).toBe(65)
  })

  it('grants each step reward only once and does not reward inferred progress', () => {
    const completed = completeTutorialStepInState(newPlayerGameState, 'gather-resources')
    expect(completed.character.experience).toBe(30)
    expect(completeTutorialStepInState(completed, 'gather-resources')).toBe(completed)

    const inferred = completeTutorialStepInState(newPlayerGameState, 'gather-resources', false)
    expect(inferred.character.experience).toBe(0)
    expect(inferred.tutorialCompletedStepIds).toEqual(['gather-resources'])
  })

  it('does not make returning players repeat tutorial steps they already progressed through', () => {
    const researchedState = {
      ...newPlayerGameState,
      character: { ...newPlayerGameState.character, researchedTechnologyIds: ['tech_basic_tools'] },
    }
    expect(inferTutorialProgress(newPlayerGameState)).toEqual([])
    expect(inferTutorialProgress(researchedState)).toEqual([
      'gather-resources',
      'craft-axe',
      'research-basic-tools',
    ])
    expect(inferTutorialProgress({
      ...newPlayerGameState,
      discoveredIslandIds: ['island_001', 'island_002'],
    })).toEqual(tutorialSteps.map((step) => step.id))
  })

  it('does not infer unfinished missions from XP earned during the new tutorial', () => {
    expect(inferTutorialProgress({
      ...newPlayerGameState,
      character: { ...newPlayerGameState.character, experience: 15 },
    })).toEqual([])
  })

  it('does not insert an extra level task and infers completed settlement objectives', () => {
    const levelTwoState = {
      ...newPlayerGameState,
      character: { ...newPlayerGameState.character, level: 2 },
    }
    expect(inferTutorialProgress(levelTwoState)).not.toContain('reach-level-two')

    const researchedSettlementState = {
      ...levelTwoState,
      character: {
        ...levelTwoState.character,
        researchedTechnologyIds: ['tech_basic_tools', 'tech_island_settlement'],
      },
    }
    expect(inferTutorialProgress(researchedSettlementState)).toEqual(tutorialSteps.map((step) => step.id))
  })

  it('shows the plane intro to new players but skips it for returning saves', () => {
    expect(shouldShowTutorialIntro(newPlayerGameState, false)).toBe(true)
    expect(shouldShowTutorialIntro({
      ...newPlayerGameState,
      tutorialIntroCompleted: undefined,
    }, true)).toBe(false)
    expect(shouldShowTutorialIntro({
      ...newPlayerGameState,
      character: { ...newPlayerGameState.character, experience: 10 },
    }, true)).toBe(false)
    expect(shouldShowTutorialIntro({
      ...newPlayerGameState,
      tutorialIntroCompleted: true,
    }, true)).toBe(false)
  })

  it('starts new players healthy with food, water, and materials for the first tools', () => {
    expect(newPlayerGameState.tutorialIntroCompleted).toBe(false)
    expect(newPlayerGameState.survival).toMatchObject({
      health: 100,
      hunger: 100,
      thirst: 100,
      stamina: 100,
    })
    expect(newPlayerGameState.inventory.slots).toContainEqual({ itemId: 'item_wild_fruit', quantity: 3 })
    expect(newPlayerGameState.inventory.slots).toContainEqual({ itemId: 'item_fresh_water', quantity: 3 })
  })
})
