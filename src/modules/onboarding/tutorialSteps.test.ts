import { describe, expect, it } from 'vitest'
import { getNextTutorialStep, inferTutorialProgress, tutorialSteps } from './tutorialSteps'
import { newPlayerGameState } from '../../data/mockGameState'

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
    ])
    expect(tutorialSteps.every((step) => step.destination.startsWith('/'))).toBe(true)
    expect(getNextTutorialStep([])?.id).toBe('gather-resources')
    expect(getNextTutorialStep(tutorialSteps.slice(0, 3).map((step) => step.id))?.id).toBe('build-leaf-shelter')
    expect(getNextTutorialStep(tutorialSteps.map((step) => step.id))).toBeNull()
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
