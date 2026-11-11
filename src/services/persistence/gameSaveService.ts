import { initialGameState } from '../../data/mockGameState'
import { fishCatalog } from '../../data/items/fishCatalog'
import { isAccessoryItem, itemDefinitions } from '../../data/items/itemDefinitions'
import { buildingDefinitions, constructionQueueLimit } from '../../modules/building/data/buildingDefinitions'
import { isBuildingDefinitionId } from '../../modules/building/data/buildingDefinitions'
import { gatheringActivities, randomGatheringActivityId } from '../../modules/gathering/data/gatheringConfig'
import { craftingQueueLimit, recipes } from '../../modules/crafting/data/recipes'
import { explorationTasks } from '../../modules/exploration/data/explorationConfig'
import { speciesDefinitions } from '../../modules/ecology/data/ecologyDefinitions'
import { combatEncounters } from '../../modules/combat/data/combatConfig'
import { mockPlayers } from '../../modules/social/data/playerDirectory'
import { getShipDefinition, shipDefinitions } from '../../modules/ship/data/shipDefinitions'
import { islandDefinitions, worldEventDefinitions } from '../../modules/world/data/worldDefinitions'
import { survivalConfig } from '../../modules/survival/data/survivalConfig'
import { technologyDefinitions } from '../../modules/progression/data/progressionDefinitions'
import { isValidWeatherState } from '../../modules/world/services/weatherService'
import { randomWorldEventDefinitions } from '../../modules/world/data/randomWorldEventDefinitions'
import type {
  ActiveGathering,
  ActiveExploration,
  CombatLogEntry,
  CombatSession,
  Character,
  ConstructionJob,
  CraftingJob,
  ExplorationLogEntry,
  GameSnapshot,
  CropId,
  FarmPlot,
  InventorySlot,
  ItemContainer,
  ItemId,
  ItemQuantity,
  LivestockPen,
  WaterCollectorState,
  PlayerBuilding,
  PlayerShip,
  RandomWorldEventRecord,
  ResourceNodeState,
  SocialPlayerInventory,
  SocialTradeOffer,
  ShipConstructionJob,
  SurvivalStats,
  SurvivalAilment,
  SurvivalAilmentId,
  Voyage,
  WorldEventRecord,
} from '../../shared/types/game'
import type { StorageAdapter } from '../storage/StorageAdapter'
import { localStorageAdapter } from '../storage/localStorageAdapter'

const gameSaveKey = 'game.save'
const currentSchemaVersion = 12
const migratedStorageCapacity = 40
const previousCatalogFishItemIds = [
  'item_anchovy', 'item_sardine', 'item_herring', 'item_mullet', 'item_tilapia', 'item_goby',
  'item_rabbitfish', 'item_scad', 'item_flying_fish', 'item_damselfish', 'item_small_mackerel',
  'item_red_snapper', 'item_grouper', 'item_catfish', 'item_carp', 'item_snakehead',
  'item_white_pomfret', 'item_spotted_rabbitfish', 'item_croaker', 'item_sea_bream',
  'item_skipjack_tuna', 'item_amberjack', 'item_barracuda', 'item_seabass', 'item_trevally',
  'item_leatherjacket', 'item_parrotfish', 'item_butterflyfish', 'item_lionfish', 'item_milkfish',
  'item_yellowfin_tuna', 'item_bigeye_tuna', 'item_red_grouper', 'item_giant_grouper',
  'item_shortbill_swordfish', 'item_mahi_mahi', 'item_sailfish', 'item_large_pomfret',
  'item_devil_grouper', 'item_moray_eel', 'item_swordfish', 'item_blue_marlin',
  'item_bluefin_tuna', 'item_giant_carp', 'item_sturgeon', 'item_whale_shark',
  'item_ocean_sunfish', 'item_wolffish', 'item_giant_halibut', 'item_giant_grouper_rare',
  'item_sea_dragon', 'item_oarfish', 'item_megamouth_shark', 'item_great_hammerhead',
  'item_mako_shark', 'item_great_white_shark', 'item_tiger_shark', 'item_greenland_shark',
  'item_giant_lanternfish', 'item_coelacanth', 'item_black_dragonfish', 'item_ancient_megamouth',
  'item_giant_shark', 'item_giant_manta', 'item_white_orca', 'item_ancient_swordfish',
  'item_golden_tuna', 'item_giant_sunfish', 'item_deep_sea_dragonfish', 'item_leviathan',
] as const
const archivedFishItemIds = [
  'item_spotted_trout', 'item_golden_tench', 'item_mackerel', 'item_goldfish',
  'item_striped_bream', 'item_needlefish', 'item_rainbow_trout', 'item_pink_sardine',
  'item_green_minnow', 'item_bronze_roach', 'item_rose_perch', 'item_blue_sprat',
  'item_parrot_minnow', 'item_angelfish', 'item_blue_tang', 'item_clownfish',
  'item_yellow_clownfish', 'item_purple_basslet', 'item_blue_damselfish', 'item_dwarf_lionfish',
  'item_regal_tang', 'item_cobalt_tang', 'item_tiger_grouper', 'item_blue_grouper',
  'item_spotted_grouper', 'item_red_wrasse', 'item_reef_crabfish', 'item_purple_grouper',
  'item_pink_anglerfish', 'item_rainbow_scorpionfish', 'item_seahorse_sun', 'item_seahorse_coral',
  'item_golden_butterflyfish', 'item_clown_triggerfish', 'item_pufferfish',
  'item_regal_butterflyfish', 'item_sole', 'item_tuna', 'item_kraken_octopus',
  'item_starlight_manta',
] as const
const currentFishItemIds = new Set<string>(fishCatalog.map((fish) => fish.itemId))
const obsoleteFishItemIds = new Set<string>(
  [...previousCatalogFishItemIds, ...archivedFishItemIds]
    .filter((itemId) => !currentFishItemIds.has(itemId)),
)

