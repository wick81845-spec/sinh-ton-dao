import { createContext } from 'react'
import type { ClothingSlot, CropId, GameSnapshot, ItemId } from '../../shared/types/game'
import type { FishProcessingItemId } from '../../modules/crafting/services/craftingService'
import type {
  MessageBottle,
  MessageBottleReportReason,
} from '../../modules/social/services/messageBottleService'
import type { SalvageContainerItemId } from '../../modules/inventory/services/salvageService'

export type GameActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

export type FishingActionResult =
  | { ok: true; message: string; itemId: ItemId }
  | { ok: false; message: string }

export type MessageBottleReadResult =
  | { ok: true; message: string; bottle: MessageBottle }
  | { ok: false; message: string }

export interface GameContextValue {
  gameState: GameSnapshot | null
  isLoading: boolean
  isAdmin: boolean
  adminError: string | null
  error: string | null
  notice: string | null
  beginTutorial(): GameActionResult
  startResting(): GameActionResult
  stopResting(): GameActionResult
  completeTutorialStep(stepId: string, grantExperience?: boolean): void
  startGathering(activityId: string): GameActionResult
  finishFishing(castPower: number, caughtItemId: ItemId): FishingActionResult
  failFishing(rodDamaged: boolean): GameActionResult
  cancelGathering(): void
  transferToStorage(itemId: ItemId, quantity: number): GameActionResult
  transferToInventory(itemId: ItemId, quantity: number): GameActionResult
  buyMarketItem(itemId: ItemId): GameActionResult
  sellMarketItem(itemId: ItemId, quantity: number): GameActionResult
  consumeItem(itemId: ItemId): GameActionResult
  filletFish(itemId: ItemId): GameActionResult
  openSalvageContainer(itemId: SalvageContainerItemId): GameActionResult
  sendMessageBottle(message: string): Promise<GameActionResult>
  readMessageBottle(): Promise<MessageBottleReadResult>
  reportMessageBottle(messageId: number, reason: MessageBottleReportReason): Promise<GameActionResult>
  discardItems(itemId: ItemId, quantity: number): GameActionResult
  repairItem(itemId: ItemId): GameActionResult
  equipBackpack(): GameActionResult
  unequipBackpack(): GameActionResult
  equipWeapon(itemId: ItemId): GameActionResult
  unequipWeapon(): GameActionResult
  equipAccessory(itemId: ItemId): GameActionResult
  unequipAccessory(): GameActionResult
  equipClothing(slot: ClothingSlot, itemId: ItemId): GameActionResult
  unequipClothing(slot: ClothingSlot): GameActionResult
  queueRecipe(recipeId: string, fishItemId?: FishProcessingItemId): GameActionResult
  researchTechnology(technologyId: string): GameActionResult
  startBuilding(definitionId: string): GameActionResult
  upgradeBuilding(buildingId: string): GameActionResult
  fuelCampfire(buildingId: string, fuelItemId: ItemId): GameActionResult
  setCampfireWarming(buildingId: string, isWarming: boolean): GameActionResult
  startDryingClothes(buildingId: string): GameActionResult
  plantCrop(buildingId: string, cropId: CropId): GameActionResult
  harvestCrop(plotId: string): GameActionResult
  raiseChicken(buildingId: string): GameActionResult
  collectEggs(buildingId: string): GameActionResult
  raiseGoat(buildingId: string): GameActionResult
  collectGoatMilk(buildingId: string): GameActionResult
  collectRainwater(buildingId: string): GameActionResult
  startExploration(taskId: string): GameActionResult
  buildShip(definitionId: string): GameActionResult
  startVoyage(destinationId: string): GameActionResult
  visitIslandAsAdmin(islandId: string): GameActionResult
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
