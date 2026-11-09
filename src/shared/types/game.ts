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
  temperature: number
  conditions: string[]
}

export interface WeatherState {
  weatherId: string
  locationId: string
  changedAt: number
  changesAt: number
}

export type FishItemId =
  | 'item_anchovy'
  | 'item_sardine'
  | 'item_herring'
  | 'item_mullet'
  | 'item_tilapia'
  | 'item_goby'
  | 'item_rabbitfish'
  | 'item_scad'
  | 'item_flying_fish'
  | 'item_damselfish'
  | 'item_small_mackerel'
  | 'item_red_snapper'
  | 'item_grouper'
  | 'item_catfish'
  | 'item_carp'
  | 'item_snakehead'
  | 'item_white_pomfret'
  | 'item_spotted_rabbitfish'
  | 'item_croaker'
  | 'item_sea_bream'
  | 'item_skipjack_tuna'
  | 'item_amberjack'
  | 'item_barracuda'
  | 'item_seabass'
  | 'item_trevally'
  | 'item_leatherjacket'
  | 'item_parrotfish'
  | 'item_butterflyfish'
  | 'item_lionfish'
  | 'item_milkfish'
  | 'item_yellowfin_tuna'
  | 'item_bigeye_tuna'
  | 'item_red_grouper'
  | 'item_giant_grouper'
  | 'item_shortbill_swordfish'
  | 'item_mahi_mahi'
  | 'item_sailfish'
  | 'item_large_pomfret'
  | 'item_devil_grouper'
  | 'item_moray_eel'
  | 'item_swordfish'
  | 'item_blue_marlin'
  | 'item_bluefin_tuna'
  | 'item_giant_carp'
  | 'item_sturgeon'
  | 'item_whale_shark'
  | 'item_ocean_sunfish'
  | 'item_wolffish'
  | 'item_giant_halibut'
  | 'item_giant_grouper_rare'
  | 'item_sea_dragon'
  | 'item_oarfish'
  | 'item_megamouth_shark'
  | 'item_great_hammerhead'
  | 'item_mako_shark'
  | 'item_great_white_shark'
  | 'item_tiger_shark'
  | 'item_greenland_shark'
  | 'item_giant_lanternfish'
  | 'item_coelacanth'
  | 'item_black_dragonfish'
  | 'item_ancient_megamouth'
  | 'item_giant_shark'
  | 'item_giant_manta'
  | 'item_white_orca'
  | 'item_ancient_swordfish'
  | 'item_golden_tuna'
  | 'item_giant_sunfish'
  | 'item_deep_sea_dragonfish'
  | 'item_leviathan'

export const legacyFishItemIds = [
  'item_spotted_trout',
  'item_golden_tench',
  'item_mackerel',
  'item_goldfish',
  'item_striped_bream',
  'item_needlefish',
  'item_rainbow_trout',
  'item_pink_sardine',
  'item_green_minnow',
  'item_bronze_roach',
  'item_rose_perch',
  'item_blue_sprat',
  'item_parrot_minnow',
  'item_angelfish',
  'item_blue_tang',
  'item_clownfish',
  'item_yellow_clownfish',
  'item_purple_basslet',
  'item_blue_damselfish',
  'item_dwarf_lionfish',
  'item_regal_tang',
  'item_cobalt_tang',
  'item_tiger_grouper',
  'item_blue_grouper',
  'item_spotted_grouper',
  'item_red_wrasse',
  'item_reef_crabfish',
  'item_purple_grouper',
  'item_pink_anglerfish',
  'item_rainbow_scorpionfish',
  'item_seahorse_sun',
  'item_seahorse_coral',
  'item_golden_butterflyfish',
  'item_clown_triggerfish',
  'item_pufferfish',
  'item_regal_butterflyfish',
  'item_sole',
  'item_tuna',
  'item_kraken_octopus',
  'item_starlight_manta',
] as const

export type LegacyFishItemId = typeof legacyFishItemIds[number]

export type FishingLootItemId =
  | 'item_plastic_bag'
  | 'item_glass_bottle'
  | 'item_metal_can'
  | 'item_old_shoe'
  | 'item_rope'
  | 'item_torn_net'
  | 'item_driftwood'
  | 'item_plastic_scrap'
  | 'item_sunken_crate'
  | 'item_metal_box'
  | 'item_ship_parts'
  | 'item_message_bottle'
  | 'item_small_chest'
  | 'item_wreckage_material'
  | 'item_ship_cable'
  | 'item_ship_bell'

export type ItemId =
  | 'item_wood'
  | 'item_wood_soft'
  | 'item_wood_plank'
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
  | 'item_fresh_water'
  | 'item_coconut'
  | 'item_rotten_wood'
  | 'item_honey'
  | 'item_wooden_axe'
  | 'item_fresh_fish'
  | FishingLootItemId
  | FishItemId
  | LegacyFishItemId

export interface InventorySlot {
  itemId: ItemId
  quantity: number
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
  isResting?: boolean
  weather?: WeatherState
  inventory: ItemContainer
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