function hasLegacyItemReference(value: unknown, itemId: string): boolean {
  if (typeof value === 'string') return value === itemId
  if (Array.isArray(value)) return value.some((entry) => hasLegacyItemReference(entry, itemId))
  if (typeof value !== 'object' || value === null) return false
  return Object.entries(value).some(([key, entry]) => (
    key === itemId || hasLegacyItemReference(entry, itemId)
  ))
}

function migrateLegacySlots(slots: unknown[]): unknown[] {
  const containsDuplicateDriftwood = slots.some((slot) => (
    isRecord(slot) && slot.itemId === 'item_driftwood'
  ))
  const migratedSlots = slots.map(migrateLegacyFishReferences)
  if (!containsDuplicateDriftwood) return migratedSlots

  const totalWood = migratedSlots.reduce<number>((total, slot) => (
    total + (isRecord(slot) && slot.itemId === 'item_wood' && isFiniteNumber(slot.quantity)
      ? slot.quantity
      : 0)
  ), 0)
  let mergedWood = false
  return migratedSlots.flatMap((slot) => {
    if (!isRecord(slot) || slot.itemId !== 'item_wood' || !isFiniteNumber(slot.quantity)) return [slot]
    if (mergedWood) return []
    mergedWood = true
    return [{ ...slot, quantity: totalWood }]
  })
}

export function migrateLegacyFishReferences(value: unknown): unknown {
  if (typeof value === 'string') {
    if (obsoleteFishItemIds.has(value)) return 'item_fresh_fish'
    return value === 'item_driftwood' ? 'item_wood' : value
  }
  if (Array.isArray(value)) return value.map(migrateLegacyFishReferences)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (key === 'itemDurability' && isRecord(entry)) {
      return [[key, Object.fromEntries(
        Object.entries(entry).filter(([itemId]) => (
          !obsoleteFishItemIds.has(itemId) && itemId !== 'item_driftwood'
        )),
      )]]
    }
    if (key === 'slots' && Array.isArray(entry)) return [[key, migrateLegacySlots(entry)]]
    const migratedKey = obsoleteFishItemIds.has(key)
      ? 'item_fresh_fish'
      : key === 'item_driftwood'
        ? 'item_wood'
        : key
    return [[migratedKey, migrateLegacyFishReferences(entry)]]
  }))
}

interface GameSnapshotV2 {
  character: Character
  survival: SurvivalStats
  inventory: ItemContainer
  storage: ItemContainer
  resourceNodes: ResourceNodeState[]
  activeGathering: ActiveGathering | null
}

interface GameSaveV2 {
  schemaVersion: 2
  savedAt: string
  data: GameSnapshotV2
}

type GameSnapshotV3 = GameSnapshotV2 & Pick<GameSnapshot, 'craftingQueue' | 'buildings' | 'constructionQueue'>

interface GameSaveV3 {
  schemaVersion: 3
  savedAt: string
  data: GameSnapshotV3
}

type GameSnapshotV4 = GameSnapshotV3 & Pick<GameSnapshot,
  | 'discoveredIslandIds'
  | 'activeExploration'
  | 'explorationLog'
  | 'worldEventLog'
  | 'ships'
  | 'shipConstruction'
  | 'voyages'
>

interface GameSaveV4 {
  schemaVersion: 4
  savedAt: string
  data: GameSnapshotV4
}

