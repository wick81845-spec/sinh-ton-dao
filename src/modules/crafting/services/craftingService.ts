import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { removeItems, addItems } from '../../inventory/services/inventoryService'
import type { CraftingJob, GameSnapshot, ItemId } from '../../../shared/types/game'
import { craftingQueueLimit, recipes, type RecipeDefinition, type RecipeIngredient } from '../data/recipes'
import { awardExperience } from '../../progression/services/progressionService'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { isCampfireLitAt, isCookingStoveFueledAt } from '../../building/services/campfireService'
import { fishCatalog } from '../../../data/items/fishCatalog'
import type { FishItemId } from '../../../shared/types/fish'

export type CraftingActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export type CraftingCompletionResult =
  | { status: 'pending'; state: GameSnapshot }
  | { status: 'completed'; state: GameSnapshot; jobId: string; recipeId: string; itemId: ItemId; quantity: number; message: string }
  | { status: 'failed'; state: GameSnapshot; message: string }

export type FishProcessingItemId = FishItemId | 'item_fresh_fish'

export interface FishProcessingOption {
  itemId: FishProcessingItemId
  name: string
  quantity: number
  issue: string | null
}

function getRecipe(recipeId: string): RecipeDefinition | undefined {
  return recipes.find((recipe) => recipe.id === recipeId)
}

function countItem(state: GameSnapshot, itemId: ItemId): number {
  return state.inventory.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((total, slot) => total + slot.quantity, 0)
}

function hasIngredients(state: GameSnapshot, ingredients: RecipeIngredient[]): boolean {
  return ingredients.every((ingredient) => countItem(state, ingredient.itemId) >= ingredient.quantity)
}

function getFishPortionYield(itemId: FishProcessingItemId): number {
  if (itemId === 'item_fresh_fish') return 1
  const fish = fishCatalog.find((entry) => entry.itemId === itemId)
  if (!fish) return 1
  if (fish.averageWeightKg >= 100) return 8
  if (fish.averageWeightKg >= 25) return 4
  if (fish.averageWeightKg >= 5) return 2
  return 1
}

function getFishFilletYield(itemId: FishProcessingItemId): number {
  if (itemId === 'item_fresh_fish') return 2
  const fish = fishCatalog.find((entry) => entry.itemId === itemId)
  if (!fish) return 2
  if (fish.averageWeightKg >= 200) return 40
  if (fish.averageWeightKg >= 100) return 25
  if (fish.averageWeightKg >= 50) return 16
  if (fish.averageWeightKg >= 25) return 8
  if (fish.averageWeightKg >= 5) return 4
  return 2
}

export function getRecipeOutputQuantity(
  recipe: RecipeDefinition,
  fishItemId?: FishProcessingItemId,
): number {
  if (!recipe.fishProcessing || !fishItemId) return recipe.output.quantity
  if (recipe.fishProcessing.method === 'fillet') {
    const filletYield = getFishFilletYield(fishItemId)
    return recipe.fishProcessing.inputQuantity * filletYield
  }
  const fishYield = getFishPortionYield(fishItemId)
  const totalPortions = recipe.fishProcessing.inputQuantity * fishYield
  return recipe.fishProcessing.method === 'dry'
    ? Math.max(1, Math.floor(totalPortions / 2))
    : totalPortions
}

