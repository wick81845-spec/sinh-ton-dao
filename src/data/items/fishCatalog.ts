import type { FishItemId } from '../../shared/types/fish'
import type { BiomeId } from '../../modules/world/data/biomeDefinitions'
import { fishPhysicalProfiles } from './fishPhysicalProfiles'

export const fishRarities = [
  'common',
  'uncommon',
  'unusual',
  'rare',
  'very_rare',
  'epic',
  'legendary',
] as const

export type FishRarity = typeof fishRarities[number]
export type FishHabitat = 'freshwater' | 'coastal' | 'offshore' | 'deep_sea'

export interface FishCatalogEntry {
  itemId: FishItemId
  name: string
  image?: string
  description: string
  rarity: FishRarity
  catchWeight: number
  lengthRangeCm: readonly [number, number]
  averageWeightKg: number
  biomes: readonly BiomeId[]
  oceanZones: readonly string[]
  habitat: FishHabitat
  catchable: boolean
  weatherIds?: readonly string[]
  hungerRestore: number
  usable?: boolean
  requiresPreparation?: boolean
}

type FishSeed = readonly [
  itemId: FishItemId,
  name: string,
  rarity: FishRarity,
  biomes: readonly BiomeId[],
  oceanZones: readonly string[],
  catchable?: boolean,
  weatherIds?: readonly string[],
]

const tropical: readonly BiomeId[] = [
  'tropical_island', 'rainforest_island', 'mangrove_island', 'coral_island', 'desert_island',
]
const warm: readonly BiomeId[] = [
  'tropical_island', 'rainforest_island', 'mangrove_island', 'swamp_island',
]
const reefs: readonly BiomeId[] = ['tropical_island', 'coral_island', 'rocky_island']
const temperate: readonly BiomeId[] = ['rocky_island', 'temperate_island', 'coniferous_island']
const cold: readonly BiomeId[] = ['coniferous_island', 'frozen_island']
const deep: readonly BiomeId[] = ['rocky_island', 'volcanic_island', 'ancient_island', 'frozen_island']
const freshwater = ['freshwater']
const coastal = ['coastal_water', 'coral_sea']
const coastAndOffshore = ['coastal_water', 'coral_sea', 'open_ocean']
const offshore = ['open_ocean']
const offshoreAndWreck = ['open_ocean', 'shipwreck_zone']
const catchable = true
const protectedOrSpecial = false
const requiresPreparationFishIds = new Set<FishItemId>(['item_lionfish', 'item_pufferfish'])
const nonEdibleFishIds = new Set<FishItemId>(['item_seahorse'])
const fishArtworkById: Partial<Record<FishItemId, string>> = {
  item_clownfish: '/assets/fish/collection/clownfish.png',
  item_seahorse: '/assets/fish/collection/seahorse.png',
  item_pacific_salmon: '/assets/foods/salmon.png',
}

const rarityStats: Readonly<Record<FishRarity, { weight: number; hungerRestore: number }>> = {
  common: { weight: 10, hungerRestore: 14 },
  uncommon: { weight: 5, hungerRestore: 18 },
  unusual: { weight: 2.5, hungerRestore: 22 },
  rare: { weight: 1, hungerRestore: 27 },
  very_rare: { weight: 0.4, hungerRestore: 32 },
  epic: { weight: 0.15, hungerRestore: 38 },
  legendary: { weight: 0.0015, hungerRestore: 44 },
}

const habitatDescriptions: Readonly<Record<FishHabitat, string>> = {
  freshwater: 'sống ở sông, suối hoặc hồ nước ngọt',
  coastal: 'sống ở vùng ven bờ, cửa lạch hoặc rạn nông',
  offshore: 'sống ở vùng biển khơi',
  deep_sea: 'sống ở vùng nước sâu và quanh các xác tàu',
}