interface GameSaveV5 {
  schemaVersion: 5
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV6 {
  schemaVersion: 6
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV7 {
  schemaVersion: 7
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV8 {
  schemaVersion: 8
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV9 {
  schemaVersion: 9
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV10 {
  schemaVersion: 10
  savedAt: string
  data: GameSnapshot
}

interface GameSaveV11 {
  schemaVersion: 11
  savedAt: string
  data: GameSnapshot
}

export interface GameSave {
  schemaVersion: typeof currentSchemaVersion
  savedAt: string
  data: GameSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isWithinRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max
}

function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && Object.hasOwn(itemDefinitions, value)
}

function isCharacter(value: unknown): value is Character {
  if (!isRecord(value)) return false

  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.homeIslandName === undefined
      || (typeof value.homeIslandName === 'string' && value.homeIslandName.trim().length > 0 && value.homeIslandName.length <= 40))
    && isFiniteNumber(value.level)
    && Number.isInteger(value.level)
    && value.level >= 1
    && isFiniteNumber(value.experience)
    && value.experience >= 0
    && (value.coins === undefined || (isFiniteNumber(value.coins) && Number.isInteger(value.coins) && value.coins >= 0))
    && (value.reputation === undefined || isWithinRange(value.reputation, 0, 100))
    && (value.skillExperience === undefined || (isRecord(value.skillExperience)
      && Object.entries(value.skillExperience).every(([skill, experience]) => (
        ['gathering', 'processing', 'building', 'exploration', 'combat'].includes(skill)
        && isFiniteNumber(experience)
        && experience >= 0
      ))))
    && (value.researchedTechnologyIds === undefined || (
      Array.isArray(value.researchedTechnologyIds)
      && new Set(value.researchedTechnologyIds).size === value.researchedTechnologyIds.length
      && value.researchedTechnologyIds.every((technologyId) => (
        typeof technologyId === 'string'
        && technologyDefinitions.some((technology) => technology.id === technologyId)
      ))
    ))
    && typeof value.homeIslandId === 'string'
    && typeof value.currentLocationId === 'string'
    && (value.status === 'alive' || value.status === 'dead')
    && typeof value.createdAt === 'string'
    && Number.isFinite(Date.parse(value.createdAt))
    && typeof value.updatedAt === 'string'
    && Number.isFinite(Date.parse(value.updatedAt))
}

function isSurvivalStats(value: unknown): value is SurvivalStats {
  if (!isRecord(value)) return false

  return isWithinRange(value.health, 0, survivalConfig.health.max)
    && isWithinRange(value.hunger, 0, survivalConfig.hunger.max)
    && isWithinRange(value.thirst, 0, survivalConfig.thirst.max)
    && isWithinRange(value.stamina, 0, survivalConfig.stamina.max)
    && (value.temperature === undefined || isFiniteNumber(value.temperature))
    && (value.bodyTemperature === undefined || isWithinRange(value.bodyTemperature, 32, 42))
    && (value.wetness === undefined || isWithinRange(value.wetness, 0, 100))
    && Array.isArray(value.conditions)
    && value.conditions.every((condition) => typeof condition === 'string')
}

function isInventorySlot(value: unknown): value is InventorySlot {
  return isRecord(value)
    && isItemId(value.itemId)
    && isFiniteNumber(value.quantity)
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && value.quantity <= itemDefinitions[value.itemId].maxStack
    && (value.expiresAt === undefined || isFiniteNumber(value.expiresAt))
}

function isItemQuantity(value: unknown): value is ItemQuantity {
  return isRecord(value)
    && isItemId(value.itemId)
    && isFiniteNumber(value.quantity)
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && value.quantity <= itemDefinitions[value.itemId].maxStack
}

function isContainer(value: unknown): value is ItemContainer {
  if (!isRecord(value) || !Array.isArray(value.slots)) return false

  return typeof value.ownerId === 'string'
    && isFiniteNumber(value.maxSlots)
    && Number.isInteger(value.maxSlots)
    && value.maxSlots > 0
    && value.slots.length <= value.maxSlots
    && value.slots.every(isInventorySlot)
}

function isResourceNode(value: unknown): value is ResourceNodeState {
  const definition = isRecord(value)
    ? initialGameState.resourceNodes.find((node) => node.nodeId === value.nodeId)
    : undefined
  return isRecord(value)
    && definition !== undefined
    && typeof value.nodeId === 'string'
    && isFiniteNumber(value.available)
    && Number.isInteger(value.available)
    && value.available >= 0
    && value.available <= definition.available
    && (value.respawnAt === null || isFiniteNumber(value.respawnAt))
}

function isActiveGathering(value: unknown): value is ActiveGathering {
  return isRecord(value)
    && typeof value.activityId === 'string'
    && (value.activityId === randomGatheringActivityId
      || gatheringActivities.some((activity) => activity.id === value.activityId))
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
    && (value.outcome === undefined
      || value.outcome === 'ordinary'
      || value.outcome === 'lucky'
      || value.outcome === 'adverse')
}

function isGameSnapshotV2(value: unknown): value is GameSnapshotV2 {
  return isRecord(value)
    && isCharacter(value.character)
    && isSurvivalStats(value.survival)
    && isContainer(value.inventory)
    && isContainer(value.storage)
    && Array.isArray(value.resourceNodes)
    && value.resourceNodes.every(isResourceNode)
    && (value.activeGathering === null || isActiveGathering(value.activeGathering))
}

function isLegacySnapshotV1(value: unknown): value is {
  character: Character
  survival: SurvivalStats
  inventory: InventorySlot[]
  inventoryCapacity: number
} {
  return isRecord(value)
    && isCharacter(value.character)
    && isSurvivalStats(value.survival)
    && Array.isArray(value.inventory)
    && value.inventory.every(isInventorySlot)
    && isFiniteNumber(value.inventoryCapacity)
    && Number.isInteger(value.inventoryCapacity)
    && value.inventoryCapacity > 0
    && value.inventory.length <= value.inventoryCapacity
}

function isCraftingJob(value: unknown): value is CraftingJob {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.recipeId !== 'string'
    || !recipes.some((recipe) => recipe.id === value.recipeId)) {
    return false
  }

  const recipe = recipes.find((entry) => entry.id === value.recipeId)
  const hasFishSelection = value.fishItemId === 'item_fresh_fish'
    || fishCatalog.some((fish) => fish.itemId === value.fishItemId)
  const hasFishMetadata = value.fishItemId !== undefined || value.outputQuantity !== undefined
  if (hasFishMetadata
    && (!recipe?.fishProcessing
      || value.fishItemId === undefined
      || !hasFishSelection
      || !isFiniteNumber(value.outputQuantity)
      || !Number.isInteger(value.outputQuantity)
      || value.outputQuantity < 1
      || value.outputQuantity > recipe.fishProcessing.inputQuantity * 8)) {
    return false
  }

  if (value.startedAt === null && value.completesAt === null) return true
  return isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
}

function isPlayerBuilding(value: unknown): value is PlayerBuilding {
  if (!isRecord(value) || typeof value.definitionId !== 'string' || !isBuildingDefinitionId(value.definitionId)) {
    return false
  }
  const definition = buildingDefinitions.find((entry) => entry.id === value.definitionId)
  if (!definition) return false

  return typeof value.id === 'string'
    && typeof value.islandId === 'string'
    && isFiniteNumber(value.level)
    && Number.isInteger(value.level)
    && value.level >= 1
    && value.level <= definition.maxLevel
    && isWithinRange(value.health, 0, definition.maxHealth)
    && (value.status === 'building' || value.status === 'completed' || value.status === 'damaged')
}

function isPlayerBuildingList(value: unknown): value is PlayerBuilding[] {
  return Array.isArray(value) && value.every(isPlayerBuilding)
}

function isConstructionJob(value: unknown, buildings: PlayerBuilding[]): value is ConstructionJob {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.buildingId === 'string'
    && buildings.some((building) => building.id === value.buildingId)
    && (value.kind === 'construction' || value.kind === 'upgrade')
    && isFiniteNumber(value.targetLevel)
    && Number.isInteger(value.targetLevel)
    && value.targetLevel >= 1
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
}

function isGameSnapshotV3(value: unknown): value is GameSnapshotV3 {
  if (!isGameSnapshotV2(value) || !isRecord(value) || !isPlayerBuildingList(value.buildings)) return false

  const buildings = value.buildings
  const constructionQueue = value.constructionQueue
  const craftingQueue = value.craftingQueue

  return Array.isArray(constructionQueue)
    && constructionQueue.length <= constructionQueueLimit
    && constructionQueue.every((job) => isConstructionJob(job, buildings))
    && Array.isArray(craftingQueue)
    && craftingQueue.length <= craftingQueueLimit
    && craftingQueue.every(isCraftingJob)
    && (craftingQueue.length === 0
      || (craftingQueue[0].startedAt !== null
        && craftingQueue.slice(1).every((job) => job.startedAt === null && job.completesAt === null)))
}

function isActiveExploration(value: unknown): value is ActiveExploration {
  if (!isRecord(value) || typeof value.taskId !== 'string') return false
  const task = explorationTasks.find((entry) => entry.id === value.taskId)
  return task !== undefined
    && typeof value.locationId === 'string'
    && (task.id === 'survey-nearby-island'
      ? islandDefinitions.some((island) => island.id === value.locationId)
      : task.locationId === value.locationId)
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
}

function isExplorationLogEntry(value: unknown): value is ExplorationLogEntry {
  if (!isRecord(value) || typeof value.taskId !== 'string') return false
  const task = explorationTasks.find((entry) => entry.id === value.taskId)
  return task !== undefined
    && typeof value.id === 'string'
    && typeof value.locationId === 'string'
    && (task.id === 'survey-nearby-island'
      ? islandDefinitions.some((island) => island.id === value.locationId)
      : task.locationId === value.locationId)
    && isFiniteNumber(value.completedAt)
    && Array.isArray(value.rewards)
    && value.rewards.every(isItemQuantity)
    && Array.isArray(value.discoveredIslandIds)
    && value.discoveredIslandIds.every((islandId) => typeof islandId === 'string'
      && islandDefinitions.some((island) => island.id === islandId))
    && value.worldEventId === (task.worldEventId ?? null)
    && (value.observedSpeciesId === undefined
      ? task.observedSpeciesId === undefined
      : value.observedSpeciesId === task.observedSpeciesId
        && speciesDefinitions.some((species) => species.id === value.observedSpeciesId))
}

function isWorldEventRecord(value: unknown): value is WorldEventRecord {
  if (!isRecord(value) || typeof value.eventId !== 'string') return false
  const event = worldEventDefinitions.find((entry) => entry.id === value.eventId)
  return event !== undefined
    && typeof value.id === 'string'
    && typeof value.locationId === 'string'
    && event.locationId === value.locationId
    && isFiniteNumber(value.occurredAt)
}

function isRandomWorldEventRecord(value: unknown): value is RandomWorldEventRecord {
  if (!isRecord(value) || typeof value.eventId !== 'string') return false
  const event = randomWorldEventDefinitions.find((entry) => entry.id === value.eventId)
  return event !== undefined
    && typeof value.id === 'string'
    && typeof value.locationId === 'string'
    && islandDefinitions.some((island) => island.id === value.locationId)
    && isFiniteNumber(value.spawnedAt)
    && isFiniteNumber(value.expiresAt)
    && value.expiresAt > value.spawnedAt
    && (value.status === 'pending' || value.status === 'resolved' || value.status === 'expired')
    && (value.choiceId === null || (
      typeof value.choiceId === 'string'
      && event.choices.some((choice) => choice.id === value.choiceId)
    ))
    && (value.status === 'pending' ? value.choiceId === null : value.status !== 'resolved' || value.choiceId !== null)
    && (value.outcome === null || typeof value.outcome === 'string')
    && (value.followUpEventId === null || randomWorldEventDefinitions.some((entry) => entry.id === value.followUpEventId))
    && (value.followUpAt === null || isFiniteNumber(value.followUpAt))
    && ((value.followUpEventId === null) === (value.followUpAt === null))
}

function isPlayerShip(value: unknown): value is PlayerShip {
  if (!isRecord(value) || typeof value.definitionId !== 'string') return false
  const definition = getShipDefinition(value.definitionId)
  return definition !== undefined
    && typeof value.id === 'string'
    && typeof value.currentLocationId === 'string'
    && islandDefinitions.some((island) => island.id === value.currentLocationId)
    && isWithinRange(value.health, 0, definition.maxHealth)
    && (value.status === 'docked' || value.status === 'traveling' || value.status === 'damaged')
}

function isShipConstructionJob(value: unknown): value is ShipConstructionJob {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.definitionId === 'string'
    && shipDefinitions.some((ship) => ship.id === value.definitionId)
    && (value.upgradeShipId === undefined || typeof value.upgradeShipId === 'string')
    && typeof value.locationId === 'string'
    && islandDefinitions.some((island) => island.id === value.locationId)
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
}

function isShipConstructionStateValid(job: ShipConstructionJob | null, ships: PlayerShip[]): boolean {
  if (!job) return true
  if (ships.length === 0) return job.upgradeShipId === undefined
  if (!job.upgradeShipId || ships.length !== 1) return false

  const ship = ships.find((entry) => entry.id === job.upgradeShipId)
  return ship?.status === 'docked'
    && ship.currentLocationId === job.locationId
    && getShipDefinition(job.definitionId)?.upgradeFromDefinitionId === ship.definitionId
}

function isVoyage(value: unknown, ships: PlayerShip[]): value is Voyage {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.shipId === 'string'
    && ships.some((ship) => ship.id === value.shipId)
    && typeof value.originId === 'string'
    && islandDefinitions.some((island) => island.id === value.originId)
    && typeof value.destinationId === 'string'
    && islandDefinitions.some((island) => island.id === value.destinationId)
    && value.destinationId !== value.originId
    && (value.status === 'preparing'
      || value.status === 'departed'
      || value.status === 'traveling'
      || value.status === 'arrived'
      || value.status === 'interrupted'
      || value.status === 'cancelled')
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.completesAt)
    && value.completesAt >= value.startedAt
    && (value.status === 'arrived'
      ? isFiniteNumber(value.arrivedAt)
      : value.arrivedAt === null)
}

function isGameSnapshotV4(value: unknown): value is GameSnapshotV4 {
  if (!isGameSnapshotV3(value) || !isRecord(value)) return false

  const ships = value.ships
  if (!Array.isArray(ships) || ships.length > 1 || !ships.every(isPlayerShip)) return false
  const shipConstruction = value.shipConstruction
  if (shipConstruction !== null && !isShipConstructionJob(shipConstruction)) return false
  const activeVoyages = Array.isArray(value.voyages)
    ? value.voyages.filter((voyage) => isRecord(voyage)
      && (voyage.status === 'departed' || voyage.status === 'traveling'))
    : []
  return Array.isArray(value.discoveredIslandIds)
    && value.discoveredIslandIds.length > 0
    && new Set(value.discoveredIslandIds).size === value.discoveredIslandIds.length
    && value.discoveredIslandIds.every((islandId) => typeof islandId === 'string'
      && islandDefinitions.some((island) => island.id === islandId))
    && value.discoveredIslandIds.includes(value.character.homeIslandId)
    && value.discoveredIslandIds.includes(value.character.currentLocationId)
    && (value.activeExploration === null || isActiveExploration(value.activeExploration))
    && (!value.activeExploration
      || (value.activeExploration.locationId === value.character.currentLocationId
        && !activeVoyages.length))
    && Array.isArray(value.explorationLog)
    && value.explorationLog.length <= 100
    && value.explorationLog.every(isExplorationLogEntry)
    && Array.isArray(value.worldEventLog)
    && value.worldEventLog.length <= 100
    && value.worldEventLog.every(isWorldEventRecord)
    && isShipConstructionStateValid(shipConstruction, ships)
    && Array.isArray(value.voyages)
    && value.voyages.length <= 100
    && value.voyages.every((voyage) => isVoyage(voyage, ships))
    && activeVoyages.length <= 1
    && (activeVoyages.length === 0
      ? ships.every((ship) => ship.status !== 'traveling')
      : ships.some((ship) => ship.status === 'traveling'
        && ship.currentLocationId === activeVoyages[0].originId
        && value.character.currentLocationId === activeVoyages[0].originId))
}

function isSocialPlayerInventory(value: unknown): value is SocialPlayerInventory {
  return isRecord(value)
    && typeof value.playerId === 'string'
    && mockPlayers.some((player) => player.id === value.playerId)
    && Array.isArray(value.slots)
    && value.slots.every(isInventorySlot)
}

function isSocialTradeOffer(value: unknown): value is SocialTradeOffer {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.playerId === 'string'
    && mockPlayers.some((player) => player.id === value.playerId)
    && isItemQuantity(value.offered)
    && isItemQuantity(value.requested)
    && (value.status === 'pending' || value.status === 'accepted' || value.status === 'declined')
    && isFiniteNumber(value.createdAt)
    && (value.resolvedAt === null || isFiniteNumber(value.resolvedAt))
    && (value.status === 'pending' ? value.resolvedAt === null : isFiniteNumber(value.resolvedAt))
}

function isCombatSession(value: unknown): value is CombatSession {
  if (!isRecord(value) || typeof value.encounterId !== 'string') return false
  const encounter = combatEncounters.find((entry) => entry.id === value.encounterId)
  return encounter !== undefined
    && typeof value.id === 'string'
    && isWithinRange(value.opponentHealth, 1, encounter.opponentHealth)
    && Number.isInteger(value.opponentHealth)
    && typeof value.rounds === 'number'
    && Number.isInteger(value.rounds)
    && value.rounds >= 0
    && isFiniteNumber(value.startedAt)
}

function isCombatLogEntry(value: unknown): value is CombatLogEntry {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.encounterId === 'string'
    && combatEncounters.some((encounter) => encounter.id === value.encounterId)
    && (value.encounterType === 'pirate' || value.encounterType === 'raid' || value.encounterType === 'duel')
    && typeof value.opponentName === 'string'
    && typeof value.locationId === 'string'
    && islandDefinitions.some((island) => island.id === value.locationId)
    && (value.outcome === 'victory' || value.outcome === 'defeat' || value.outcome === 'retreated')
    && typeof value.rounds === 'number'
    && Number.isInteger(value.rounds)
    && value.rounds >= 0
    && isFiniteNumber(value.occurredAt)
    && Array.isArray(value.loot)
    && value.loot.every(isItemQuantity)
    && Array.isArray(value.droppedItems)
    && value.droppedItems.every(isItemQuantity)
}

const survivalAilmentIds: readonly string[] = [
    'bleeding', 'infection', 'heatstroke', 'hypothermia', 'poisoning',
    'sunburn', 'sprain', 'fracture', 'blisters', 'insectBites', 'tropicalFever',
    'diarrhea', 'allergy', 'smoke', 'marineSting', 'dehydration', 'burns',
    'frostbite', 'animalBite', 'exhaustion',
]

function isSurvivalAilmentId(value: unknown): value is SurvivalAilmentId {
  return typeof value === 'string' && survivalAilmentIds.includes(value)
}

function isSurvivalAilment(value: unknown): value is SurvivalAilment {
  if (!isRecord(value)
    || !isSurvivalAilmentId(value.id)
    || !isFiniteNumber(value.elapsedMs)
    || value.elapsedMs < 0
    || (value.severity !== undefined
      && value.severity !== 'mild'
      && value.severity !== 'moderate'
      && value.severity !== 'severe')) return false
  return value.id !== 'bleeding' || value.elapsedMs < 5 * 60 * 1000
}

function isCropId(value: unknown): value is CropId {
  return value === 'fruit' || value === 'herb' || value === 'coconut'
}

function isFarmPlot(value: unknown, buildings: PlayerBuilding[]): value is FarmPlot {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.buildingId === 'string'
    && buildings.some((building) => (
      building.id === value.buildingId
      && building.definitionId === 'building_garden_bed'
      && building.status === 'completed'
    ))
    && isCropId(value.cropId)
    && isFiniteNumber(value.plantedAt)
    && isFiniteNumber(value.readyAt)
    && value.readyAt > value.plantedAt
}

function isLivestockPen(value: unknown, buildings: PlayerBuilding[]): value is LivestockPen {
  if (!isRecord(value) || typeof value.buildingId !== 'string') return false
  const building = buildings.find((entry) => entry.id === value.buildingId)
  if (!building || building.status !== 'completed') return false
  const isChickenCoop = building.definitionId === 'building_chicken_coop'
  const isGoatPen = building.definitionId === 'building_goat_pen'
  if (!isChickenCoop && !isGoatPen) return false

  const chickenValid = value.chickenCount === undefined
    ? value.nextEggAt === undefined
    : isChickenCoop
      && isFiniteNumber(value.chickenCount)
      && Number.isInteger(value.chickenCount)
      && value.chickenCount >= 1
      && value.chickenCount <= 3
      && isFiniteNumber(value.nextEggAt)
  const goatValid = value.goatCount === undefined
    ? value.nextMilkAt === undefined
    : isGoatPen
      && isFiniteNumber(value.goatCount)
      && Number.isInteger(value.goatCount)
      && value.goatCount >= 1
      && value.goatCount <= 2
      && isFiniteNumber(value.nextMilkAt)
  return (isChickenCoop ? chickenValid : value.chickenCount === undefined && value.nextEggAt === undefined)
    && (isGoatPen ? goatValid : value.goatCount === undefined && value.nextMilkAt === undefined)
    && (chickenValid || goatValid)
}

function isWaterCollectorState(value: unknown): value is WaterCollectorState {
  return isRecord(value)
    && isFiniteNumber(value.storedUnits)
    && Number.isInteger(value.storedUnits)
    && value.storedUnits >= 0
    && value.storedUnits <= 10
    && isFiniteNumber(value.progressMs)
    && value.progressMs >= 0
    && value.progressMs < 60_000
}

function isGameSnapshot(value: unknown): value is GameSnapshot {
  if (!isGameSnapshotV4(value) || !isRecord(value)) return false
  const itemDurability = value.itemDurability
  if (itemDurability !== undefined && (!isRecord(itemDurability)
    || !Object.entries(itemDurability).every(([itemId, durability]) => (
      isItemId(itemId)
      && itemDefinitions[itemId].maxDurability !== undefined
      && isFiniteNumber(durability)
      && Number.isInteger(durability)
      && durability >= 1
      && durability <= (itemDefinitions[itemId].maxDurability ?? 0)
    )))) return false
  const activeCombat = value.activeCombat
  if (activeCombat !== null && !isCombatSession(activeCombat)) return false
  const playerInventories = value.socialPlayerInventories
  if (!Array.isArray(playerInventories) || !playerInventories.every(isSocialPlayerInventory)) return false
  const playerInventoryIds = playerInventories.map((entry) => entry.playerId)
  const campfireFuel = value.campfireFuel
  const clothesDrying = value.clothesDrying
  const equippedWeaponId = value.equippedWeaponId
  const equippedAccessoryId = value.equippedAccessoryId
  return Array.isArray(value.friendIds)
    && (equippedWeaponId === undefined
      || (isItemId(equippedWeaponId)
        && itemDefinitions[equippedWeaponId].category === 'tool'
        && equippedWeaponId !== 'item_backpack'
        && !value.inventory.slots.some((slot) => slot.itemId === equippedWeaponId)))
    && (equippedAccessoryId === undefined
      || (isItemId(equippedAccessoryId)
        && isAccessoryItem(equippedAccessoryId)
        && value.inventory.slots.some((slot) => slot.itemId === equippedAccessoryId)))
    && (campfireFuel === undefined || (isRecord(campfireFuel)
      && Object.entries(campfireFuel).every(([buildingId, fuel]) => (
        typeof buildingId === 'string'
        && value.buildings.some((building) => (
          building.id === buildingId
          && building.definitionId === 'building_campfire'
          && building.status === 'completed'
        ))
        && isRecord(fuel)
        && isFiniteNumber(fuel.remainingMs)
        && fuel.remainingMs >= 0
        && isFiniteNumber(fuel.lastUpdatedAt)
        && fuel.lastUpdatedAt >= 0
      ))))
    && (clothesDrying === undefined || clothesDrying === null || (
      isRecord(clothesDrying)
      && typeof clothesDrying.buildingId === 'string'
      && value.buildings.some((building) => (
        building.id === clothesDrying.buildingId
        && building.definitionId === 'building_campfire'
        && building.status === 'completed'
      ))
      && isFiniteNumber(clothesDrying.startedAt)
      && clothesDrying.startedAt >= 0
      && isFiniteNumber(clothesDrying.completesAt)
      && clothesDrying.completesAt > clothesDrying.startedAt
    ))
    && (value.weather === undefined || isValidWeatherState(value.weather))
    && (value.randomWorldEvents === undefined || (
      Array.isArray(value.randomWorldEvents)
      && value.randomWorldEvents.length <= 50
      && value.randomWorldEvents.every(isRandomWorldEventRecord)
      && value.randomWorldEvents.filter((record) => record.status === 'pending').length <= 1
    ))
    && (value.nextRandomWorldEventAt === undefined || isFiniteNumber(value.nextRandomWorldEventAt))
    && (value.randomWorldEventScheduleVersion === undefined
      || value.randomWorldEventScheduleVersion === 2)
    && (value.randomWorldEventSeed === undefined
      || (typeof value.randomWorldEventSeed === 'string' && value.randomWorldEventSeed.length <= 200))
    && new Set(value.friendIds).size === value.friendIds.length
    && value.friendIds.every((id) => typeof id === 'string' && mockPlayers.some((player) => player.id === id))
    && playerInventories.length === mockPlayers.length
    && new Set(playerInventoryIds).size === playerInventoryIds.length
    && mockPlayers.every((player) => playerInventoryIds.includes(player.id))
    && Array.isArray(value.tradeOffers)
    && value.tradeOffers.length <= 100
    && value.tradeOffers.every(isSocialTradeOffer)
    && (activeCombat === null
      || (value.character.status === 'alive'
        && value.character.currentLocationId === combatEncounters
          .find((encounter) => encounter.id === activeCombat.encounterId)?.locationId))
    && Array.isArray(value.combatLog)
    && value.combatLog.length <= 100
    && value.combatLog.every(isCombatLogEntry)
    && (value.tutorialCompletedStepIds === undefined
      || (Array.isArray(value.tutorialCompletedStepIds)
        && value.tutorialCompletedStepIds.length <= 20
        && value.tutorialCompletedStepIds.every((id) => typeof id === 'string' && id.length <= 60)
        && new Set(value.tutorialCompletedStepIds).size === value.tutorialCompletedStepIds.length))
    && (value.tutorialIntroCompleted === undefined || typeof value.tutorialIntroCompleted === 'boolean')
    && (value.appliedAdminCommandIds === undefined || (
      Array.isArray(value.appliedAdminCommandIds)
      && value.appliedAdminCommandIds.length <= 100
      && value.appliedAdminCommandIds.every((id) => typeof id === 'string' && id.length <= 80)
      && new Set(value.appliedAdminCommandIds).size === value.appliedAdminCommandIds.length
    ))
    && (value.isResting === undefined || typeof value.isResting === 'boolean')
    && (value.isWarmingAtCampfire === undefined || typeof value.isWarmingAtCampfire === 'boolean')
    && (value.ailments === undefined || (
      Array.isArray(value.ailments)
      && value.ailments.length <= 20
      && value.ailments.every(isSurvivalAilment)
      && new Set(value.ailments.map((ailment) => isRecord(ailment) ? ailment.id : undefined)).size === value.ailments.length
    ))
    && (value.farmPlots === undefined || (
      Array.isArray(value.farmPlots)
      && value.farmPlots.length <= 50
      && value.farmPlots.every((plot) => isFarmPlot(plot, value.buildings))
      && new Set(value.farmPlots.map((plot) => isRecord(plot) ? plot.buildingId : undefined)).size === value.farmPlots.length
      && new Set(value.farmPlots.map((plot) => isRecord(plot) ? plot.id : undefined)).size === value.farmPlots.length
    ))
    && (value.livestockPens === undefined || (
      Array.isArray(value.livestockPens)
      && value.livestockPens.length <= 50
      && value.livestockPens.every((pen) => isLivestockPen(pen, value.buildings))
      && new Set(value.livestockPens.map((pen) => isRecord(pen) ? pen.buildingId : undefined)).size === value.livestockPens.length
    ))
    && (value.waterCollectors === undefined || (
      isRecord(value.waterCollectors)
      && Object.entries(value.waterCollectors).every(([buildingId, collector]) => (
        value.buildings.some((building) => (
          building.id === buildingId
          && building.definitionId === 'building_rain_collector'
          && building.status === 'completed'
        ))
        && isWaterCollectorState(collector)
      ))
    ))
    && (value.backpackEquipped === undefined || typeof value.backpackEquipped === 'boolean')
    && (value.backpackEquipped !== true || value.inventory.maxSlots >= 24)
    && (value.character.status !== 'dead' || value.survival.health === 0)
}

export function isValidGameSnapshot(value: unknown): value is GameSnapshot {
  return isGameSnapshot(value)
}

export function normalizeLegacyGameSnapshot(value: unknown): GameSnapshot | null {
  const migrated = migrateLegacyFishReferences(value)
  return isGameSnapshot(migrated) ? migrated : null
}

function migrateV1ToV2(value: Record<string, unknown>): GameSaveV2 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isLegacySnapshotV1(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 1 không hợp lệ, không thể nâng cấp.')
  }

