import type { ItemId } from '../../shared/types/game'

export type ResourceCategory =
  | 'BIO'
  | 'GEO'
  | 'ORE'
  | 'MAR'
  | 'ANI'
  | 'MED'
  | 'FIB'
  | 'FOD'
  | 'CHE'
  | 'FUE'
  | 'SAL'
  | 'ADV'

export type ResourceRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'unique'
export type ResourceAbundance = 'abundant' | 'common' | 'uncommon' | 'rare' | 'very_rare'

export interface ResourceDefinition {
  id: string
  name: string
  category: ResourceCategory
  tier: number
  rarity: ResourceRarity
  inventoryItemId: ItemId | null
  image: string
  sources: {
    biomes: string[]
    locations: string[]
  }
  abundanceByBiome: Partial<Record<string, ResourceAbundance>>
  harvesting: {
    method: string
    toolItemId?: ItemId
    toolId?: string
    minimumToolTier: number
    baseYield: [number, number]
    durationSeconds: number
    staminaCost: number
  }
  processing: string[]
  uses: string[]
  regeneration: {
    type: string
    enabled: boolean
    respawnSeconds: number
  }
  stackLimit: number
}

const starterResources: ResourceDefinition[] = [
  {
    id: 'driftwood',
    name: 'Gỗ trôi dạt',
    category: 'SAL',
    tier: 1,
    rarity: 'common',
    inventoryItemId: 'item_wood',
    image: '/assets/resources/driftwood.png',
    sources: {
      biomes: ['tropical_island'],
      locations: ['shoreline'],
    },
    abundanceByBiome: { tropical_island: 'common' },
    harvesting: {
      method: 'salvage',
      minimumToolTier: 0,
      baseYield: [3, 3],
      durationSeconds: 5,
      staminaCost: 8,
    },
    processing: ['charcoal'],
    uses: ['basic_shelter', 'wooden_tool', 'campfire'],
    regeneration: {
      type: 'tidal_drift',
      enabled: true,
      respawnSeconds: 120,
    },
    stackLimit: 99,
  },
  {
    id: 'pebble',
    name: 'Đá cuội',
    category: 'GEO',
    tier: 1,
    rarity: 'common',
    inventoryItemId: 'item_stone',
    image: '/assets/resources/pebble.png',
    sources: {
      biomes: ['tropical_island', 'rocky_island'],
      locations: ['rocky-outcrop'],
    },
    abundanceByBiome: { tropical_island: 'common', rocky_island: 'common' },
    harvesting: {
      method: 'gather_by_hand',
      minimumToolTier: 0,
      baseYield: [2, 2],
      durationSeconds: 7,
      staminaCost: 10,
    },
    processing: [],
    uses: ['stone_tool', 'basic_shelter'],
    regeneration: {
      type: 'shore_deposit',
      enabled: true,
      respawnSeconds: 180,
    },
    stackLimit: 99,
  },
  {
    id: 'wild_fruit',
    name: 'Trái cây dại',
    category: 'FOD',
    tier: 1,
    rarity: 'common',
    inventoryItemId: 'item_wild_fruit',
    image: '/assets/resources/wild-fruit.png',
    sources: {
      biomes: ['tropical_island', 'rainforest_island', 'temperate_island'],
      locations: ['wild-grove'],
    },
    abundanceByBiome: { tropical_island: 'common', rainforest_island: 'abundant', temperate_island: 'common' },
    harvesting: {
      method: 'forage',
      minimumToolTier: 0,
      baseYield: [2, 3],
      durationSeconds: 4,
      staminaCost: 5,
    },
    processing: ['dried_fruit'],
    uses: ['food'],
    regeneration: {
      type: 'plant_growth',
      enabled: true,
      respawnSeconds: 90,
    },
    stackLimit: 20,
  },
  {
    id: 'wood_soft',
    name: 'Gỗ mềm',
    category: 'BIO',
    tier: 1,
    rarity: 'common',
    inventoryItemId: 'item_wood_soft',
    image: '/assets/resources/wood-soft.png',
    sources: {
      biomes: ['tropical_island', 'rainforest_island', 'rocky_island', 'volcanic_island', 'frozen_island'],
      locations: ['forest-edge'],
    },
    abundanceByBiome: { tropical_island: 'common', rainforest_island: 'common', rocky_island: 'rare', volcanic_island: 'rare', frozen_island: 'common' },
    harvesting: {
      method: 'logging',
      toolItemId: 'item_wooden_axe',
      minimumToolTier: 1,
      baseYield: [2, 5],
      durationSeconds: 10,
      staminaCost: 18,
    },
    processing: ['wood_plank', 'charcoal'],
    uses: ['basic_shelter', 'wooden_tool', 'campfire'],
    regeneration: {
      type: 'tree_growth',
      enabled: true,
      respawnSeconds: 240,
    },
    stackLimit: 99,
  },
]

