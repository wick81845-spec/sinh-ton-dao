import type { FishItemId } from './fish'

export type { FishItemId } from './fish'

export interface Character {
  id: string
  name: string
  appearance?: 'male' | 'female'
  homeIslandName?: string
  level: number
  experience: number
  skillExperience?: Partial<Record<SkillId, number>>
  researchedTechnologyIds?: string[]
  coins?: number
  reputation?: number
  homeIslandId: string
  currentLocationId: string
  status: 'alive' | 'dead'
  createdAt: string
  updatedAt: string
}

export type SkillId = 'gathering' | 'processing' | 'building' | 'exploration' | 'combat'

export interface SurvivalStats {
  health: number
  hunger: number
  thirst: number
  stamina: number
  temperature?: number
  bodyTemperature?: number
  wetness?: number
  conditions: string[]
}

export type SurvivalAilmentId =
  | 'bleeding'
  | 'infection'
  | 'heatstroke'
  | 'hypothermia'
  | 'poisoning'
  | 'sunburn'
  | 'sprain'
  | 'fracture'
  | 'blisters'
  | 'insectBites'
  | 'tropicalFever'
  | 'diarrhea'
  | 'allergy'
  | 'smoke'
  | 'marineSting'
  | 'dehydration'
  | 'burns'
  | 'frostbite'
  | 'animalBite'
  | 'exhaustion'

export interface SurvivalAilment {
  id: SurvivalAilmentId
  elapsedMs: number
  severity?: 'mild' | 'moderate' | 'severe'
}

export type CropId = 'fruit' | 'herb' | 'coconut'

export interface FarmPlot {
  id: string
  buildingId: string
  cropId: CropId
  plantedAt: number
  readyAt: number
}

export interface LivestockPen {
  buildingId: string
  chickenCount?: number
  nextEggAt?: number
  goatCount?: number
  nextMilkAt?: number
}

export interface WaterCollectorState {
  storedUnits: number
  progressMs: number
}

export interface WeatherState {
  weatherId: string
  locationId: string
  changedAt: number
  changesAt: number
  globalOverride?: boolean
}

export type FishingLootItemId =
  | 'item_plastic_bag'
  | 'item_glass_bottle'
  | 'item_metal_can'
  | 'item_old_shoe'
  | 'item_old_rope'
  | 'item_torn_net'
  | 'item_plastic_scrap'
  | 'item_sunken_crate'
  | 'item_metal_box'
  | 'item_ship_parts'
  | 'item_message_bottle'
  | 'item_small_chest'
  | 'item_wreckage_material'
  | 'item_ship_cable'
  | 'item_ship_bell'

export type FishingRodItemId =
  | 'item_fishing_rod'
  | 'item_fishing_rod_2'
  | 'item_fishing_rod_3'
  | 'item_fishing_rod_4'
  | 'item_fishing_rod_5'
  | 'item_fishing_rod_6'
  | 'item_fishing_rod_7'

export type ItemId =
  | 'item_wood'
  | 'item_wood_soft'
  | 'item_wood_plank'
  | 'item_wood_hard'
  | 'item_charcoal'
  | 'item_dried_fruit'
  | 'item_stone'
  | 'item_wild_fruit'
  | 'item_branch'
  | 'item_bark'
  | 'item_palm_leaf'
  | 'item_plant_fiber'
  | 'item_wild_herb'
  | 'item_wild_mushroom'
  | 'item_seashell'
  | 'item_seaweed'
  | 'item_crab'
  | 'item_shrimp'
  | 'item_rough_stone'
  | 'item_gravel'
  | 'item_clay'
  | 'item_clay_brick'
  | 'item_iron_ore'
  | 'item_copper_ore'
  | 'item_tin_ore'
  | 'item_coal'
  | 'item_iron_ingot'
  | 'item_copper_ingot'
  | 'item_bronze_ingot'
  | 'item_steel_ingot'
  | 'item_woven_cloth'
  | 'item_fiber_spool'
  | 'item_tree_resin'
  | 'item_natural_adhesive'
  | 'item_stone_pickaxe'
  | 'item_shovel'
  | 'item_fishing_spear'
  | 'item_copper_axe'
  | 'item_iron_axe'
  | 'item_fresh_water'
  | 'item_seawater'
  | 'item_coconut'
  | 'item_rotten_wood'
  | 'item_honey'
  | 'item_wooden_axe'
  | 'item_wooden_spear'
  | FishingRodItemId
  | 'item_cooked_fish'
  | 'item_roasted_crab'
  | 'item_roasted_shrimp'
  | 'item_mushroom_soup'
  | 'item_poisonous_mushroom'
  | 'item_herbal_antidote'
  | 'item_warm_tea'
  | 'item_dried_fish'
  | 'item_medicinal_poultice'
  | 'item_fruit_seed'
  | 'item_herb_seed'
  | 'item_coconut_seed'
  | 'item_clean_water'
  | 'item_filtered_water'
  | 'item_sea_salt'
  | 'item_smoked_fish'
  | 'item_salted_fish'
  | 'item_fruit_jam'
  | 'item_vegetable_stew'
  | 'item_chicken'
  | 'item_goat'
  | 'item_egg'
  | 'item_goat_milk'
  | 'item_cheese'
  | 'item_roasted_egg'
  | 'item_rope'
  | 'item_backpack'
  | 'item_fresh_fish'
  | 'item_spoiled_food'
  | FishingLootItemId
  | FishItemId