  const legacyData = value.data
  return {
    schemaVersion: 2,
    savedAt: value.savedAt,
    data: {
      character: legacyData.character,
      survival: legacyData.survival,
      inventory: {
        ownerId: legacyData.character.id,
        slots: legacyData.inventory,
        maxSlots: legacyData.inventoryCapacity,
      },
      storage: {
        ownerId: legacyData.character.homeIslandId,
        slots: [],
        maxSlots: migratedStorageCapacity,
      },
      resourceNodes: initialGameState.resourceNodes.map((node) => ({ ...node })),
      activeGathering: null,
    },
  }
}

function migrateV2ToV3(value: Record<string, unknown>): GameSaveV3 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshotV2(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 2 không hợp lệ, không thể nâng cấp.')
  }

  return {
    schemaVersion: 3,
    savedAt: value.savedAt,
    data: {
      ...value.data,
      craftingQueue: [],
      buildings: [],
      constructionQueue: [],
    },
  }
}

function migrateV3ToV4(value: Record<string, unknown>): GameSaveV4 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshotV3(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 3 không hợp lệ, không thể nâng cấp.')
  }

  return {
    schemaVersion: 4,
    savedAt: value.savedAt,
    data: {
      ...value.data,
      discoveredIslandIds: [value.data.character.homeIslandId],
      activeExploration: null,
      explorationLog: [],
      worldEventLog: [],
      ships: [],
      shipConstruction: null,
      voyages: [],
    },
  }
}