type CatalogResourceInput = Omit<ResourceDefinition, 'inventoryItemId' | 'image' | 'harvesting' | 'processing' | 'uses' | 'regeneration' | 'stackLimit' | 'abundanceByBiome'> & {
  inventoryItemId?: ItemId
  image?: string
  harvestingMethod: string
  toolItemId?: ItemId
  toolId?: string
  abundanceOverrides?: Partial<Record<string, ResourceAbundance>>
  yieldRange?: [number, number]
  durationSeconds?: number
  locations: string[]
}

const harvestingStaminaCosts: Record<string, number> = {
  salvage: 8,
  gather_by_hand: 8,
  forage: 6,
  forage_tidal: 6,
  harvest: 8,
  harvest_fiber: 8,
  logging: 18,
  cut_bamboo: 16,
  quarry: 16,
  mining: 18,
  protected_mining: 12,
  shovel: 14,
  dig: 14,
  fishing: 12,
  net_fishing: 12,
  trap: 6,
  controlled_diving: 20,
  diving: 20,
  butchery: 12,
  gather_nest: 6,
  gather_feathers: 6,
  hive_harvest: 10,
  collect_water: 6,
  strip_bark: 9,
  tap_tree: 8,
}

const catalogProcessing: Record<string, string[]> = {
  wood_hard: ['wood_plank', 'wood_beam'],
  branch: ['charcoal', 'wood_frame'],
  bark: ['bark_rope', 'tanning_tannin'],
  palm_leaf: ['thatch', 'woven_mat'],
  plant_fiber: ['plant_rope', 'woven_cloth'],
  bamboo: ['treated_bamboo'],
  tree_resin: ['natural_adhesive', 'waterproof_coating'],
  wild_herb: ['herbal_remedy'],
  wild_mushroom: ['dried_mushroom'],
  fresh_water: ['water_purification'],
  rotten_wood: ['charcoal'],
  rough_stone: ['stone_block'],
  limestone: ['quicklime'],
  sand: ['glass_batch'],
  clay: ['pottery', 'brick'],
  gravel: ['foundation_mix'],
  small_fish: ['dried_fish', 'salted_fish'],
  large_fish: ['dried_fish', 'salted_fish'],
  shrimp: ['cleaned_seafood'],
  crab: ['cleaned_seafood'],
  squid: ['dried_squid'],
  seaweed: ['dried_seaweed', 'organic_fertilizer'],
  seashell: ['shell_lime'],
  coral: ['coral_sample'],
  pearl: ['polished_pearl'],
  raw_meat: ['cooked_meat', 'dried_meat', 'salted_meat'],
  animal_hide: ['tanned_leather'],
  animal_bone: ['bone_tool'],
  animal_fat: ['rendered_fat'],
  feather: ['feather_padding'],
  egg: ['cooked_egg'],
  honey: ['honey_food'],
  beeswax: ['beeswax_candle'],
  iron_ore: ['crushed_iron_ore', 'raw_iron'],
  copper_ore: ['crushed_copper_ore', 'copper_ingot'],
  tin_ore: ['crushed_tin_ore', 'tin_ingot'],
  coal: ['charcoal_fuel'],
  sulfur_ore: ['refined_sulfur'],
  quartz: ['glass_batch', 'quartz_component'],
}