function makeTier(seeds: readonly FishSeed[]): FishCatalogEntry[] {
  return seeds.map(([itemId, name, rarity, biomes, oceanZones, canCatch = catchable, weatherIds]) => {
    const stats = rarityStats[rarity]
    const habitat: FishHabitat = oceanZones.includes('freshwater')
      ? 'freshwater'
      : oceanZones.includes('shipwreck_zone')
        ? 'deep_sea'
        : oceanZones.includes('open_ocean') && !oceanZones.includes('coastal_water') && !oceanZones.includes('coral_sea')
          ? 'offshore'
          : 'coastal'
    return {
      itemId,
      name,
      ...(fishArtworkById[itemId] ? { image: fishArtworkById[itemId] } : {}),
      description: `${name} ${habitatDescriptions[habitat]}.`,
      rarity,
      catchWeight: stats.weight,
      ...fishPhysicalProfiles[itemId],
      biomes,
      oceanZones,
      habitat,
      catchable: canCatch,
      ...(requiresPreparationFishIds.has(itemId) ? { requiresPreparation: true } : {}),
      ...(nonEdibleFishIds.has(itemId) ? { usable: false } : {}),
      ...(weatherIds ? { weatherIds } : {}),
      hungerRestore: stats.hungerRestore,
    }
  })
}