function migrateV4ToV5(value: Record<string, unknown>): GameSaveV5 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshotV4(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 4 không hợp lệ, không thể nâng cấp.')
  }

  return {
    schemaVersion: 5,
    savedAt: value.savedAt,
    data: {
      ...value.data,
      friendIds: [],
      socialPlayerInventories: mockPlayers.map((player) => ({
        playerId: player.id,
        slots: player.startingInventory.map((slot) => ({ ...slot })),
      })),
      tradeOffers: [],
      activeCombat: null,
      combatLog: [],
    },
  }
}

function migrateIncompleteV5(value: Record<string, unknown>): GameSaveV5 {
  const data = value.data
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshotV4(data)
    || !isRecord(data)
    || data.friendIds !== undefined
    || data.socialPlayerInventories !== undefined
    || data.tradeOffers !== undefined
    || data.activeCombat !== undefined
    || data.combatLog !== undefined) {
    throw new Error('Dữ liệu trò chơi phiên bản 5 không hợp lệ, không thể khôi phục.')
  }

  return {
    schemaVersion: 5,
    savedAt: value.savedAt,
    data: {
      ...data,
      friendIds: [],
      socialPlayerInventories: mockPlayers.map((player) => ({
        playerId: player.id,
        slots: player.startingInventory.map((slot) => ({ ...slot })),
      })),
      tradeOffers: [],
      activeCombat: null,
      combatLog: [],
    },
  }
}