const catalogUses: Record<string, string[]> = {
  wood_hard: ['house', 'ship', 'durable_tool'],
  branch: ['firewood', 'wood_frame', 'basic_tool'],
  bark: ['binding', 'rope', 'tanning'],
  palm_leaf: ['thatch_roof', 'woven_mat'],
  plant_fiber: ['rope', 'cloth', 'sail'],
  bamboo: ['raft', 'frame', 'spear'],
  tree_resin: ['adhesive', 'waterproofing'],
  wild_herb: ['medicine', 'herbal_tea'],
  wild_mushroom: ['food', 'medicine'],
  fresh_water: ['hydration'],
  rotten_wood: ['firewood'],
  rough_stone: ['building', 'stone_tool'],
  limestone: ['lime', 'mortar'],
  sand: ['construction', 'glass'],
  clay: ['pottery', 'brick'],
  gravel: ['foundation', 'road'],
  small_fish: ['food', 'trade'],
  large_fish: ['food', 'trade'],
  shrimp: ['food'],
  crab: ['food'],
  squid: ['food', 'trade'],
  seaweed: ['food', 'fertilizer'],
  seashell: ['decoration', 'shell_lime'],
  coral: ['research', 'decoration'],
  pearl: ['trade', 'crafting'],
  raw_meat: ['food'],
  animal_hide: ['clothing', 'equipment'],
  animal_bone: ['tool', 'weapon'],
  animal_fat: ['fuel', 'food_processing'],
  feather: ['clothing', 'bedding'],
  egg: ['food'],
  honey: ['food', 'medicine'],
  beeswax: ['candle', 'waterproofing'],
  iron_ore: ['metal_tool', 'building'],
  copper_ore: ['copper_tool', 'alloy'],
  tin_ore: ['bronze_alloy'],
  coal: ['smelting_fuel'],
  sulfur_ore: ['chemistry'],
  quartz: ['glass', 'research'],
}

function catalogResource(input: CatalogResourceInput): ResourceDefinition {
  const imageByCategory: Record<ResourceCategory, string> = {
    BIO: '/assets/resources/softwood.svg',
    GEO: '/assets/resources/pebble.svg',
    ORE: '/assets/resources/pebble.svg',
    MAR: '/assets/resources/marine-life.svg',
    ANI: '/assets/resources/animal-products.svg',
    MED: '/assets/resources/medicinal-herb.svg',
    FIB: '/assets/resources/plant-fiber.svg',
    FOD: '/assets/resources/wild-fruit.svg',
    CHE: '/assets/resources/pebble.svg',
    FUE: '/assets/resources/driftwood.svg',
    SAL: '/assets/resources/driftwood.svg',
    ADV: '/assets/resources/technology-scrap.svg',
  }
  const {
    harvestingMethod,
    toolItemId,
    toolId,
    abundanceOverrides,
    yieldRange = [1, 3],
    durationSeconds = 12,
    locations,
    inventoryItemId,
    image,
    ...resource
  } = input
  const defaultAbundance: ResourceAbundance = resource.rarity === 'common'
    ? 'common'
    : resource.rarity === 'uncommon'
      ? 'uncommon'
      : resource.rarity === 'rare'
        ? 'rare'
        : 'very_rare'
  const abundanceByBiome: Partial<Record<string, ResourceAbundance>> = Object.fromEntries(
    resource.sources.biomes.map((biomeId) => [biomeId, abundanceOverrides?.[biomeId] ?? defaultAbundance]),
  )
  return {
    ...resource,
    inventoryItemId: inventoryItemId ?? null,
    image: image ?? (resource.id === 'small_fish' || resource.id === 'large_fish'
      ? imageByCategory[resource.category]
      : `/assets/resources/${resource.id.replaceAll('_', '-')}.png`),
    sources: { ...resource.sources, locations },
    abundanceByBiome,
    harvesting: {
      method: harvestingMethod,
      ...(toolItemId ? { toolItemId } : {}),
      ...(toolId ? { toolId } : {}),
      minimumToolTier: toolItemId || toolId ? 1 : 0,
      baseYield: yieldRange,
      durationSeconds,
      staminaCost: harvestingStaminaCosts[harvestingMethod] ?? 10,
    },
    processing: catalogProcessing[resource.id],
    uses: catalogUses[resource.id],
    regeneration: { type: 'environmental', enabled: false, respawnSeconds: 0 },
    stackLimit: 99,
  }
}

