import { createContext } from 'react'
import type { GameSnapshot, ItemId } from '../../shared/types/game'

export type GameActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

export type FishingActionResult =
  | { ok: true; message: string; itemId: ItemId }
  | { ok: false; message: string }

export interface GameContextValue {
  gameState: GameSnapshot | null
  isLoading: boolean
  error: string | null
  notice: string | null
  beginTutorial(): GameActionResult
  startResting(): GameActionResult
  stopResting(): GameActionResult
  completeTutorialStep(stepId: string): void
  startGathering(activityId: string): GameActionResult
  finishFishing(castPower: number, caughtItemId: ItemId): FishingActionResult
  cancelGathering(): void
  transferToStorage(itemId: ItemId, quantity: number): GameActionResult
  transferToInventory(itemId: ItemId, quantity: number): GameActionResult
  buyMarketItem(itemId: ItemId): GameActionResult
  sellMarketItem(itemId: ItemId, quantity: number): GameActionResult
  consumeItem(itemId: ItemId): GameActionResult
  queueRecipe(recipeId: string): GameActionResult
  researchTechnology(technologyId: string): GameActionResult
  startBuilding(definitionId: string): GameActionResult
  upgradeBuilding(buildingId: string): GameActionResult
  startExploration(taskId: string): GameActionResult
  buildShip(definitionId: string): GameActionResult
  startVoyage(destinationId: string): GameActionResult
  addFriend(playerId: string): GameActionResult
  visitPlayerIsland(playerId: string): GameActionResult
  returnHomeIsland(): GameActionResult
  proposeTrade(
    playerId: string,
    offeredItemId: ItemId,
    offeredQuantity: number,
    requestedItemId: ItemId,
    requestedQuantity: number,
  ): GameActionResult
  resolveTrade(offerId: string, accepted: boolean): GameActionResult
  startCombat(encounterId: string): GameActionResult
  attackCombat(): GameActionResult
  retreatCombat(): GameActionResult
  respawnCharacter(): GameActionResult
  resolveRandomWorldEvent(recordId: string, choiceId: string): GameActionResult
  clearNotice(): void
}

export const GameContext = createContext<GameContextValue | null>(null)