function addLegacyFoodFreshness(container: ItemContainer, savedAt: number): ItemContainer {
  return {
    ...container,
    slots: container.slots.map((slot) => {
      const shelfLife = itemDefinitions[slot.itemId].shelfLifeMs
      return slot.expiresAt !== undefined || shelfLife === undefined
        ? slot
        : { ...slot, expiresAt: savedAt + shelfLife }
    }),
  }
}

function migrateV5ToV6(value: Record<string, unknown>): GameSaveV6 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi không hợp lệ hoặc không tương thích phiên bản.')
  }
  const savedAt = Date.parse(value.savedAt)
  return {
    schemaVersion: 6,
    savedAt: value.savedAt,
    data: {
      ...value.data,
      inventory: addLegacyFoodFreshness(value.data.inventory, savedAt),
      storage: addLegacyFoodFreshness(value.data.storage, savedAt),
    },
  }
}

function migrateV6ToV7(value: Record<string, unknown>): GameSaveV7 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 6 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: 7,
    savedAt: value.savedAt,
    data: { ...value.data, campfireFuel: value.data.campfireFuel ?? {} },
  }
}

function migrateV7ToV8(value: Record<string, unknown>): GameSaveV8 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 7 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: 8,
    savedAt: value.savedAt,
    data: { ...value.data, ailments: value.data.ailments ?? [] },
  }
}