const catalogResources: ResourceDefinition[] = [
  catalogResource({ id: 'wood_hard', name: 'Gỗ cứng', category: 'BIO', tier: 1, rarity: 'uncommon', inventoryItemId: 'item_wood_hard', sources: { biomes: ['rainforest_island', 'temperate_island'], locations: [] }, harvestingMethod: 'logging', toolItemId: 'item_iron_axe', locations: ['old-growth-forest'] }),
  catalogResource({ id: 'branch', name: 'Cành cây', category: 'BIO', tier: 1, rarity: 'common', inventoryItemId: 'item_branch', sources: { biomes: ['tropical_island', 'rainforest_island'], locations: [] }, harvestingMethod: 'gather_by_hand', locations: ['forest-floor', 'fallen-tree'] }),
  catalogResource({ id: 'bark', name: 'Vỏ cây', category: 'BIO', tier: 1, rarity: 'common', inventoryItemId: 'item_bark', sources: { biomes: ['tropical_island', 'rainforest_island', 'coniferous_island'], locations: [] }, harvestingMethod: 'strip_bark', locations: ['forest'] }),
  catalogResource({ id: 'palm_leaf', name: 'Lá cọ', category: 'BIO', tier: 1, rarity: 'common', inventoryItemId: 'item_palm_leaf', sources: { biomes: ['tropical_island'], locations: [] }, harvestingMethod: 'harvest', locations: ['palm-grove'] }),
  catalogResource({ id: 'plant_fiber', name: 'Sợi thực vật', category: 'FIB', tier: 1, rarity: 'common', inventoryItemId: 'item_plant_fiber', sources: { biomes: ['tropical_island', 'rainforest_island', 'swamp_island'], locations: [] }, harvestingMethod: 'harvest_fiber', locations: ['fiber-plants'] }),
  catalogResource({ id: 'bamboo', name: 'Tre', category: 'BIO', tier: 1, rarity: 'uncommon', sources: { biomes: ['tropical_island', 'rainforest_island'], locations: [] }, harvestingMethod: 'cut_bamboo', toolItemId: 'item_wooden_axe', locations: ['bamboo-grove'] }),
  catalogResource({ id: 'tree_resin', name: 'Nhựa cây', category: 'MED', tier: 1, rarity: 'uncommon', sources: { biomes: ['tropical_island', 'rainforest_island'], locations: [] }, harvestingMethod: 'tap_tree', locations: ['resin-tree'] }),
  catalogResource({ id: 'wild_herb', name: 'Thảo mộc', category: 'MED', tier: 1, rarity: 'common', inventoryItemId: 'item_wild_herb', sources: { biomes: ['rainforest_island', 'temperate_island', 'swamp_island'], locations: [] }, harvestingMethod: 'forage', locations: ['meadow', 'forest-floor'] }),
  catalogResource({ id: 'wild_mushroom', name: 'Nấm rừng', category: 'FOD', tier: 1, rarity: 'common', inventoryItemId: 'item_wild_mushroom', sources: { biomes: ['rainforest_island', 'temperate_island', 'coniferous_island'], locations: [] }, harvestingMethod: 'forage', locations: ['damp-forest'] }),
  catalogResource({ id: 'rough_stone', name: 'Đá thô', category: 'GEO', tier: 1, rarity: 'common', inventoryItemId: 'item_rough_stone', sources: { biomes: ['tropical_island', 'rocky_island', 'volcanic_island', 'ancient_island'], locations: [] }, harvestingMethod: 'quarry', locations: ['rock-face'] }),
  catalogResource({ id: 'limestone', name: 'Đá vôi', category: 'GEO', tier: 1, rarity: 'uncommon', sources: { biomes: ['rocky_island', 'coral_island'], locations: [] }, harvestingMethod: 'quarry', locations: ['limestone-cliff'] }),
  catalogResource({ id: 'sand', name: 'Cát', category: 'GEO', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'coral_island', 'desert_island'], locations: [] }, harvestingMethod: 'shovel', locations: ['sandy-beach'] }),
  catalogResource({ id: 'clay', name: 'Đất sét', category: 'GEO', tier: 1, rarity: 'common', inventoryItemId: 'item_clay', sources: { biomes: ['rainforest_island', 'mangrove_island', 'swamp_island', 'temperate_island'], locations: [] }, harvestingMethod: 'dig', locations: ['riverbank', 'wetland'] }),
  catalogResource({ id: 'gravel', name: 'Sỏi', category: 'GEO', tier: 1, rarity: 'common', inventoryItemId: 'item_gravel', sources: { biomes: ['tropical_island', 'rocky_island', 'temperate_island'], locations: [] }, harvestingMethod: 'gather_by_hand', locations: ['shoreline', 'riverbed'] }),
  catalogResource({ id: 'small_fish', name: 'Cá nhỏ', category: 'MAR', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'coral_island'], locations: [] }, harvestingMethod: 'fishing', locations: ['coastal_water'] }),
  catalogResource({ id: 'large_fish', name: 'Cá lớn', category: 'MAR', tier: 1, rarity: 'uncommon', sources: { biomes: ['temperate_island', 'coniferous_island'], locations: [] }, harvestingMethod: 'fishing', locations: ['open_ocean'] }),
  catalogResource({ id: 'shrimp', name: 'Tôm', category: 'MAR', tier: 1, rarity: 'common', inventoryItemId: 'item_shrimp', sources: { biomes: ['tropical_island', 'mangrove_island', 'coral_island'], locations: [] }, harvestingMethod: 'net_fishing', locations: ['shallow_seabed'] }),
  catalogResource({ id: 'crab', name: 'Cua', category: 'MAR', tier: 1, rarity: 'common', inventoryItemId: 'item_crab', sources: { biomes: ['tropical_island', 'mangrove_island', 'coral_island'], locations: [] }, harvestingMethod: 'trap', locations: ['rocky-shore', 'tidal-rocks'] }),
  catalogResource({ id: 'squid', name: 'Mực', category: 'MAR', tier: 1, rarity: 'uncommon', sources: { biomes: ['tropical_island', 'coral_island'], locations: [] }, harvestingMethod: 'fishing', locations: ['coastal_water', 'deep_ocean'] }),
  catalogResource({ id: 'seaweed', name: 'Rong biển', category: 'MAR', tier: 1, rarity: 'common', inventoryItemId: 'item_seaweed', sources: { biomes: ['tropical_island', 'coral_island', 'mangrove_island'], locations: [] }, harvestingMethod: 'forage_tidal', locations: ['tidal-zone'] }),
  catalogResource({ id: 'seashell', name: 'Vỏ sò', category: 'MAR', tier: 1, rarity: 'common', inventoryItemId: 'item_seashell', sources: { biomes: ['tropical_island', 'coral_island'], locations: [] }, harvestingMethod: 'gather_by_hand', locations: ['sandy-beach'] }),
  catalogResource({ id: 'coral', name: 'San hô', category: 'MAR', tier: 1, rarity: 'rare', sources: { biomes: ['coral_island'], locations: [] }, harvestingMethod: 'controlled_diving', locations: ['coral-reef'] }),
  catalogResource({ id: 'pearl', name: 'Ngọc trai', category: 'MAR', tier: 1, rarity: 'very_rare', sources: { biomes: ['coral_island'], locations: [] }, harvestingMethod: 'diving', locations: ['pearl-oyster-bed'] }),
  catalogResource({ id: 'raw_meat', name: 'Thịt sống', category: 'ANI', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'rainforest_island', 'temperate_island'], locations: [] }, harvestingMethod: 'butchery', locations: ['wildlife-habitat'] }),
  catalogResource({ id: 'animal_hide', name: 'Da động vật', category: 'ANI', tier: 1, rarity: 'common', sources: { biomes: ['rainforest_island', 'rocky_island', 'temperate_island'], locations: [] }, harvestingMethod: 'butchery', locations: ['wildlife-habitat'] }),
  catalogResource({ id: 'animal_bone', name: 'Xương', category: 'ANI', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'rainforest_island', 'temperate_island'], locations: [] }, harvestingMethod: 'butchery', locations: ['wildlife-habitat'] }),
  catalogResource({ id: 'animal_fat', name: 'Mỡ động vật', category: 'ANI', tier: 1, rarity: 'uncommon', sources: { biomes: ['rainforest_island', 'temperate_island', 'coniferous_island'], locations: [] }, harvestingMethod: 'butchery', locations: ['wildlife-habitat'] }),
  catalogResource({ id: 'feather', name: 'Lông chim', category: 'ANI', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'temperate_island'], locations: [] }, harvestingMethod: 'gather_feathers', locations: ['nesting-ground'] }),
  catalogResource({ id: 'egg', name: 'Trứng', category: 'FOD', tier: 1, rarity: 'common', sources: { biomes: ['tropical_island', 'mangrove_island', 'temperate_island'], locations: [] }, harvestingMethod: 'gather_nest', locations: ['nesting-ground'] }),
  catalogResource({ id: 'honey', name: 'Mật ong', category: 'FOD', tier: 1, rarity: 'uncommon', inventoryItemId: 'item_honey', sources: { biomes: ['rainforest_island', 'temperate_island'], locations: [] }, harvestingMethod: 'hive_harvest', locations: ['bee-hive'] }),
  catalogResource({ id: 'beeswax', name: 'Sáp ong', category: 'ANI', tier: 1, rarity: 'uncommon', sources: { biomes: ['rainforest_island', 'temperate_island'], locations: [] }, harvestingMethod: 'hive_harvest', locations: ['bee-hive'] }),
  catalogResource({ id: 'iron_ore', name: 'Quặng sắt', category: 'ORE', tier: 1, rarity: 'uncommon', inventoryItemId: 'item_iron_ore', sources: { biomes: ['tropical_island', 'rainforest_island', 'rocky_island', 'volcanic_island', 'frozen_island'], locations: [] }, harvestingMethod: 'mining', toolItemId: 'item_stone_pickaxe', yieldRange: [1, 2], abundanceOverrides: { tropical_island: 'rare', rainforest_island: 'rare', rocky_island: 'common', volcanic_island: 'common', frozen_island: 'common' }, locations: ['iron-deposit'] }),
  catalogResource({ id: 'copper_ore', name: 'Quặng đồng', category: 'ORE', tier: 1, rarity: 'uncommon', inventoryItemId: 'item_copper_ore', sources: { biomes: ['rocky_island', 'volcanic_island'], locations: [] }, harvestingMethod: 'mining', toolItemId: 'item_stone_pickaxe', yieldRange: [1, 2], locations: ['copper-deposit'] }),
  catalogResource({ id: 'tin_ore', name: 'Quặng thiếc', category: 'ORE', tier: 1, rarity: 'rare', inventoryItemId: 'item_tin_ore', sources: { biomes: ['rocky_island', 'temperate_island'], locations: [] }, harvestingMethod: 'mining', toolItemId: 'item_stone_pickaxe', yieldRange: [1, 2], locations: ['tin-deposit'] }),
  catalogResource({ id: 'coal', name: 'Than đá', category: 'FUE', tier: 1, rarity: 'uncommon', inventoryItemId: 'item_coal', sources: { biomes: ['rocky_island', 'volcanic_island', 'temperate_island'], locations: [] }, harvestingMethod: 'mining', toolItemId: 'item_stone_pickaxe', yieldRange: [1, 2], locations: ['coal-seam'] }),
  catalogResource({ id: 'sulfur_ore', name: 'Quặng lưu huỳnh', category: 'CHE', tier: 1, rarity: 'rare', sources: { biomes: ['rocky_island', 'volcanic_island'], locations: [] }, harvestingMethod: 'protected_mining', toolId: 'stone_pickaxe', yieldRange: [1, 2], abundanceOverrides: { rocky_island: 'rare', volcanic_island: 'abundant' }, locations: ['sulfur-vent'] }),
  catalogResource({ id: 'quartz', name: 'Thạch anh', category: 'ORE', tier: 1, rarity: 'uncommon', sources: { biomes: ['rocky_island', 'coniferous_island'], locations: [] }, harvestingMethod: 'mining', toolId: 'stone_pickaxe', yieldRange: [1, 2], locations: ['quartz-vein'] }),
  catalogResource({ id: 'fresh_water', name: 'Nước suối', category: 'MAR', tier: 1, rarity: 'common', inventoryItemId: 'item_fresh_water', image: '/assets/resources/marine-life.svg', sources: { biomes: ['tropical_island'], locations: [] }, harvestingMethod: 'collect_water', yieldRange: [2, 3], durationSeconds: 8, locations: ['freshwater-stream'] }),
  catalogResource({ id: 'rotten_wood', name: 'Gỗ mục', category: 'BIO', tier: 1, rarity: 'common', inventoryItemId: 'item_rotten_wood', image: '/assets/resources/driftwood.png', sources: { biomes: ['tropical_island'], locations: [] }, harvestingMethod: 'salvage', yieldRange: [2, 3], durationSeconds: 8, locations: ['fallen-tree'] }),
]

export const resourceDefinitions: readonly ResourceDefinition[] = [...starterResources, ...catalogResources]

export const resourceDefinitionsById: Readonly<Record<string, ResourceDefinition>> =
  Object.fromEntries(resourceDefinitions.map((resource) => [resource.id, resource]))

export function getResourceDefinition(resourceId: string): ResourceDefinition | undefined {
  return resourceDefinitionsById[resourceId]
}
