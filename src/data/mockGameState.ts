import type { GameSnapshot } from '../shared/types/game'
import { initialResourceNodes } from '../modules/gathering/data/gatheringConfig'

export const initialGameState: GameSnapshot = {
  character: {
    id: 'character_001',
    name: 'Người sống sót',
    level: 1,
    experience: 0,
    skillExperience: {},
    researchedTechnologyIds: [],
    coins: 25,
    homeIslandId: 'island_001',
    currentLocationId: 'island_001',
    status: 'alive',
    createdAt: '2026-11-05T00:00:00.000Z',
    updatedAt: '2026-11-08T00:00:00.000Z',
  },
  survival: {
    health: 100,
    hunger: 82,
    thirst: 74,
    stamina: 91,
    temperature: 28,
    conditions: [],
  },
  inventory: {
    ownerId: 'character_001',
    slots: [
      { itemId: 'item_wood', quantity: 12 },
      { itemId: 'item_stone', quantity: 8 },
      { itemId: 'item_wild_fruit', quantity: 5 },
    ],
    maxSlots: 24,
  },
  storage: {
    ownerId: 'island_001',
    slots: [],
    maxSlots: 40,
  },
  resourceNodes: initialResourceNodes,
  activeGathering: null,
  craftingQueue: [],
  buildings: [],
  constructionQueue: [],
  discoveredIslandIds: ['island_001'],
  activeExploration: null,
  explorationLog: [],
  worldEventLog: [],
  ships: [],
  shipConstruction: null,
  voyages: [],
  friendIds: [],
  socialPlayerInventories: [
    { playerId: 'player_sora', slots: [{ itemId: 'item_wood', quantity: 6 }, { itemId: 'item_stone', quantity: 4 }, { itemId: 'item_wild_fruit', quantity: 4 }] },
    { playerId: 'player_mina', slots: [{ itemId: 'item_wood', quantity: 3 }, { itemId: 'item_stone', quantity: 10 }, { itemId: 'item_wild_fruit', quantity: 2 }] },
  ],
  tradeOffers: [],
  activeCombat: null,
  combatLog: [],
}

export const newPlayerGameState: GameSnapshot = {
  ...initialGameState,
  survival: {
    health: 100,
    hunger: 100,
    thirst: 100,
    stamina: 100,
    temperature: 28,
    conditions: [],
  },
  inventory: {
    ...initialGameState.inventory,
    slots: [
      { itemId: 'item_wood', quantity: 4 },
      { itemId: 'item_stone', quantity: 5 },
      { itemId: 'item_branch', quantity: 3 },
      { itemId: 'item_palm_leaf', quantity: 4 },
      { itemId: 'item_plant_fiber', quantity: 2 },
      { itemId: 'item_wild_fruit', quantity: 3 },
      { itemId: 'item_fresh_water', quantity: 3 },
    ],
  },
  tutorialCompletedStepIds: [],
  tutorialIntroCompleted: false,
}