function migrateV8ToV9(value: Record<string, unknown>): GameSaveV9 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 8 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: 9,
    savedAt: value.savedAt,
    data: { ...value.data, farmPlots: value.data.farmPlots ?? [] },
  }
}

function migrateV9ToV10(value: Record<string, unknown>): GameSaveV10 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 9 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: 10,
    savedAt: value.savedAt,
    data: { ...value.data, livestockPens: value.data.livestockPens ?? [] },
  }
}

function migrateV10ToV11(value: Record<string, unknown>): GameSaveV11 {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 10 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: 11,
    savedAt: value.savedAt,
    data: { ...value.data, waterCollectors: value.data.waterCollectors ?? {} },
  }
}

function migrateV11ToV12(value: Record<string, unknown>): GameSave {
  if (typeof value.savedAt !== 'string'
    || !Number.isFinite(Date.parse(value.savedAt))
    || !isGameSnapshot(value.data)) {
    throw new Error('Dữ liệu trò chơi phiên bản 11 không hợp lệ, không thể nâng cấp.')
  }
  return {
    schemaVersion: currentSchemaVersion,
    savedAt: value.savedAt,
    data: value.data,
  }
}

function isGameSave(value: unknown): value is GameSave {
  return isRecord(value)
    && value.schemaVersion === currentSchemaVersion
    && typeof value.savedAt === 'string'
    && Number.isFinite(Date.parse(value.savedAt))
    && isGameSnapshot(value.data)
}

