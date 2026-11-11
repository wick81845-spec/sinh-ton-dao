import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { newPlayerGameState } from '../../data/mockGameState'
import { itemDefinitions } from '../../data/items/itemDefinitions'
import { completeConstructions, getShelterRestBonusMultiplier, startConstruction, upgradeBuilding } from '../../modules/building/services/buildingService'
import {
  advanceCampfireFuel,
  fuelCampfire as addCampfireFuel,
  setCampfireWarming as updateCampfireWarming,
} from '../../modules/building/services/campfireService'
import { advanceClothesDrying, startClothesDrying } from '../../modules/building/services/clothesDryingService'
import { harvestCrop as harvestFarmCrop, plantCrop as plantFarmCrop } from '../../modules/building/services/farmService'
import {
  collectEggs as collectChickenEggs,
  collectGoatMilk as collectLivestockMilk,
  raiseChicken as raiseFarmChicken,
  raiseGoat as raiseFarmGoat,
} from '../../modules/building/services/livestockService'
import { advanceRainCollection, collectRainwater as collectCollectedRainwater } from '../../modules/building/services/waterCollectionService'
import { attackCombat as resolveCombatTurn, retreatCombat as retreatFromCombat, respawnCharacter as respawn, startCombat } from '../../modules/combat/services/combatService'
import { completeCrafting, queueRecipe } from '../../modules/crafting/services/craftingService'
import type { FishProcessingItemId } from '../../modules/crafting/services/craftingService'
import { completeExploration, startExploration } from '../../modules/exploration/services/explorationService'
import { cancelGathering, completeGathering, ensureResourceNodeStates, failFishing as failFishingGathering, refreshResourceNodes, startGathering } from '../../modules/gathering/services/gatheringService'
import { isFishingActivityId } from '../../modules/gathering/data/fishingConfig'
import {
  consumeItem,
  discardItems,
  equipAccessory,
  equipBackpack,
  equipWeapon,
  isInventoryOverloaded,
  initializeFoodFreshness,
  removeItems,
  repairItem,
  spoilExpiredFood,
  transferItems,
  unequipAccessory,
  unequipBackpack,
  unequipWeapon,
} from '../../modules/inventory/services/inventoryService'
import { openSalvageContainer } from '../../modules/inventory/services/salvageService'
import {
  readMessageBottle as fetchMessageBottle,
  reportMessageBottle as reportOnlineMessageBottle,
  sendMessageBottle as sendOnlineMessageBottle,
} from '../../modules/social/services/messageBottleService'
import { buyMarketItem as buyMarket, sellMarketItem as sellMarket } from '../../modules/economy/services/marketService'
import { addFriend as addSocialFriend, proposeTrade as createTradeOffer, resolveTrade as resolveSocialTrade, returnToHomeIsland, visitPlayerIsland as visitIsland } from '../../modules/social/services/socialService'
import { completeShipConstruction, startShipConstruction } from '../../modules/ship/services/shipService'
import { advanceSurvival, isSurvivorBusy, isSurvivorResting } from '../../modules/survival/utils/survivalCalculator'
import { advanceAilments } from '../../modules/survival/services/ailmentService'
import { advanceBodyExposure } from '../../modules/survival/services/bodyExposureService'
import { survivalConfig } from '../../modules/survival/data/survivalConfig'
import { researchTechnology as researchTech } from '../../modules/progression/services/technologyService'
import { applyAdminCommand } from '../../modules/settings/services/adminCommandService'
import { advanceWeather, createWeatherState } from '../../modules/world/services/weatherService'
import { visitIslandAsAdmin as visitIslandForAdmin } from '../../modules/world/services/adminExplorationService'
import { getWeatherDefinition } from '../../modules/world/data/weatherDefinitions'
import { getWorldClock, getWorldSeason, getWorldWeatherAtTime } from '../../modules/world/services/worldClock'
import { randomWorldEventDefinitions } from '../../modules/world/data/randomWorldEventDefinitions'
import {
  advanceRandomWorldEvents,
  RANDOM_WORLD_EVENT_INTERVAL_MS,
  resolveRandomWorldEvent as resolveRandomEvent,
} from '../../modules/world/services/randomWorldEventService'
import { advanceVoyages, startVoyage } from '../../modules/voyage/services/voyageService'
import {
  completeTutorialStepInState,
  shouldShowTutorialIntro,
} from '../../modules/onboarding/tutorialSteps'
import type { CropId, GameSnapshot, ItemId } from '../../shared/types/game'
import { gameClock } from '../../services/clock/gameClock'
import { gameEventBus } from '../../services/events/gameEvents'
import { createGameSaveService } from '../../services/persistence/gameSaveService'
import { isRemoteGameSaveConfigured, loadRemoteGameState, saveRemoteGameState } from '../../services/persistence/remoteGameSaveClient'
import {
  acknowledgeAdminCommand,
  loadPendingAdminCommands,
  loadRemoteWorldSettings,
} from '../../services/persistence/remoteAdminControlClient'
import { localStorageAdapter } from '../../services/storage/localStorageAdapter'
import { GameContext, type FishingActionResult, type GameActionResult } from './gameContext'
import { useAuth } from './useAuth'

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

function clearUncarriedAccessory(state: GameSnapshot): GameSnapshot {
  const accessoryId = state.equippedAccessoryId
  if (!accessoryId || state.inventory.slots.some((slot) => slot.itemId === accessoryId)) return state
  return { ...state, equippedAccessoryId: undefined }
}