function getFishSelectionIssue(
  state: GameSnapshot,
  recipe: RecipeDefinition,
  fishItemId?: FishProcessingItemId,
): { itemId: FishProcessingItemId | undefined; issue: string | null } {
  const rule = recipe.fishProcessing
  if (!rule) {
    return fishItemId
      ? { itemId: undefined, issue: 'Công thức này không sử dụng cá.' }
      : { itemId: undefined, issue: null }
  }

  const selectedFishId = fishItemId
    ?? (countItem(state, 'item_fresh_fish') >= rule.inputQuantity ? 'item_fresh_fish' : undefined)
  if (!selectedFishId) return { itemId: undefined, issue: 'Hãy chọn loài cá cần chế biến.' }

  const fish = fishCatalog.find((entry) => entry.itemId === selectedFishId)
  if (fish?.requiresPreparation) {
    return {
      itemId: selectedFishId,
      issue: `${fish.name} cần được sơ chế an toàn; hiện chưa có công thức xử lý loài cá này.`,
    }
  }
  if (countItem(state, selectedFishId) < rule.inputQuantity) {
    const name = fish?.name ?? itemDefinitions.item_fresh_fish.name
    return { itemId: selectedFishId, issue: `Không đủ ${name}; cần ${rule.inputQuantity} con.` }
  }
  return { itemId: selectedFishId, issue: null }
}

export function getFishProcessingOptions(
  state: GameSnapshot,
  recipe: RecipeDefinition,
): FishProcessingOption[] {
  const inputQuantity = recipe.fishProcessing?.inputQuantity
  if (inputQuantity === undefined) return []
  const options: FishProcessingOption[] = fishCatalog
    .filter((fish) => countItem(state, fish.itemId) > 0)
    .map((fish) => ({
      itemId: fish.itemId,
      name: fish.name,
      quantity: countItem(state, fish.itemId),
      issue: fish.requiresPreparation
        ? `${fish.name} cần được sơ chế an toàn; hiện chưa có công thức xử lý loài cá này.`
        : countItem(state, fish.itemId) < inputQuantity
          ? `Cần ${inputQuantity} con.`
          : null,
    }))
  const legacyQuantity = countItem(state, 'item_fresh_fish')
  if (legacyQuantity > 0) {
    options.push({
      itemId: 'item_fresh_fish',
      name: itemDefinitions.item_fresh_fish.name,
      quantity: legacyQuantity,
      issue: legacyQuantity < inputQuantity
        ? `Cần ${inputQuantity} con.`
        : null,
    })
  }
  return options
}