export const fishCatalog: readonly FishCatalogEntry[] = [
  ...makeTier([
    ['item_anchovy', 'Cá cơm', 'common', tropical, coastal],
    ['item_sardine', 'Cá mòi', 'common', tropical, coastal],
    ['item_rabbitfish', 'Cá dìa', 'common', reefs, coastal],
    ['item_indian_mackerel', 'Cá bạc má', 'common', tropical, coastAndOffshore],
    ['item_scad', 'Cá nục', 'common', tropical, coastal],
    ['item_goby', 'Cá bống', 'common', ['mangrove_island', 'swamp_island', 'rocky_island'], coastal],
    ['item_small_mackerel', 'Cá thu nhỏ', 'common', tropical, coastAndOffshore],
    ['item_croaker', 'Cá đù', 'common', ['tropical_island', 'mangrove_island', 'temperate_island'], coastal],
    ['item_sand_whiting', 'Cá đục', 'common', ['tropical_island', 'desert_island', 'temperate_island'], coastal],
    ['item_pufferfish', 'Cá nóc', 'common', reefs, coastal, protectedOrSpecial],
    ['item_perch', 'Cá rô', 'common', ['tropical_island', 'rainforest_island', 'swamp_island'], freshwater, false],
    ['item_carp', 'Cá chép', 'common', ['rainforest_island', 'temperate_island', 'swamp_island', 'ancient_island'], freshwater, false],
    ['item_loach', 'Cá chạch', 'common', ['tropical_island', 'rainforest_island', 'swamp_island'], freshwater, false],
    ['item_catfish', 'Cá trê', 'common', ['rainforest_island', 'mangrove_island', 'swamp_island'], freshwater, false],
    ['item_snakehead', 'Cá lóc', 'common', warm, freshwater, false],
    ['item_gourami', 'Cá sặc', 'common', ['rainforest_island', 'swamp_island', 'mangrove_island'], freshwater, false],
    ['item_tilapia', 'Cá rô phi', 'common', ['tropical_island', 'rainforest_island', 'swamp_island'], freshwater, false],
    ['item_mullet', 'Cá đối', 'common', warm, coastal],
  ]),
  ...makeTier([
    ['item_leatherjacket', 'Cá bò da', 'uncommon', reefs, coastal],
    ['item_moray_eel', 'Cá chình Moray', 'uncommon', ['coral_island', 'rocky_island', 'ancient_island'], ['coastal_water', 'shipwreck_zone']],
    ['item_marble_goby', 'Cá bống tượng', 'uncommon', ['tropical_island', 'rainforest_island', 'swamp_island'], freshwater, false],
    ['item_seabass', 'Cá chẽm', 'uncommon', ['mangrove_island', 'temperate_island', 'rocky_island'], coastal],
    ['item_sea_bream', 'Cá kẽm', 'uncommon', ['mangrove_island', 'rocky_island', 'temperate_island'], coastal],
    ['item_spotted_scat', 'Cá nâu', 'uncommon', ['mangrove_island', 'swamp_island'], coastal],
    ['item_mackerel', 'Cá thu', 'uncommon', tropical, coastAndOffshore],
    ['item_japanese_mackerel', 'Cá thu Nhật Bản', 'uncommon', ['tropical_island', 'rocky_island', 'temperate_island'], coastAndOffshore],
    ['item_giant_gourami', 'Cá tai tượng', 'uncommon', ['rainforest_island', 'swamp_island'], freshwater, false],
    ['item_clown_knifefish', 'Cá thát lát', 'uncommon', ['rainforest_island', 'mangrove_island', 'swamp_island'], freshwater, false],
    ['item_walking_catfish', 'Cá trê phi', 'uncommon', ['rainforest_island', 'mangrove_island', 'swamp_island'], freshwater, false],
    ['item_yellow_perch', 'Cá rô vàng', 'uncommon', ['temperate_island', 'coniferous_island'], freshwater, false],
    ['item_trout', 'Cá trout', 'uncommon', ['rocky_island', 'temperate_island', 'coniferous_island'], freshwater, false],
    ['item_herring', 'Cá trích', 'uncommon', [...temperate, ...cold], coastAndOffshore],
    ['item_arctic_cod', 'Cá tuyết Bắc Cực', 'uncommon', ['coniferous_island', 'frozen_island'], coastAndOffshore],
    ['item_atlantic_cod', 'Cá tuyết Đại Tây Dương', 'uncommon', ['temperate_island', 'coniferous_island'], coastAndOffshore],
    ['item_butterflyfish', 'Cá bướm', 'uncommon', reefs, coastal, protectedOrSpecial],
    ['item_damselfish', 'Cá thia', 'uncommon', reefs, coastal, protectedOrSpecial],
    ['item_surgeonfish', 'Cá đuôi gai', 'uncommon', reefs, coastal, protectedOrSpecial],
  ]),
  ...makeTier([
    ['item_clownfish', 'Cá hề', 'unusual', reefs, coastal, protectedOrSpecial],
    ['item_parrotfish', 'Cá mó', 'unusual', reefs, coastal, protectedOrSpecial],
    ['item_lionfish', 'Cá mao tiên', 'unusual', reefs, coastal],
    ['item_grouper', 'Cá mú', 'unusual', reefs, coastal],
    ['item_milkfish', 'Cá măng', 'unusual', tropical, coastAndOffshore],
    ['item_barracuda', 'Cá nhồng', 'unusual', tropical, coastAndOffshore],
    ['item_pacific_salmon', 'Cá hồi Thái Bình Dương', 'unusual', cold, coastal],
    ['item_atlantic_salmon', 'Cá hồi Đại Tây Dương', 'unusual', ['temperate_island', 'coniferous_island'], freshwater, false],
    ['item_brown_trout', 'Cá trout nâu', 'unusual', temperate, freshwater, false],
    ['item_grayling', 'Cá grayling', 'unusual', cold, freshwater, false],
    ['item_european_eel', 'Cá chình', 'unusual', ['temperate_island', 'mangrove_island'], freshwater, false],
    ['item_japanese_eel', 'Cá chình Nhật Bản', 'unusual', ['tropical_island', 'rainforest_island', 'mangrove_island'], freshwater, false],
    ['item_walleye', 'Cá walleye', 'unusual', ['temperate_island', 'coniferous_island'], freshwater, false],
    ['item_cod', 'Cá tuyết', 'unusual', temperate, coastAndOffshore],
    ['item_atlantic_mackerel', 'Cá thu Đại Tây Dương', 'unusual', temperate, coastAndOffshore],
  ]),
  ...makeTier([
    ['item_red_snapper', 'Cá hồng', 'rare', reefs, coastal],
    ['item_seahorse', 'Cá ngựa rạn', 'rare', reefs, coastal],
    ['item_bonito', 'Cá ngừ sọc dưa', 'rare', tropical, coastAndOffshore],
    ['item_skipjack_tuna', 'Cá ngừ vằn', 'rare', tropical, offshore, catchable, ['sunny', 'calm_sea', 'light_wind']],
    ['item_yellowfin_tuna', 'Cá ngừ vây vàng', 'rare', tropical, offshore, catchable, ['sunny', 'calm_sea', 'light_wind']],
    ['item_albacore', 'Cá ngừ vây dài', 'rare', [...temperate, ...cold], offshore],
    ['item_sablefish', 'Cá sablefish', 'rare', cold, offshore],
    ['item_rainbow_trout', 'Cá trout vân', 'rare', ['rocky_island', 'temperate_island', 'coniferous_island'], freshwater, false],
    ['item_sturgeon', 'Cá tầm', 'rare', ['temperate_island', 'coniferous_island', 'rainforest_island'], freshwater, false],
    ['item_marlin', 'Cá cờ', 'rare', tropical, offshore],
    ['item_sailfish', 'Cá buồm', 'rare', tropical, offshore],
    ['item_stingray', 'Cá đuối', 'rare', tropical, coastal],
    ['item_european_seabass', 'Cá vược châu Âu', 'rare', temperate, coastAndOffshore],
    ['item_alaska_pollock', 'Cá minh thái Alaska', 'rare', cold, coastAndOffshore],
  ]),
  ...makeTier([
    ['item_mahi_mahi', 'Cá mahi-mahi', 'very_rare', tropical, offshore],
    ['item_swordfish', 'Cá kiếm', 'very_rare', tropical, offshore],
    ['item_blue_marlin', 'Cá cờ xanh', 'very_rare', tropical, offshore],
    ['item_black_marlin', 'Cá cờ đen', 'very_rare', tropical, offshore],
    ['item_bigeye_tuna', 'Cá ngừ mắt to', 'very_rare', deep, offshore],
    ['item_bluefin_tuna', 'Cá ngừ vây xanh', 'very_rare', cold, offshore],
    ['item_atlantic_bluefin_tuna', 'Cá ngừ vây xanh Đại Tây Dương', 'very_rare', temperate, offshore],
    ['item_northern_pike', 'Cá chó phương Bắc', 'very_rare', ['temperate_island', 'coniferous_island', 'frozen_island'], freshwater, false],
    ['item_arctic_char', 'Cá char Bắc Cực', 'very_rare', cold, freshwater, false],
    ['item_lake_trout', 'Cá trout hồ', 'very_rare', ['coniferous_island', 'frozen_island'], freshwater, false],
    ['item_pacific_halibut', 'Cá bơn Thái Bình Dương', 'very_rare', cold, offshore],
    ['item_arctic_flounder', 'Cá bơn Bắc Cực', 'very_rare', ['coniferous_island', 'frozen_island'], coastal],
  ]),
  ...makeTier([
    ['item_pacific_sleeper_shark', 'Cá mập ngủ Thái Bình Dương', 'epic', cold, offshore, protectedOrSpecial],
    ['item_greenland_shark', 'Cá mập Greenland', 'epic', cold, offshore, protectedOrSpecial],
    ['item_blue_shark', 'Cá mập xanh', 'epic', tropical, offshore],
    ['item_tiger_shark', 'Cá mập hổ', 'epic', tropical, offshore, protectedOrSpecial],
    ['item_wolffish', 'Cá sói biển', 'epic', cold, offshore],
    ['item_oarfish', 'Cá mái chèo', 'epic', deep, offshore, protectedOrSpecial],
    ['item_flounder', 'Cá bơn', 'epic', temperate, coastal],
    ['item_antarctic_icefish', 'Cá băng Nam Cực', 'epic', ['frozen_island'], offshore, protectedOrSpecial],
    ['item_antarctic_toothfish', 'Cá tuyết răng Nam Cực', 'epic', ['frozen_island'], offshore, protectedOrSpecial],
    ['item_conger_eel', 'Cá chình biển', 'epic', deep, offshoreAndWreck],
  ]),
  ...makeTier([
    ['item_king_mackerel', 'Cá thu ngàng', 'legendary', ['tropical_island', 'ancient_island'], offshoreAndWreck],
    ['item_reef_shark', 'Cá mập rạn san hô', 'legendary', reefs, offshore],
  ]),
]

export const fishItemIds: readonly FishItemId[] = fishCatalog.map((fish) => fish.itemId)