function emitSurvivalChanges(previous: GameSnapshot, next: GameSnapshot): void {
  const previousConditions = new Set(previous.survival.conditions)
  const nextConditions = new Set(next.survival.conditions)

  nextConditions.forEach((condition) => {
    if (!previousConditions.has(condition)) {
      gameEventBus.emit('survival:condition-changed', { condition, active: true })
    }
  })
  previousConditions.forEach((condition) => {
    if (!nextConditions.has(condition)) {
      gameEventBus.emit('survival:condition-changed', { condition, active: false })
    }
  })

  for (const stat of ['health', 'hunger', 'thirst', 'stamina'] as const) {
    if (previous.survival[stat] !== next.survival[stat]) {
      gameEventBus.emit('survival:stat-changed', { stat, value: next.survival[stat] })
    }
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { isLoading: isAuthLoading, isAdmin, adminError, session } = useAuth()
  const playerId = session?.user.id ?? null
  const username = typeof session?.user.user_metadata.username === 'string'
    ? session.user.user_metadata.username.trim()
    : ''
  const characterName = typeof session?.user.user_metadata.display_name === 'string'
    ? session.user.user_metadata.display_name.trim()
    : username
  const homeIslandName = typeof session?.user.user_metadata.island_name === 'string'
    ? session.user.user_metadata.island_name.trim()
    : ''
  const characterAppearance = session?.user.user_metadata.character_appearance === 'female' ? 'female' : 'male'
  const accessTokenRef = useRef<string | null>(null)
  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null
  }, [session?.access_token])
  const gameSaveService = useMemo(
    () => createGameSaveService(localStorageAdapter, playerId ? `game.save.${playerId}` : 'game.save'),
    [playerId],
  )
  const [gameState, setGameState] = useState<GameSnapshot | null>(null)
  const [loadedPlayerId, setLoadedPlayerId] = useState<string | null>()
  const isLoading = loadedPlayerId !== playerId
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const stateRef = useRef<GameSnapshot | null>(null)
  const lastTickRef = useRef<number | null>(null)
  const cloudRevisionRef = useRef<number | null>(null)
  const saveInProgressRef = useRef(false)
  const saveRequestedRef = useRef(false)
  const forcedWeatherIdRef = useRef<string | null>(null)
  const persistedAdminCommandIdsRef = useRef(new Set<string>())

  const persistCurrentState = useCallback(async () => {
    if (saveInProgressRef.current) {
      saveRequestedRef.current = true
      return false
    }

    saveInProgressRef.current = true
    try {
      do {
        saveRequestedRef.current = false
        const currentState = stateRef.current
        if (currentState) {
          const accessToken = accessTokenRef.current
          if (playerId && accessToken && isRemoteGameSaveConfigured) {
            const expectedRevision = cloudRevisionRef.current
            if (expectedRevision === null) throw new Error('Tiến trình trên máy chủ chưa được tải.')
            const saved = await saveRemoteGameState(accessToken, currentState, expectedRevision)
            cloudRevisionRef.current = saved.revision
            await gameSaveService.save(saved.state, gameClock.now())
          } else {
            await gameSaveService.save(currentState, gameClock.now())
          }
          persistedAdminCommandIdsRef.current = new Set(currentState.appliedAdminCommandIds ?? [])
        }
      } while (saveRequestedRef.current)
      setError(null)
      return true
    } catch (saveError: unknown) {
      const message = `Không thể lưu tiến trình: ${describeError(saveError)}`
      console.error(message, saveError)
      setError(message)
      return false
    } finally {
      saveInProgressRef.current = false
    }
  }, [gameSaveService, playerId])

  const commitState = useCallback((nextState: GameSnapshot, message: string) => {
    const currentState = stateRef.current
    const stateWithAccessory = clearUncarriedAccessory(nextState)
    const leftShelter = Boolean(currentState?.isResting && !message.startsWith('Bạn đã rời lều'))
    const stateToCommit = currentState && (
      isSurvivorBusy(stateWithAccessory)
      || currentState.character.currentLocationId !== stateWithAccessory.character.currentLocationId
      || stateWithAccessory.character.status !== 'alive'
      || leftShelter
    )
      ? { ...stateWithAccessory, isResting: false }
      : stateWithAccessory
    stateRef.current = stateToCommit
    setGameState(stateToCommit)
    setNotice(leftShelter
      ? `${message} Bạn đã rời lều; hiệu ứng nghỉ ngơi tại lều đã kết thúc.`
      : message)
    void persistCurrentState()
    return { ok: true, message } as const
  }, [persistCurrentState])

  const commitWorkState = useCallback((
    currentState: GameSnapshot,
    nextState: GameSnapshot,
    message: string,
  ): GameActionResult => {
    if (isInventoryOverloaded(currentState.inventory)) {
      const notice = 'Hành trang quá tải. Hãy cất hoặc vứt bớt đồ trước khi làm việc.'
      setNotice(notice)
      return { ok: false, message: notice }
    }
    return commitState(nextState, message)
  }, [commitState])

  const startResting = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.character.status !== 'alive') {
      return { ok: false, message: 'Bạn cần hồi sinh trước khi nghỉ ngơi.' }
    }
    if (isSurvivorBusy(currentState)) {
      return { ok: false, message: 'Hãy hoàn thành hoạt động hiện tại trước khi nghỉ ngơi.' }
    }
    const shelter = currentState.buildings.find((building) => (
      building.definitionId === 'building_shelter'
      && building.status === 'completed'
      && building.islandId === currentState.character.currentLocationId
    ))
    if (!shelter) {
      return { ok: false, message: 'Bạn cần dựng lều nghỉ ngơi trên đảo này trước.' }
    }
    if (currentState.survival.stamina >= 100) {
      return { ok: false, message: 'Sức lực đã đầy, bạn chưa cần nghỉ ngơi.' }
    }
    return commitState(
      { ...currentState, isResting: true },
      'Bạn bắt đầu nghỉ ngơi tại lều. Sức lực sẽ hồi phục cho đến khi bạn tiếp tục hành trình.',
    )
  }, [commitState])

  const collectRainwaterAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = collectCollectedRainwater(currentState, buildingId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const stopResting = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (!currentState.isResting) return { ok: false, message: 'Bạn hiện không nghỉ ngơi.' }
    return commitState({ ...currentState, isResting: false }, 'Bạn đã rời lều và dừng nghỉ ngơi.')
  }, [commitState])

  const beginTutorial = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.tutorialIntroCompleted) return { ok: true, message: 'Hành trình sinh tồn đã bắt đầu.' }
    return commitState(
      { ...currentState, tutorialIntroCompleted: true },
      'Bạn đã sẵn sàng. Hãy bắt đầu thu thập vật liệu quanh bãi biển.',
    )
  }, [commitState])

  const startGatheringAction = useCallback((activityId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = startGathering(currentState, activityId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const cancelGatheringAction = useCallback(() => {
    const currentState = stateRef.current
    if (!currentState?.activeGathering) return
    commitState(cancelGathering(currentState), 'Đã hủy hoạt động thu thập.')
  }, [commitState])

  const failFishingAction = useCallback((rodDamaged: boolean): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = failFishingGathering(currentState, rodDamaged)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const finishFishingAction = useCallback((castPower: number, caughtItemId: ItemId): FishingActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (!currentState.activeGathering || !isFishingActivityId(currentState.activeGathering.activityId)) {
      return { ok: false, message: 'Bạn chưa bắt đầu hoạt động đánh cá.' }
    }

    const result = completeGathering(currentState, gameClock.now(), castPower, caughtItemId)
    if (result.status !== 'completed') {
      if (result.status === 'failed') {
        stateRef.current = result.state
        setGameState(result.state)
        setNotice(result.message)
        void persistCurrentState()
        return { ok: false, message: result.message }
      }
      return { ok: false, message: 'Chưa thể kéo cá lên lúc này.' }
    }

    commitState(result.state, result.message)
    gameEventBus.emit('gathering:completed', {
      activityId: result.activityId,
      itemId: result.itemId,
      quantity: result.quantity,
      rewards: result.rewards,
    })
    return { ok: true, message: result.message, itemId: result.itemId }
  }, [commitState, persistCurrentState])

  const transferToStorage = useCallback((itemId: ItemId, quantity: number): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.character.status !== 'alive' || currentState.activeCombat
      || currentState.character.currentLocationId !== currentState.character.homeIslandId
      || currentState.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
      const message = currentState.activeCombat
        ? 'Không thể dùng kho trong khi chiến đấu.'
        : 'Kho chứa chỉ có thể sử dụng khi bạn đang ở đảo nhà và còn sống.'
      setNotice(message)
      return { ok: false, message }
    }

    const result = transferItems(currentState.inventory, currentState.storage, itemId, quantity)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(
      { ...currentState, inventory: result.source, storage: result.destination },
      `Đã cất ${quantity} vật phẩm.`,
    )
  }, [commitState])

  const transferToInventory = useCallback((itemId: ItemId, quantity: number): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.character.status !== 'alive' || currentState.activeCombat
      || currentState.character.currentLocationId !== currentState.character.homeIslandId
      || currentState.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
      const message = currentState.activeCombat
        ? 'Không thể dùng kho trong khi chiến đấu.'
        : 'Kho chứa chỉ có thể sử dụng khi bạn đang ở đảo nhà và còn sống.'
      setNotice(message)
      return { ok: false, message }
    }
    if (currentState.craftingQueue.length > 0 || currentState.activeExploration || currentState.activeGathering) {
      const message = currentState.craftingQueue.length > 0
        ? 'Hãy chờ hàng đợi chế tạo hoàn tất trước khi lấy đồ khỏi kho.'
        : currentState.activeExploration
          ? 'Hãy chờ hoạt động thám hiểm hoàn tất trước khi lấy đồ khỏi kho.'
          : 'Hãy chờ hoạt động thu thập hoàn tất trước khi lấy đồ khỏi kho.'
      setNotice(message)
      return { ok: false, message }
    }

    const result = transferItems(currentState.storage, currentState.inventory, itemId, quantity)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(
      { ...currentState, inventory: result.destination, storage: result.source },
      `Đã lấy ${quantity} vật phẩm.`,
    )
  }, [commitState])

  const consumeItemAction = useCallback((itemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.activeCombat) {
      const message = 'Không thể dùng vật phẩm trong khi chiến đấu.'
      setNotice(message)
      return { ok: false, message }
    }

    const result = consumeItem(currentState, itemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }

    gameEventBus.emit('inventory:item-used', { itemId: result.itemId, quantity: 1 })
    if (result.state.survival.hunger !== currentState.survival.hunger) {
      gameEventBus.emit('survival:stat-changed', { stat: 'hunger', value: result.state.survival.hunger })
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const openSalvageContainerAction = useCallback((itemId: Parameters<typeof openSalvageContainer>[1]): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.activeCombat) {
      const message = 'Không thể mở vật phẩm trục vớt trong khi chiến đấu.'
      setNotice(message)
      return { ok: false, message }
    }

    const result = openSalvageContainer(currentState, itemId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    const message = `Đã mở ${itemId === 'item_sunken_crate' ? 'thùng hàng chìm' : itemId === 'item_metal_box' ? 'hộp kim loại' : 'rương nhỏ'} và nhận ${result.reward.quantity} ${itemDefinitions[result.reward.itemId].name}.`
    return commitState(result.state, message)
  }, [commitState])

  const sendMessageBottleAction = useCallback(async (messageText: string): Promise<GameActionResult> => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.character.status !== 'alive') {
      return { ok: false, message: 'Bạn cần hồi sinh trước khi gửi chai thông điệp.' }
    }
    if (currentState.activeCombat) {
      return { ok: false, message: 'Không thể gửi chai thông điệp trong khi chiến đấu.' }
    }
    if (!currentState.inventory.slots.some((slot) => slot.itemId === 'item_glass_bottle')) {
      return { ok: false, message: 'Cần có một chai thủy tinh trong hành trang để gửi thông điệp.' }
    }

    try {
      await sendOnlineMessageBottle(messageText)
    } catch (sendError: unknown) {
      const message = describeError(sendError)
      setNotice(message)
      return { ok: false, message }
    }

    const latestState = stateRef.current
    if (!latestState) {
      const message = 'Thông điệp đã gửi, nhưng dữ liệu hành trang không còn sẵn sàng để trừ chai.'
      setNotice(message)
      return { ok: false, message }
    }
    const removedBottle = removeItems(latestState.inventory, 'item_glass_bottle', 1)
    if (!removedBottle.ok) {
      const message = `Thông điệp đã gửi nhưng không thể trừ chai khỏi hành trang: ${removedBottle.message}`
      setNotice(message)
      return { ok: false, message }
    }
    return commitState(
      { ...latestState, inventory: removedBottle.container },
      'Đã thả chai thông điệp xuống biển.',
    )
  }, [commitState])

  const readMessageBottleAction = useCallback(async () => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false as const, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.character.status !== 'alive') {
      return { ok: false as const, message: 'Bạn cần hồi sinh trước khi đọc chai thông điệp.' }
    }
    if (currentState.activeCombat) {
      return { ok: false as const, message: 'Không thể đọc chai thông điệp trong khi chiến đấu.' }
    }
    if (!currentState.inventory.slots.some((slot) => slot.itemId === 'item_message_bottle')) {
      return { ok: false as const, message: 'Bạn không có chai chứa thông điệp trong hành trang.' }
    }

    let bottle
    try {
      bottle = await fetchMessageBottle()
    } catch (readError: unknown) {
      const message = describeError(readError)
      setNotice(message)
      return { ok: false as const, message }
    }

    const latestState = stateRef.current
    if (!latestState) {
      const message = 'Đã đọc chai nhưng dữ liệu hành trang không còn sẵn sàng để trừ chai.'
      setNotice(message)
      return { ok: false as const, message }
    }
    const removedBottle = removeItems(latestState.inventory, 'item_message_bottle', 1)
    if (!removedBottle.ok) {
      const message = `Đã đọc thông điệp nhưng không thể trừ chai khỏi hành trang: ${removedBottle.message}`
      setNotice(message)
      return { ok: false as const, message }
    }
    commitState({ ...latestState, inventory: removedBottle.container }, 'Bạn đã đọc một thông điệp trôi dạt.')
    return { ok: true as const, message: 'Đã mở chai thông điệp.', bottle }
  }, [commitState])

  const reportMessageBottleAction = useCallback(async (
    messageId: number,
    reason: Parameters<typeof reportOnlineMessageBottle>[1],
  ): Promise<GameActionResult> => {
    try {
      await reportOnlineMessageBottle(messageId, reason)
      const message = 'Đã gửi báo cáo thông điệp.'
      setNotice(message)
      return { ok: true, message }
    } catch (reportError: unknown) {
      const message = describeError(reportError)
      setNotice(message)
      return { ok: false, message }
    }
  }, [])

  const discardItemsAction = useCallback((itemId: ItemId, quantity: number): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    if (currentState.activeCombat) {
      const message = 'Không thể vứt vật phẩm trong khi chiến đấu.'
      setNotice(message)
      return { ok: false, message }
    }
    const result = discardItems(currentState, itemId, quantity)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const repairItemAction = useCallback((itemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = repairItem(currentState, itemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const equipBackpackAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = equipBackpack(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const unequipBackpackAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = unequipBackpack(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const equipWeaponAction = useCallback((itemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = equipWeapon(currentState, itemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const unequipWeaponAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = unequipWeapon(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const equipAccessoryAction = useCallback((itemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = equipAccessory(currentState, itemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const unequipAccessoryAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = unequipAccessory(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const buyMarketItemAction = useCallback((itemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = buyMarket(currentState, itemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const sellMarketItemAction = useCallback((itemId: ItemId, quantity: number): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = sellMarket(currentState, itemId, quantity)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const queueRecipeAction = useCallback((recipeId: string, fishItemId?: FishProcessingItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = queueRecipe(currentState, recipeId, gameClock.now(), fishItemId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const startBuildingAction = useCallback((definitionId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = startConstruction(currentState, definitionId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const upgradeBuildingAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = upgradeBuilding(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const fuelCampfireAction = useCallback((buildingId: string, fuelItemId: ItemId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = addCampfireFuel(currentState, buildingId, fuelItemId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const setCampfireWarmingAction = useCallback((buildingId: string, isWarming: boolean): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = updateCampfireWarming(currentState, buildingId, gameClock.now(), isWarming)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const startDryingClothesAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = startClothesDrying(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const plantCropAction = useCallback((buildingId: string, cropId: CropId): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = plantFarmCrop(currentState, buildingId, cropId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const harvestCropAction = useCallback((plotId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = harvestFarmCrop(currentState, plotId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const raiseChickenAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = raiseFarmChicken(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const collectEggsAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = collectChickenEggs(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const raiseGoatAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = raiseFarmGoat(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const collectGoatMilkAction = useCallback((buildingId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = collectLivestockMilk(currentState, buildingId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const startExplorationAction = useCallback((taskId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = startExploration(currentState, taskId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const buildShipAction = useCallback((definitionId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = startShipConstruction(currentState, definitionId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const startVoyageAction = useCallback((destinationId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = startVoyage(currentState, destinationId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const visitIslandAsAdminAction = useCallback((islandId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }

    const result = visitIslandForAdmin(currentState, islandId, isAdmin, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    if (result.state === currentState) {
      setNotice(result.message)
      return { ok: true, message: result.message }
    }
    return commitState(result.state, result.message)
  }, [commitState, isAdmin])

  const addFriendAction = useCallback((playerId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = addSocialFriend(currentState, playerId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const visitPlayerIslandAction = useCallback((playerId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = visitIsland(currentState, playerId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const returnHomeIslandAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = returnToHomeIsland(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const proposeTradeAction = useCallback((
    playerId: string,
    offeredItemId: ItemId,
    offeredQuantity: number,
    requestedItemId: ItemId,
    requestedQuantity: number,
  ): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = createTradeOffer(
      currentState, playerId, offeredItemId, offeredQuantity, requestedItemId, requestedQuantity, gameClock.now(),
    )
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const resolveTradeAction = useCallback((offerId: string, accepted: boolean): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = resolveSocialTrade(currentState, offerId, accepted, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const startCombatAction = useCallback((encounterId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = startCombat(currentState, encounterId, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitWorkState(currentState, result.state, result.message)
  }, [commitWorkState])

  const attackCombatAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = resolveCombatTurn(currentState, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    const nextLog = result.state.combatLog.at(-1)
    if (nextLog && nextLog.id !== currentState.combatLog.at(-1)?.id) {
      gameEventBus.emit('combat:completed', { encounterId: nextLog.encounterId, outcome: nextLog.outcome })
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const retreatCombatAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = retreatFromCombat(currentState, gameClock.now())
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    const lastLog = result.state.combatLog.at(-1)
    if (lastLog) gameEventBus.emit('combat:completed', { encounterId: lastLog.encounterId, outcome: 'retreated' })
    return commitState(result.state, result.message)
  }, [commitState])

  const respawnCharacterAction = useCallback((): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = respawn(currentState)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    return commitState(result.state, result.message)
  }, [commitState])

  const clearNotice = useCallback(() => setNotice(null), [])

  const completeTutorialStep = useCallback((stepId: string, grantExperience = true) => {
    const currentState = stateRef.current
    if (!currentState) return
    const nextState = completeTutorialStepInState(currentState, stepId, grantExperience)
    if (nextState === currentState) return
    stateRef.current = nextState
    setGameState(nextState)
    void persistCurrentState()
  }, [persistCurrentState])

  const researchTechnologyAction = useCallback((technologyId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = researchTech(currentState, technologyId)
    if (!result.ok) {
      setNotice(result.message)
      return result
    }
    const outcome = commitWorkState(currentState, result.state, result.message)
    if (outcome.ok) gameEventBus.emit('technology:researched', { technologyId })
    return outcome
  }, [commitWorkState])

  const resolveRandomWorldEventAction = useCallback((recordId: string, choiceId: string): GameActionResult => {
    const currentState = stateRef.current
    if (!currentState) return { ok: false, message: 'Dữ liệu trò chơi chưa sẵn sàng.' }
    const result = resolveRandomEvent(currentState, recordId, choiceId, gameClock.now())
    if (!result.ok || !result.state) {
      setNotice(result.message)
      return { ok: false, message: result.message }
    }
    if (currentState.character.status === 'alive' && result.state.character.status === 'dead') {
      gameEventBus.emit('character:died', { characterId: currentState.character.id })
    }
    return commitState(result.state, result.message)
  }, [commitState])

  useEffect(() => {
    if (isAuthLoading) return
    let active = true

    stateRef.current = null
    cloudRevisionRef.current = null
    forcedWeatherIdRef.current = null
    persistedAdminCommandIdsRef.current.clear()
    void (async () => {
      const accessToken = accessTokenRef.current
      if (playerId && accessToken && isRemoteGameSaveConfigured) {
        let remoteSave = await loadRemoteGameState(accessToken)
        if (!active) return null
        if (remoteSave.created) {
          const localSave = await gameSaveService.load()
          if (!active) return null
          if (localSave) {
            remoteSave = await saveRemoteGameState(accessToken, localSave.data, remoteSave.revision)
          }
        }
        if (!active) return null
        const worldSettings = await loadRemoteWorldSettings(accessToken)
        if (!active) return null
        forcedWeatherIdRef.current = worldSettings.weatherId
        cloudRevisionRef.current = remoteSave.revision
        await gameSaveService.save(remoteSave.state, gameClock.now())
        return {
          schemaVersion: 7,
          savedAt: new Date().toISOString(),
          data: remoteSave.state,
        }
      }
      return gameSaveService.load()
    })().then((save) => {
      if (!active) return
      const now = gameClock.now()
      const restoredBase = save
        ? save.data
        : newPlayerGameState
      const restoredWeatherState = restoredBase.weather
        && !forcedWeatherIdRef.current
        && restoredBase.weather.locationId === restoredBase.character.currentLocationId
        && now < restoredBase.weather.changesAt
        ? restoredBase.weather
        : createWeatherState(restoredBase.character.currentLocationId, now, forcedWeatherIdRef.current)
      const restoredState: GameSnapshot = {
        ...restoredBase,
        survival: {
          ...restoredBase.survival,
          bodyTemperature: restoredBase.survival.bodyTemperature ?? 37,
          wetness: restoredBase.survival.wetness ?? 0,
        },
        randomWorldEvents: restoredBase.randomWorldEvents ?? [],
        nextRandomWorldEventAt: restoredBase.randomWorldEventScheduleVersion === 2
          ? restoredBase.nextRandomWorldEventAt ?? now + RANDOM_WORLD_EVENT_INTERVAL_MS
          : now + RANDOM_WORLD_EVENT_INTERVAL_MS,
        randomWorldEventScheduleVersion: 2,
        randomWorldEventSeed: restoredBase.randomWorldEventSeed
          ?? (playerId ? `account:${playerId}` : `local:${restoredBase.character.id}`),
        tutorialIntroCompleted: !shouldShowTutorialIntro(restoredBase, Boolean(save)),
        resourceNodes: refreshResourceNodes(ensureResourceNodeStates(restoredBase.resourceNodes), now),
        isResting: false,
        weather: restoredWeatherState,
        character: {
          ...restoredBase.character,
          coins: restoredBase.character.coins ?? 25,
          reputation: restoredBase.character.reputation ?? 50,
          skillExperience: restoredBase.character.skillExperience ?? {},
          researchedTechnologyIds: restoredBase.character.researchedTechnologyIds ?? [],
          ...(restoredBase.survival.health === 0 ? { status: 'dead' as const } : {}),
          ...(characterName ? { name: characterName } : {}),
          ...(homeIslandName ? { homeIslandName } : {}),
          appearance: characterAppearance,
        },
      }

      stateRef.current = restoredState
      persistedAdminCommandIdsRef.current = new Set(restoredState.appliedAdminCommandIds ?? [])
      lastTickRef.current = now
      setGameState(restoredState)
      if (restoredBase.survival.health === 0 && restoredBase.character.status === 'alive') {
        setNotice('Bạn đã gục ngã do thiếu thức ăn hoặc nước uống.')
      }
      setLoadedPlayerId(playerId)
    }).catch((loadError: unknown) => {
      if (!active) return
      const message = `Không thể tải tiến trình đã lưu: ${describeError(loadError)}`
      console.error(message, loadError)
      setError(message)
      setLoadedPlayerId(playerId)
    })

    return () => {
      active = false
    }
  }, [characterAppearance, characterName, gameSaveService, homeIslandName, isAuthLoading, playerId])

  useEffect(() => {
    if (isLoading || !playerId || !isRemoteGameSaveConfigured || !accessTokenRef.current) return
    let active = true
    let polling = false

    const pollCommands = async () => {
      if (polling) return
      const accessToken = accessTokenRef.current
      if (!accessToken) return
      polling = true
      try {
        const commands = await loadPendingAdminCommands(accessToken)
        if (!active) return
        for (const { id, command } of commands) {
          const currentState = stateRef.current
          if (!currentState) return
          if (currentState.appliedAdminCommandIds?.includes(id)) {
            if (!persistedAdminCommandIdsRef.current.has(id)) {
              if (!await persistCurrentState()) continue
            }
            await acknowledgeAdminCommand(accessToken, id)
            continue
          }

          const result = applyAdminCommand(currentState, command, id, gameClock.now())
          const nextState = result.ok
            ? result.state
            : {
              ...currentState,
              appliedAdminCommandIds: [...(currentState.appliedAdminCommandIds ?? []), id].slice(-100),
            }
          stateRef.current = nextState
          setGameState(nextState)
          emitSurvivalChanges(currentState, nextState)
          if (!await persistCurrentState()) continue
          await acknowledgeAdminCommand(accessToken, id)
          setNotice(result.message)
        }
      } catch (commandError: unknown) {
        const message = `Không thể đồng bộ lệnh quản trị: ${describeError(commandError)}`
        console.error(message, commandError)
        if (active) setError(message)
      } finally {
        polling = false
      }
    }

    void pollCommands()
    const timer = window.setInterval(() => void pollCommands(), 15_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [isLoading, persistCurrentState, playerId])

  useEffect(() => {
    if (isLoading || !playerId || !isRemoteGameSaveConfigured || !accessTokenRef.current) return
    let active = true
    let polling = false

    const pollWorldSettings = async () => {
      if (polling) return
      const accessToken = accessTokenRef.current
      if (!accessToken) return
      polling = true
      try {
        const settings = await loadRemoteWorldSettings(accessToken)
        if (!active || settings.weatherId === forcedWeatherIdRef.current) return
        forcedWeatherIdRef.current = settings.weatherId
        if (settings.weatherId) {
          const weather = getWeatherDefinition(settings.weatherId)
          setNotice(`Thời tiết toàn cục đã đổi: ${weather?.name ?? settings.weatherId}.`)
        } else {
          setNotice('Đã trả thời tiết về chu kỳ tự nhiên.')
        }
      } catch (settingsError: unknown) {
        const message = `Không thể đồng bộ thời tiết toàn cục: ${describeError(settingsError)}`
        console.error(message, settingsError)
        if (active) setError(message)
      } finally {
        polling = false
      }
    }

    const timer = window.setInterval(() => void pollWorldSettings(), 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [isLoading, playerId])

  useEffect(() => {
    if (isLoading || !stateRef.current) return

    void persistCurrentState()

    const tickTimer = window.setInterval(() => {
      const currentState = stateRef.current
      const previousTick = lastTickRef.current
      const now = gameClock.now()
      if (!currentState || previousTick === null) return

      lastTickRef.current = now
      const fireAdvance = advanceCampfireFuel(currentState, now)
      const stateAfterFire = fireAdvance.state
      const hasRestingCampfire = stateAfterFire.buildings.some((building) => (
        building.definitionId === 'building_campfire'
        && building.status === 'completed'
        && building.islandId === stateAfterFire.character.currentLocationId
        && (stateAfterFire.campfireFuel?.[building.id]?.remainingMs ?? 0) > 0
      ))
      const isActivelyWarming = stateAfterFire.isWarmingAtCampfire === true
        && hasRestingCampfire
        && stateAfterFire.character.status === 'alive'
        && (stateAfterFire.survival.bodyTemperature ?? 37) < 37
      const shelterMultiplier = getShelterRestBonusMultiplier(stateAfterFire)
      const hasShelter = shelterMultiplier > 1
      const campfireMultiplier = hasRestingCampfire ? 1.25 : 1
      const restBonusMultiplier = 1 + (shelterMultiplier - 1) + (campfireMultiplier - 1)
      const freshness = initializeFoodFreshness(stateAfterFire, now)
      const spoilage = spoilExpiredFood(freshness.state, now)
      const stateAfterFood = clearUncarriedAccessory(spoilage.state)
      const survivalWeather = getWorldWeatherAtTime(
        stateAfterFood.weather ? getWeatherDefinition(stateAfterFood.weather.weatherId) : undefined,
        now,
      )
      const baseSurvival = stateAfterFood.character.status === 'alive'
        ? advanceSurvival(
          stateAfterFood.survival,
          now - previousTick,
          isSurvivorResting(stateAfterFood),
          survivalWeather,
          restBonusMultiplier,
          isSurvivorBusy(stateAfterFood) ? survivalConfig.activityNeedMultiplier : 1,
          hasShelter,
          undefined,
          getWorldSeason(now).thirstMultiplier,
          getWorldClock(now).lightLevel === 'night'
            ? survivalConfig.stamina.nightRestRecoveryMultiplier
            : 1,
        )
        : stateAfterFood.survival
      const bodyExposure = advanceBodyExposure(
        {
          ...stateAfterFood,
          ...(stateAfterFire.isWarmingAtCampfire
            ? { isWarmingAtCampfire: isActivelyWarming }
            : {}),
          survival: baseSurvival,
        },
        now - previousTick,
        survivalWeather,
        hasShelter,
        hasRestingCampfire,
        isActivelyWarming,
      )
      const clothesDryingAdvance = advanceClothesDrying(bodyExposure.state, now)
      const ailmentAdvance = advanceAilments(
        clothesDryingAdvance.state,
        now - previousTick,
        survivalWeather,
        hasShelter,
        hasRestingCampfire,
      )
      const survival = ailmentAdvance.state.survival
      const resourceNodes = refreshResourceNodes(stateAfterFood.resourceNodes, now)
      const resourceNodesChanged = resourceNodes.some((node, index) => (
        node.available !== stateAfterFood.resourceNodes[index]?.available
        || node.respawnAt !== stateAfterFood.resourceNodes[index]?.respawnAt
      ))
      let nextState: GameSnapshot = {
        ...ailmentAdvance.state,
        survival,
        character: stateAfterFood.character.status === 'alive' && survival.health === 0
          ? { ...stateAfterFood.character, status: 'dead' }
          : stateAfterFood.character,
        resourceNodes,
      }
      if (stateAfterFood.character.status === 'alive' && survival.health === 0) {
        setNotice('Bạn đã gục ngã do sức khỏe cạn kiệt.')
        gameEventBus.emit('character:died', { characterId: currentState.character.id })
      }
      let shouldPersist = resourceNodesChanged
        || freshness.changed
        || spoilage.changed
        || fireAdvance.extinguishedBuildingIds.length > 0
        || ailmentAdvance.changed
        || clothesDryingAdvance.completed
      if (clothesDryingAdvance.completed) {
        setNotice('Quần áo đã khô sau khi được phơi cạnh lửa trại.')
      }
      if (spoilage.changed) {
        setNotice(`${spoilage.spoiledQuantity} phần thức ăn đã ôi thiu.`)
      }
      const weatherResult = advanceWeather(nextState, now, forcedWeatherIdRef.current)
      if (weatherResult.changed) {
        nextState = weatherResult.state
        const definition = weatherResult.state.weather
          ? getWeatherDefinition(weatherResult.state.weather.weatherId)
          : undefined
        if (definition) setNotice(`Thời tiết thay đổi: ${definition.name}.`)
        shouldPersist = true
      } else {
        nextState = weatherResult.state
      }

      const currentWeather = nextState.weather
        ? getWeatherDefinition(nextState.weather.weatherId)
        : undefined
      const rainCollection = advanceRainCollection(
        nextState,
        now - previousTick,
        currentWeather?.id && nextState.weather?.locationId === nextState.character.currentLocationId
          ? currentWeather
          : undefined,
      )
      nextState = rainCollection.state
      if (rainCollection.changed) shouldPersist = true

      const randomEventResult = advanceRandomWorldEvents(nextState, now)
      if (randomEventResult.changed) {
        nextState = randomEventResult.state
        shouldPersist = true
        if (randomEventResult.spawned) {
          const event = randomWorldEventDefinitions.find((entry) => entry.id === randomEventResult.spawned?.eventId)
          setNotice(`Sự kiện mới: ${event?.title ?? 'Biến cố ngoài khơi'}.`)
        }
      }

      const activeGathering = nextState.activeGathering
      if (activeGathering
        && !isFishingActivityId(activeGathering.activityId)
        && now >= activeGathering.completesAt) {
        const result = completeGathering(nextState, now)
        if (result.status === 'completed') {
          nextState = result.state
          setNotice(result.message)
          gameEventBus.emit('gathering:completed', {
            activityId: result.activityId,
            itemId: result.itemId,
            quantity: result.quantity,
            rewards: result.rewards,
          })
          shouldPersist = true
        } else if (result.status === 'failed') {
          nextState = result.state
          setNotice(result.message)
          shouldPersist = true
        }
      }

      const craftResult = completeCrafting(nextState, now)
      if (craftResult.status === 'completed') {
        nextState = craftResult.state
        setNotice(craftResult.message)
        gameEventBus.emit('crafting:completed', {
          jobId: craftResult.jobId,
          recipeId: craftResult.recipeId,
          itemId: craftResult.itemId,
          quantity: craftResult.quantity,
        })
        shouldPersist = true
      } else if (craftResult.status === 'failed') {
        nextState = craftResult.state
        setNotice(craftResult.message)
        shouldPersist = true
      }

      const explorationResult = completeExploration(nextState, now)
      if (explorationResult.status === 'completed') {
        nextState = explorationResult.state
        setNotice(explorationResult.message)
        gameEventBus.emit('exploration:completed', {
          taskId: explorationResult.taskId,
          eventId: explorationResult.eventId,
        })
        shouldPersist = true
      } else if (explorationResult.status === 'failed') {
        nextState = explorationResult.state
        setNotice(explorationResult.message)
        shouldPersist = true
      }

      const shipResult = completeShipConstruction(nextState, now)
      if (shipResult.completedShipId) {
        nextState = shipResult.state
        const ship = nextState.ships.find((entry) => entry.id === shipResult.completedShipId)
        if (ship) gameEventBus.emit('ship:completed', { shipId: ship.id, definitionId: ship.definitionId })
        setNotice('Đóng thuyền hoàn tất.')
        shouldPersist = true
      }

      const voyageResult = advanceVoyages(nextState, now)
      if (voyageResult.changed) {
        nextState = voyageResult.state
        shouldPersist = true
      }
      if (voyageResult.arrivedVoyageId && voyageResult.destinationName) {
        gameEventBus.emit('voyage:arrived', {
          voyageId: voyageResult.arrivedVoyageId,
          locationId: nextState.character.currentLocationId,
        })
        setNotice(`Đã cập bến ${voyageResult.destinationName}.`)
      }

      const constructionResult = completeConstructions(nextState, now)
      if (constructionResult.completedBuildingIds.length > 0) {
        nextState = constructionResult.state
        constructionResult.completedBuildingIds.forEach((buildingId) => {
          gameEventBus.emit('building:completed', { buildingId })
        })
        setNotice(`Hoàn thành ${constructionResult.completedBuildingIds.length} công trình.`)
        shouldPersist = true
      }

      emitSurvivalChanges(currentState, nextState)
      stateRef.current = nextState
      setGameState(nextState)
      if (shouldPersist) void persistCurrentState()
    }, 1000)
    const saveTimer = window.setInterval(() => void persistCurrentState(), 30_000)
    const saveOnHidden = () => {
      if (document.visibilityState === 'hidden') void persistCurrentState()
    }

    document.addEventListener('visibilitychange', saveOnHidden)
    return () => {
      window.clearInterval(tickTimer)
      window.clearInterval(saveTimer)
      document.removeEventListener('visibilitychange', saveOnHidden)
    }
  }, [isLoading, persistCurrentState])

  return (
    <GameContext.Provider value={{
      gameState,
      isLoading,
      isAdmin,
      adminError,
      error,
      notice,
      beginTutorial,
      startResting,
      stopResting,
      completeTutorialStep,
      startGathering: startGatheringAction,
      finishFishing: finishFishingAction,
      failFishing: failFishingAction,
      cancelGathering: cancelGatheringAction,
      transferToStorage,
      transferToInventory,
      buyMarketItem: buyMarketItemAction,
      sellMarketItem: sellMarketItemAction,
      consumeItem: consumeItemAction,
      openSalvageContainer: openSalvageContainerAction,
      sendMessageBottle: sendMessageBottleAction,
      readMessageBottle: readMessageBottleAction,
      reportMessageBottle: reportMessageBottleAction,
      discardItems: discardItemsAction,
      repairItem: repairItemAction,
      equipBackpack: equipBackpackAction,
      unequipBackpack: unequipBackpackAction,
      equipWeapon: equipWeaponAction,
      unequipWeapon: unequipWeaponAction,
      equipAccessory: equipAccessoryAction,
      unequipAccessory: unequipAccessoryAction,
      queueRecipe: queueRecipeAction,
      researchTechnology: researchTechnologyAction,
      startBuilding: startBuildingAction,
      upgradeBuilding: upgradeBuildingAction,
      fuelCampfire: fuelCampfireAction,
      setCampfireWarming: setCampfireWarmingAction,
      startDryingClothes: startDryingClothesAction,
      plantCrop: plantCropAction,
      harvestCrop: harvestCropAction,
      raiseChicken: raiseChickenAction,
      collectEggs: collectEggsAction,
      raiseGoat: raiseGoatAction,
      collectGoatMilk: collectGoatMilkAction,
      collectRainwater: collectRainwaterAction,
      startExploration: startExplorationAction,
      buildShip: buildShipAction,
      startVoyage: startVoyageAction,
      visitIslandAsAdmin: visitIslandAsAdminAction,
      addFriend: addFriendAction,
      visitPlayerIsland: visitPlayerIslandAction,
      returnHomeIsland: returnHomeIslandAction,
      proposeTrade: proposeTradeAction,
      resolveTrade: resolveTradeAction,
      startCombat: startCombatAction,
      attackCombat: attackCombatAction,
      retreatCombat: retreatCombatAction,
      respawnCharacter: respawnCharacterAction,
      resolveRandomWorldEvent: resolveRandomWorldEventAction,
      clearNotice,
    }}>
      {children}
    </GameContext.Provider>
  )
}