function hasStation(state: GameSnapshot, stationId: string): boolean {
  return state.buildings.some((building) => (
    building.definitionId === stationId
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

function consumeIngredients(state: GameSnapshot, ingredients: RecipeIngredient[]): GameSnapshot | null {
  let inventory = state.inventory
  for (const ingredient of ingredients) {
    const result = removeItems(inventory, ingredient.itemId, ingredient.quantity)
    if (!result.ok) return null
    inventory = result.container
  }
  return { ...state, inventory }
}

function simulateReservedOutputs(
  state: GameSnapshot,
  nextOutput: RecipeIngredient,
  ingredientsToConsume: RecipeIngredient[] = [],
) {
  const consumed = consumeIngredients(state, ingredientsToConsume)
  let inventory = consumed ? consumed.inventory : state.inventory
  for (const job of state.craftingQueue) {
    const queuedRecipe = getRecipe(job.recipeId)
    if (!queuedRecipe) return null
    const reservation = addItems(
      inventory,
      queuedRecipe.output.itemId,
      job.outputQuantity ?? queuedRecipe.output.quantity,
    )
    if (!reservation.ok) return null
    inventory = reservation.container
  }
  const reservation = addItems(inventory, nextOutput.itemId, nextOutput.quantity)
  return reservation.ok ? reservation.container : null
}

export function getRecipeAvailability(
  state: GameSnapshot,
  recipeId: string,
  now = Date.now(),
  fishItemId?: FishProcessingItemId,
): string | null {
  const recipe = getRecipe(recipeId)
  if (!recipe) return 'Công thức không tồn tại.'
  if (state.character.status !== 'alive') return 'Bạn cần hồi sinh trước khi chế tạo.'
  if (state.activeCombat) return 'Hãy kết thúc trận chiến trước khi chế tạo.'
  if (state.activeGathering) return 'Hãy chờ hoạt động thu thập hoàn tất trước.'
  if (state.activeExploration) return 'Hãy chờ hoạt động thám hiểm hoàn tất trước.'
  if (state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')) {
    return 'Không thể chế tạo khi đang trên hành trình.'
  }
  if (state.craftingQueue.length >= craftingQueueLimit) return 'Hàng đợi chế tạo đã đầy.'
  if (state.character.level < (recipe.requiredLevel ?? 1)) return `Cần đạt cấp ${recipe.requiredLevel}.`
  if (recipe.requiredDiscoveryId && !state.discoveredIslandIds.includes(recipe.requiredDiscoveryId)) {
    const island = getIslandDefinition(recipe.requiredDiscoveryId)
    return `Cần khám phá ${island?.name ?? 'địa điểm mới'} để học công thức này.`
  }
  if (recipe.technologyId && !(state.character.researchedTechnologyIds ?? []).includes(recipe.technologyId)) {
    return 'Cần nghiên cứu công nghệ mở khóa công thức này.'
  }
  if (recipe.stationId && !hasStation(state, recipe.stationId)) {
    const station = buildingDefinitions.find((building) => building.id === recipe.stationId)
    return `Cần có ${station?.name.toLocaleLowerCase('vi-VN') ?? 'trạm chế biến'} đã hoàn thành.`
  }
  if (recipe.requiredToolAlternatives?.length
    && !recipe.requiredToolAlternatives.some((itemId) => countItem(state, itemId) > 0)) {
    const alternatives = recipe.requiredToolAlternatives.map((itemId) => itemDefinitions[itemId].name)
    return `Cần có ${alternatives.join(' hoặc ')} trong túi đồ; vật dụng này không bị tiêu hao.`
  }
  if (recipe.requiresLitCampfire && !state.buildings.some((building) => (
    building.definitionId === 'building_campfire' && isCampfireLitAt(state, building.id, now)
  ))) return 'Cần có lửa trại đang cháy; hãy thêm nhiên liệu cho lửa trại.'
  if (recipe.stationId === 'building_cooking_stove' && !isCookingStoveFueledAt(state, now)) {
    return 'Bếp đã hết nhiên liệu; hãy thêm cành cây, gỗ hoặc than trước khi nấu.'
  }
  const fishSelection = getFishSelectionIssue(state, recipe, fishItemId)
  if (fishSelection.issue) return fishSelection.issue
  if (!hasIngredients(state, recipe.ingredients)) return 'Không đủ nguyên liệu trong túi đồ.'
  const output = {
    ...recipe.output,
    quantity: getRecipeOutputQuantity(recipe, fishSelection.itemId),
  }
  const ingredients = fishSelection.itemId && recipe.fishProcessing
    ? [...recipe.ingredients, { itemId: fishSelection.itemId, quantity: recipe.fishProcessing.inputQuantity }]
    : recipe.ingredients
  if (!simulateReservedOutputs(state, output, ingredients)) return 'Không đủ chỗ trong túi đồ cho sản phẩm.'
  return null
}

export function queueRecipe(
  state: GameSnapshot,
  recipeId: string,
  now: number,
  fishItemId?: FishProcessingItemId,
): CraftingActionResult {
  const issue = getRecipeAvailability(state, recipeId, now, fishItemId)
  if (issue) return { ok: false, message: issue }
  const recipe = getRecipe(recipeId)
  if (!recipe) return { ok: false, message: 'Công thức không tồn tại.' }

  const fishSelection = getFishSelectionIssue(state, recipe, fishItemId)
  if (fishSelection.issue) return { ok: false, message: fishSelection.issue }
  const ingredients = fishSelection.itemId && recipe.fishProcessing
    ? [...recipe.ingredients, { itemId: fishSelection.itemId, quantity: recipe.fishProcessing.inputQuantity }]
    : recipe.ingredients
  const consumedState = consumeIngredients(state, ingredients)
  if (!consumedState) return { ok: false, message: 'Không thể tiêu hao nguyên liệu cho công thức này.' }

  const isFirstJob = state.craftingQueue.length === 0
  const outputQuantity = getRecipeOutputQuantity(recipe, fishSelection.itemId)
  const job: CraftingJob = {
    id: `${recipe.id}-${now}-${state.craftingQueue.length}`,
    recipeId,
    startedAt: isFirstJob ? now : null,
    completesAt: isFirstJob ? now + recipe.durationSeconds * 1000 : null,
    ...(fishSelection.itemId ? { fishItemId: fishSelection.itemId } : {}),
    ...(recipe.fishProcessing ? { outputQuantity } : {}),
  }

  return {
    ok: true,
    state: { ...consumedState, craftingQueue: [...state.craftingQueue, job] },
    message: isFirstJob
      ? `Đã bắt đầu ${recipe.kind === 'processing' ? 'sơ chế' : 'chế tạo'} ${recipe.name}.`
      : `Đã thêm ${recipe.name} vào hàng đợi.`,
  }
}

function startNextJob(queue: CraftingJob[], now: number): CraftingJob[] {
  if (queue.length === 0 || queue[0].completesAt !== null) return queue
  const nextRecipe = getRecipe(queue[0].recipeId)
  if (!nextRecipe) return queue
  return queue.map((job, index) => index === 0
    ? { ...job, startedAt: now, completesAt: now + nextRecipe.durationSeconds * 1000 }
    : job)
}

export function completeCrafting(state: GameSnapshot, now: number): CraftingCompletionResult {
  const activeJob = state.craftingQueue[0]
  if (!activeJob || activeJob.completesAt === null || now < activeJob.completesAt) {
    return { status: 'pending', state }
  }

  const recipe = getRecipe(activeJob.recipeId)
  if (!recipe) {
    return {
      status: 'failed',
      state: { ...state, craftingQueue: state.craftingQueue.slice(1) },
      message: 'Công thức của hàng đợi không còn tồn tại.',
    }
  }

  if (recipe.requiresLitCampfire && !state.buildings.some((building) => (
    building.definitionId === 'building_campfire' && isCampfireLitAt(state, building.id, now)
  ))) return { status: 'pending', state }
  if (recipe.stationId === 'building_cooking_stove' && !isCookingStoveFueledAt(state, now)) {
    return { status: 'pending', state }
  }

  const outputQuantity = activeJob.outputQuantity ?? recipe.output.quantity
  const inventory = addItems(state.inventory, recipe.output.itemId, outputQuantity, now)
  if (!inventory.ok) {
    return {
      status: 'failed',
      state: { ...state, craftingQueue: state.craftingQueue.slice(1) },
      message: `Không thể nhận ${itemDefinitions[recipe.output.itemId].name}; hãy kiểm tra sức chứa túi đồ.`,
    }
  }

  const remainingQueue = startNextJob(state.craftingQueue.slice(1), now)
  const maxDurability = itemDefinitions[recipe.output.itemId].maxDurability
  return {
    status: 'completed',
    state: {
      ...state,
      character: awardExperience(state.character, 'processing', recipe.kind === 'processing' ? 8 : 10),
      inventory: inventory.container,
      ...(maxDurability
        ? { itemDurability: { ...state.itemDurability, [recipe.output.itemId]: maxDurability } }
        : {}),
      craftingQueue: remainingQueue,
    },
    jobId: activeJob.id,
    recipeId: recipe.id,
    itemId: recipe.output.itemId,
    quantity: outputQuantity,
    message: `${recipe.kind === 'processing' ? 'Sơ chế' : 'Chế tạo'} hoàn tất: ${itemDefinitions[recipe.output.itemId].name} × ${outputQuantity}.`,
  }
}

export { getCraftingPageRecipes, getRecipesForStation, recipes } from '../data/recipes'