export interface InventorySlot {
  itemId: ItemId
  quantity: number
  expiresAt?: number
}

export interface ItemQuantity {
  itemId: ItemId
  quantity: number
}

export interface ItemContainer {
  ownerId: string
  slots: InventorySlot[]
  maxSlots: number
}

export interface CampfireFuelState {
  remainingMs: number
  lastUpdatedAt: number
}

export interface ClothesDryingState {
  buildingId: string
  startedAt: number
  completesAt: number
}

export interface ResourceNodeState {
  nodeId: string
  available: number
  respawnAt: number | null
}

export interface ActiveGathering {
  activityId: string
  startedAt: number
  completesAt: number
  outcome?: 'ordinary' | 'lucky' | 'adverse'
}

export interface CraftingJob {
  id: string
  recipeId: string
  startedAt: number | null
  completesAt: number | null
  fishItemId?: FishItemId | 'item_fresh_fish'
  outputQuantity?: number
}

export interface PlayerBuilding {
  id: string
  definitionId: string
  islandId: string
  level: number
  health: number
  status: 'building' | 'completed' | 'damaged'
}

export interface ConstructionJob {
  id: string
  buildingId: string
  kind: 'construction' | 'upgrade'
  targetLevel: number
  startedAt: number
  completesAt: number
}

export type IslandType = 'personal' | 'wild' | 'resource' | 'ruins'

export interface ActiveExploration {
  taskId: string
  locationId: string
  startedAt: number
  completesAt: number
}

export interface ExplorationLogEntry {
  id: string
  taskId: string
  locationId: string
  completedAt: number
  rewards: ItemQuantity[]
  discoveredIslandIds: string[]
  worldEventId: string | null
  observedSpeciesId?: string
}

export interface WorldEventRecord {
  id: string
  eventId: string
  locationId: string
  occurredAt: number
}

export type RandomEventGroup =
  | 'drift'
  | 'rescue'
  | 'mystery'
  | 'ecology'
  | 'danger'
  | 'weather'
  | 'players'
  | 'world'

export type RandomEventRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface RandomWorldEventRecord {
  id: string
  eventId: string
  locationId: string
  spawnedAt: number
  expiresAt: number
  status: 'pending' | 'resolved' | 'expired'
  choiceId: string | null
  outcome: string | null
  followUpEventId: string | null
  followUpAt: number | null
}

export interface PlayerShip {
  id: string
  definitionId: string
  currentLocationId: string
  health: number
  status: 'docked' | 'traveling' | 'damaged'
}

export interface ShipConstructionJob {
  id: string
  definitionId: string
  upgradeShipId?: string
  locationId: string
  startedAt: number
  completesAt: number
}

export type VoyageStatus = 'preparing' | 'departed' | 'traveling' | 'arrived' | 'interrupted' | 'cancelled'

export interface Voyage {
  id: string
  shipId: string
  originId: string
  destinationId: string
  status: VoyageStatus
  startedAt: number
  completesAt: number
  arrivedAt: number | null
}

export interface SocialPlayerInventory {
  playerId: string
  slots: InventorySlot[]
}

export interface SocialTradeOffer {
  id: string
  playerId: string
  offered: ItemQuantity
  requested: ItemQuantity
  status: 'pending' | 'accepted' | 'declined'
  createdAt: number
  resolvedAt: number | null
}

export interface CombatSession {
  id: string
  encounterId: string
  opponentHealth: number
  rounds: number
  startedAt: number
}

export interface CombatLogEntry {
  id: string
  encounterId: string
  encounterType: 'pirate' | 'raid' | 'duel'
  opponentName: string
  locationId: string
  outcome: 'victory' | 'defeat' | 'retreated'
  rounds: number
  occurredAt: number
  loot: ItemQuantity[]
  droppedItems: ItemQuantity[]
}

export interface GameSnapshot {
  character: Character
  survival: SurvivalStats
  ailments?: SurvivalAilment[]
  appliedAdminCommandIds?: string[]
  farmPlots?: FarmPlot[]
  livestockPens?: LivestockPen[]
  waterCollectors?: Record<string, WaterCollectorState>
  isResting?: boolean
  isWarmingAtCampfire?: boolean
  backpackEquipped?: boolean
  equippedWeaponId?: ItemId
  campfireFuel?: Record<string, CampfireFuelState>
  clothesDrying?: ClothesDryingState | null
  weather?: WeatherState
  inventory: ItemContainer
  itemDurability?: Partial<Record<ItemId, number>>
  storage: ItemContainer
  resourceNodes: ResourceNodeState[]
  activeGathering: ActiveGathering | null
  craftingQueue: CraftingJob[]
  buildings: PlayerBuilding[]
  constructionQueue: ConstructionJob[]
  discoveredIslandIds: string[]
  activeExploration: ActiveExploration | null
  explorationLog: ExplorationLogEntry[]
  worldEventLog: WorldEventRecord[]
  randomWorldEvents?: RandomWorldEventRecord[]
  nextRandomWorldEventAt?: number
  randomWorldEventScheduleVersion?: number
  randomWorldEventSeed?: string
  ships: PlayerShip[]
  shipConstruction: ShipConstructionJob | null
  voyages: Voyage[]
  friendIds: string[]
  socialPlayerInventories: SocialPlayerInventory[]
  tradeOffers: SocialTradeOffer[]
  activeCombat: CombatSession | null
  combatLog: CombatLogEntry[]
  tutorialCompletedStepIds?: string[]
  tutorialIntroCompleted?: boolean
}
