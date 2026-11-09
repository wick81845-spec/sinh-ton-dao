import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { removeItems, addItems } from '../../inventory/services/inventoryService'
import type { CraftingJob, GameSnapshot, ItemId } from '../../../shared/types/game'
import { craftingQueueLimit, recipes, type RecipeDefinition, type RecipeIngredient } from '../data/recipes'
import { awardExperience } from '../../progression/services/progressionService'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'

export type CraftingActionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export type CraftingCompletionResult =
  | { status: 'pending'; state: GameSnapshot }
  | { status: 'completed'; state: GameSnapshot; jobId: string; recipeId: string; itemId: ItemId; quantity: number; message: string }
  | { status: 'failed'; state: GameSnapshot; message: string }

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

function hasStation(state: GameSnapshot, stationId: string): boolean {
  return state.buildings.some((building) => (
    building.definitionId === stationId
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
}

function simulateReservedOutputs(state: GameSnapshot, nextOutput: RecipeIngredient) {
  let inventory = state.inventory
  for (const job of state.craftingQueue) {
    const queuedRecipe = getRecipe(job.recipeId)
    if (!queuedRecipe) return null
    const reservation = addItems(inventory, queuedRecipe.output.itemId, queuedRecipe.output.quantity)
    if (!reservation.ok) return null
    inventory = reservation.container
  }
  const reservation = addItems(inventory, nextOutput.itemId, nextOutput.quantity)
  return reservation.ok ? reservation.container : null
}

export function getRecipeAvailability(state: GameSnapshot, recipeId: string): string | null {
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
  if (recipe.technologyId && !(state.character.researchedTechnologyIds ?? []).includes(recipe.technologyId)) {
    return 'Cần nghiên cứu công nghệ mở khóa công thức này.'
  }
  if (recipe.stationId && !hasStation(state, recipe.stationId)) {
    const station = buildingDefinitions.find((building) => building.id === recipe.stationId)
    return `Cần có ${station?.name.toLocaleLowerCase('vi-VN') ?? 'trạm chế biến'} đã hoàn thành.`
  }
  if (!hasIngredients(state, recipe.ingredients)) return 'Không đủ nguyên liệu trong túi đồ.'
  if (!simulateReservedOutputs(state, recipe.output)) return 'Không đủ chỗ trong túi đồ cho sản phẩm.'
  return null
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

export function queueRecipe(state: GameSnapshot, recipeId: string, now: number): CraftingActionResult {
  const issue = getRecipeAvailability(state, recipeId)
  if (issue) return { ok: false, message: issue }
  const recipe = getRecipe(recipeId)
  if (!recipe) return { ok: false, message: 'Công thức không tồn tại.' }

  const consumedState = consumeIngredients(state, recipe.ingredients)
  if (!consumedState) return { ok: false, message: 'Không thể tiêu hao nguyên liệu cho công thức này.' }

  const isFirstJob = state.craftingQueue.length === 0
  const job: CraftingJob = {
    id: `${recipe.id}-${now}-${state.craftingQueue.length}`,
    recipeId,
    startedAt: isFirstJob ? now : null,
    completesAt: isFirstJob ? now + recipe.durationSeconds * 1000 : null,
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

  const inventory = addItems(state.inventory, recipe.output.itemId, recipe.output.quantity)
  if (!inventory.ok) {
    return {
      status: 'failed',
      state: { ...state, craftingQueue: state.craftingQueue.slice(1) },
      message: `Không thể nhận ${itemDefinitions[recipe.output.itemId].name}; hãy kiểm tra sức chứa túi đồ.`,
    }
  }

  const remainingQueue = startNextJob(state.craftingQueue.slice(1), now)
  return {
    status: 'completed',
    state: {
      ...state,
      character: awardExperience(state.character, 'processing', recipe.kind === 'processing' ? 8 : 10),
      inventory: inventory.container,
      craftingQueue: remainingQueue,
    },
    jobId: activeJob.id,
    recipeId: recipe.id,
    itemId: recipe.output.itemId,
    quantity: recipe.output.quantity,
    message: `${recipe.kind === 'processing' ? 'Sơ chế' : 'Chế tạo'} hoàn tất: ${itemDefinitions[recipe.output.itemId].name} × ${recipe.output.quantity}.`,
  }
}

export { recipes }