export function createGameSaveService(storage: StorageAdapter = localStorageAdapter, key = gameSaveKey) {
  return {
    async load(): Promise<GameSave | null> {
      const savedValue = await storage.get<unknown>(key)
      if (savedValue === null) return null

      let candidate: unknown = savedValue
      let wasMigrated = false
      if (isRecord(candidate)
        && typeof candidate.schemaVersion === 'number'
        && candidate.schemaVersion <= 11) {
        candidate = migrateLegacyFishReferences(candidate)
      }
      if (isRecord(candidate)
        && candidate.schemaVersion === currentSchemaVersion
        && hasLegacyItemReference(candidate, 'item_driftwood')) {
        candidate = migrateLegacyFishReferences(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 1) {
        candidate = migrateV1ToV2(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 2) {
        candidate = migrateV2ToV3(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 3) {
        candidate = migrateV3ToV4(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 4) {
        candidate = migrateV4ToV5(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate)
        && candidate.schemaVersion === 5
        && isRecord(candidate.data)
        && candidate.data.friendIds === undefined
        && candidate.data.socialPlayerInventories === undefined
        && candidate.data.tradeOffers === undefined
        && candidate.data.activeCombat === undefined
        && candidate.data.combatLog === undefined) {
        candidate = migrateIncompleteV5(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 5) {
        candidate = migrateV5ToV6(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 6) {
        candidate = migrateV6ToV7(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 7) {
        candidate = migrateV7ToV8(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 8) {
        candidate = migrateV8ToV9(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 9) {
        candidate = migrateV9ToV10(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 10) {
        candidate = migrateV10ToV11(candidate)
        wasMigrated = true
      }
      if (isRecord(candidate) && candidate.schemaVersion === 11) {
        candidate = migrateV11ToV12(candidate)
        wasMigrated = true
      }

      if (isRecord(candidate) && isGameSave(candidate)) {
        const resourceNodes = candidate.data.resourceNodes
        const existingNodeIds = new Set(resourceNodes.map((node) => node.nodeId))
        const missingNodes = initialGameState.resourceNodes.filter((node) => !existingNodeIds.has(node.nodeId))
        if (missingNodes.length > 0) {
          candidate = {
            ...candidate,
            data: {
              ...candidate.data,
              resourceNodes: [...resourceNodes, ...missingNodes.map((node) => ({ ...node }))],
            },
          }
          wasMigrated = true
        }
      }

      if (!isGameSave(candidate)) {
        throw new Error('Dữ liệu trò chơi đã lưu không hợp lệ hoặc không tương thích phiên bản.')
      }
      if (wasMigrated) await storage.set(key, candidate)
      return candidate
    },

    async save(data: GameSnapshot, now: number): Promise<void> {
      if (!isGameSnapshot(data)) {
        throw new Error('Từ chối lưu dữ liệu trò chơi không hợp lệ.')
      }

      const save: GameSave = {
        schemaVersion: currentSchemaVersion,
        savedAt: new Date(now).toISOString(),
        data,
      }
      await storage.set(key, save)
    },
  }
}

export const gameSaveService = createGameSaveService()
