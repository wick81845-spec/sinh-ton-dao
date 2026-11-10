export type EcologicalRole = 'flora' | 'herbivore' | 'carnivore' | 'omnivore' | 'aquatic' | 'insect'

export interface SpeciesDefinition {
  id: string
  name: string
  role: EcologicalRole
  habitats: string[]
  diet: string[]
  predators: string[]
  activeTime: 'day' | 'night' | 'dawn_dusk' | 'varies'
  seasonal: boolean
  products: string[]
  danger: 'none' | 'low' | 'moderate' | 'high' | 'very_high'
  protected: boolean
  reproductionDays: number
  populationCap: number
}

function species(
  id: string,
  name: string,
  role: EcologicalRole,
  habitats: string[],
  diet: string[],
  products: string[],
  danger: SpeciesDefinition['danger'] = 'low',
  options: Partial<Pick<SpeciesDefinition, 'predators' | 'activeTime' | 'seasonal' | 'protected' | 'reproductionDays' | 'populationCap'>> = {},
): SpeciesDefinition {
  return {
    id,
    name,
    role,
    habitats,
    diet,
    predators: options.predators ?? [],
    activeTime: options.activeTime ?? 'day',
    seasonal: options.seasonal ?? false,
    products,
    danger,
    protected: options.protected ?? false,
    reproductionDays: options.reproductionDays ?? (role === 'flora' ? 8 : role === 'insect' ? 5 : 14),
    populationCap: options.populationCap ?? (role === 'flora' ? 300 : role === 'insect' ? 180 : 40),
  }
}

export const speciesDefinitions: readonly SpeciesDefinition[] = [
  species('palm_tree', 'Cây cọ', 'flora', ['tropical_island'], ['sunlight', 'fresh_water'], ['palm_leaf', 'wood_soft'], 'none', { reproductionDays: 30, populationCap: 80 }),
  species('softwood_tree', 'Cây thân mềm', 'flora', ['tropical_island', 'rainforest_island', 'temperate_island'], ['sunlight', 'fresh_water'], ['wood_soft', 'branch'], 'none', { reproductionDays: 24, populationCap: 120 }),
  species('hardwood_tree', 'Cây gỗ cứng', 'flora', ['rainforest_island', 'temperate_island'], ['sunlight', 'fresh_water'], ['wood_hard', 'bark'], 'none', { reproductionDays: 90, populationCap: 55 }),
  species('bamboo_grove', 'Bụi tre', 'flora', ['tropical_island', 'rainforest_island'], ['sunlight', 'fresh_water'], ['bamboo', 'plant_fiber'], 'none', { reproductionDays: 18, populationCap: 90 }),
  species('wild_berry_bush', 'Bụi quả dại', 'flora', ['tropical_island', 'rainforest_island', 'temperate_island'], ['sunlight', 'fresh_water'], ['wild_fruit'], 'none', { reproductionDays: 12, populationCap: 150 }),
  species('wild_mushroom_patch', 'Đám nấm rừng', 'flora', ['rainforest_island', 'swamp_island', 'coniferous_island'], ['organic_matter', 'moisture'], ['wild_mushroom', 'wild_herb'], 'none', { reproductionDays: 10, populationCap: 130 }),
  species('rock_fissure_shrub', 'Cây bụi khe đá', 'flora', ['rocky_island'], ['sunlight', 'sparse_water'], ['plant_fiber'], 'none', { reproductionDays: 30, populationCap: 45 }),
  species('volcanic_fern', 'Dương xỉ tiên phong', 'flora', ['volcanic_island'], ['moisture', 'volcanic_soil'], ['plant_fiber'], 'none', { reproductionDays: 24, populationCap: 70 }),
  species('mangrove_tree', 'Cây đước', 'flora', ['mangrove_island'], ['sunlight', 'brackish_water'], ['wood_hard', 'bark'], 'none', { reproductionDays: 90, populationCap: 100 }),
  species('swamp_reeds', 'Bãi lau sậy', 'flora', ['swamp_island'], ['fresh_water', 'sunlight'], ['plant_fiber'], 'none', { reproductionDays: 14, populationCap: 180 }),
  species('coral_shore_palm', 'Cọ bãi san hô', 'flora', ['coral_island'], ['sunlight', 'rainwater'], ['palm_leaf', 'wood_soft'], 'none', { reproductionDays: 40, populationCap: 35 }),
  species('pine_tree', 'Thông phương Bắc', 'flora', ['coniferous_island'], ['sunlight', 'fresh_water'], ['wood_soft', 'bark', 'tree_resin'], 'none', { reproductionDays: 60, populationCap: 110 }),
  species('tundra_lichen', 'Địa y lãnh nguyên', 'flora', ['frozen_island'], ['sunlight', 'snowmelt'], ['wild_herb'], 'none', { reproductionDays: 120, populationCap: 90 }),
  species('desert_shrub', 'Bụi gai sa mạc', 'flora', ['desert_island'], ['sunlight', 'sparse_water'], ['plant_fiber', 'wild_herb'], 'none', { reproductionDays: 60, populationCap: 40 }),
  species('ruin_vine', 'Dây leo phủ phế tích', 'flora', ['ancient_island'], ['sunlight', 'seasonal_rain'], ['plant_fiber'], 'none', { reproductionDays: 24, populationCap: 80 }),
  species('wild_rabbit', 'Thỏ rừng', 'herbivore', ['temperate_island', 'rainforest_island'], ['grass', 'leaves'], ['raw_meat', 'animal_hide', 'animal_bone'], 'low', { predators: ['wild_fox', 'wild_wolf'] }),
  species('wild_deer', 'Hươu', 'herbivore', ['temperate_island', 'coniferous_island'], ['grass', 'leaves', 'wild_fruit'], ['raw_meat', 'animal_hide', 'antler'], 'low', { predators: ['wild_wolf', 'wild_bear'], seasonal: true }),
  species('wild_goat', 'Dê hoang', 'herbivore', ['rocky_island'], ['grass', 'shrubs'], ['raw_meat', 'animal_hide', 'horn']),
  species('wild_boar', 'Lợn rừng', 'omnivore', ['rainforest_island', 'temperate_island'], ['roots', 'wild_fruit', 'wild_mushroom'], ['raw_meat', 'animal_hide', 'tusk'], 'moderate', { predators: ['wild_big_cat'] }),
  species('forest_squirrel', 'Sóc', 'herbivore', ['rainforest_island', 'temperate_island', 'coniferous_island'], ['seeds', 'wild_fruit'], ['raw_meat', 'fur'], 'low'),
  species('turtle_land', 'Rùa cạn', 'herbivore', ['tropical_island'], ['leaves', 'wild_fruit'], ['egg'], 'none', { protected: true }),
  species('wild_fox', 'Cáo', 'carnivore', ['temperate_island', 'coniferous_island'], ['wild_rabbit', 'forest_bird'], ['animal_hide', 'raw_meat'], 'low'),
  species('wild_snake', 'Rắn', 'carnivore', ['rainforest_island', 'swamp_island'], ['rodent', 'frog'], ['venom'], 'moderate', { activeTime: 'night' }),
  species('volcanic_gecko', 'Thằn lằn đá nóng', 'insect', ['volcanic_island'], ['insects'], ['research_data'], 'low', { activeTime: 'dawn_dusk' }),
  species('swamp_frog', 'Ếch đầm lầy', 'herbivore', ['swamp_island'], ['insects', 'small_invertebrates'], ['raw_meat'], 'none', { seasonal: true }),
  species('desert_scorpion', 'Bọ cạp sa mạc', 'insect', ['desert_island'], ['small_insects'], ['venom'], 'high', { activeTime: 'night' }),
  species('arctic_fox', 'Cáo Bắc Cực', 'carnivore', ['frozen_island'], ['small_mammals', 'eggs'], ['animal_hide', 'raw_meat'], 'moderate', { seasonal: true }),
  species('ruin_lizard', 'Thằn lằn phế tích', 'herbivore', ['ancient_island'], ['insects', 'leaves'], ['raw_meat'], 'low'),
  species('wild_crocodile', 'Cá sấu', 'carnivore', ['swamp_island', 'mangrove_island'], ['fish', 'small_animal'], ['animal_hide', 'raw_meat'], 'high'),
  species('wild_wolf', 'Sói', 'carnivore', ['coniferous_island', 'frozen_island'], ['wild_deer', 'wild_rabbit'], ['animal_hide', 'raw_meat'], 'high', { seasonal: true }),
  species('wild_bear', 'Gấu', 'omnivore', ['coniferous_island', 'temperate_island'], ['fish', 'wild_fruit', 'small_animal'], ['animal_hide', 'raw_meat'], 'very_high'),
  species('wild_big_cat', 'Mèo lớn', 'carnivore', ['rainforest_island'], ['wild_deer', 'wild_boar'], ['animal_hide', 'raw_meat'], 'very_high', { activeTime: 'night' }),
  species('seagull', 'Hải âu', 'omnivore', ['tropical_island', 'temperate_island', 'frozen_island'], ['small_fish', 'shellfish'], ['egg', 'feather'], 'none'),
  species('wild_duck', 'Vịt hoang', 'omnivore', ['swamp_island', 'mangrove_island'], ['aquatic_plants', 'insects'], ['raw_meat', 'egg', 'feather'], 'none'),
  species('forest_bird', 'Chim rừng', 'omnivore', ['rainforest_island', 'temperate_island'], ['seeds', 'insects', 'wild_fruit'], ['egg', 'feather'], 'none'),
  species('eagle', 'Đại bàng', 'carnivore', ['rocky_island', 'temperate_island'], ['wild_rabbit', 'fish'], ['feather'], 'moderate'),
  species('parrot', 'Vẹt', 'herbivore', ['tropical_island', 'rainforest_island'], ['seeds', 'wild_fruit'], ['egg', 'feather'], 'none'),
  species('bat', 'Dơi', 'insect', ['rocky_island', 'rainforest_island'], ['insects', 'fruit'], ['guano'], 'none', { activeTime: 'night' }),
  species('honey_bee', 'Ong mật', 'insect', ['rainforest_island', 'temperate_island'], ['nectar'], ['honey', 'beeswax'], 'low'),
  species('butterfly', 'Bướm', 'insect', ['tropical_island', 'rainforest_island', 'temperate_island'], ['nectar'], ['pollination'], 'none'),
  species('fire_ant', 'Kiến lửa', 'insect', ['tropical_island', 'rainforest_island'], ['seeds', 'small_insects'], ['venom'], 'low'),
  species('mosquito', 'Muỗi', 'insect', ['swamp_island', 'mangrove_island'], ['nectar', 'blood'], ['disease_risk'], 'low'),
  species('earthworm', 'Giun đất', 'insect', ['rainforest_island', 'temperate_island', 'swamp_island'], ['organic_matter'], ['soil_fertility'], 'none'),
  species('cricket', 'Dế', 'insect', ['tropical_island', 'temperate_island'], ['leaves', 'organic_matter'], ['animal_feed'], 'none'),
  species('anchovy', 'Cá cơm', 'aquatic', ['coastal_water', 'coral_sea'], ['plankton'], ['small_fish'], 'none', { predators: ['tuna', 'shark'], seasonal: true }),
  species('sardine', 'Cá mòi', 'aquatic', ['coastal_water', 'kelp_forest'], ['plankton'], ['small_fish'], 'none', { predators: ['tuna', 'dolphin'] }),
  species('mullet', 'Cá đối', 'aquatic', ['mangrove_water', 'coastal_water'], ['algae', 'detritus'], ['small_fish'], 'none'),
  species('sea_bass', 'Cá vược', 'aquatic', ['coastal_water', 'coral_sea'], ['small_fish', 'shrimp'], ['large_fish'], 'low'),
  species('clownfish', 'Cá hề', 'aquatic', ['coral_sea'], ['plankton', 'algae'], ['ornamental_fish'], 'none', { protected: true }),
  species('parrotfish', 'Cá mó', 'aquatic', ['coral_sea'], ['algae', 'coral_polyps'], ['large_fish'], 'none'),
  species('tuna', 'Cá ngừ', 'aquatic', ['open_ocean'], ['sardine', 'anchovy'], ['large_fish'], 'low'),
  species('mackerel', 'Cá thu', 'aquatic', ['open_ocean', 'cold_current'], ['small_fish', 'plankton'], ['large_fish'], 'low', { seasonal: true }),
  species('swordfish', 'Cá kiếm', 'aquatic', ['open_ocean'], ['large_fish', 'squid'], ['large_fish', 'animal_bone'], 'moderate'),
  species('mahi_mahi', 'Cá nục heo', 'aquatic', ['open_ocean', 'coral_sea'], ['small_fish', 'squid'], ['large_fish'], 'low'),
  species('marlin', 'Cá cờ', 'aquatic', ['open_ocean'], ['large_fish', 'squid'], ['large_fish'], 'moderate'),
  species('shark', 'Cá mập', 'carnivore', ['open_ocean', 'coral_sea'], ['fish', 'marine_mammal'], ['animal_hide', 'raw_meat', 'teeth'], 'very_high'),
  species('shrimp', 'Tôm', 'aquatic', ['coastal_water', 'mangrove_water'], ['detritus', 'plankton'], ['shrimp'], 'none'),
  species('lobster', 'Tôm hùm', 'aquatic', ['coral_sea', 'rocky_island'], ['shellfish', 'small_fish'], ['shrimp'], 'low'),
  species('crab', 'Cua', 'aquatic', ['coastal_water', 'mangrove_water'], ['algae', 'detritus'], ['crab'], 'low'),
  species('octopus', 'Bạch tuộc', 'aquatic', ['coral_sea', 'deep_ocean'], ['crab', 'shellfish'], ['octopus'], 'moderate'),
  species('squid', 'Mực', 'aquatic', ['open_ocean', 'deep_ocean'], ['small_fish', 'shrimp'], ['squid'], 'low'),
  species('sea_urchin', 'Nhím biển', 'aquatic', ['coral_sea', 'kelp_forest'], ['kelp', 'algae'], ['sea_urchin'], 'low'),
  species('sea_cucumber', 'Hải sâm', 'aquatic', ['deep_ocean', 'coral_sea'], ['organic_matter'], ['sea_cucumber'], 'none'),
  species('dolphin', 'Cá heo', 'aquatic', ['open_ocean', 'coral_sea'], ['small_fish', 'squid'], ['research_data'], 'none', { protected: true }),
  species('sea_turtle', 'Rùa biển', 'aquatic', ['coral_sea', 'coastal_water'], ['seaweed', 'jellyfish'], ['research_data'], 'none', { protected: true }),
  species('seal', 'Hải cẩu', 'aquatic', ['cold_current', 'frozen_island'], ['fish', 'squid'], ['animal_fat', 'research_data'], 'low', { protected: true }),
  species('whale', 'Cá voi', 'aquatic', ['open_ocean', 'cold_current'], ['plankton', 'small_fish'], ['research_data'], 'none', { protected: true, seasonal: true }),
  species('orca', 'Cá voi sát thủ', 'carnivore', ['cold_current', 'open_ocean'], ['seal', 'fish', 'squid'], ['research_data'], 'high', { protected: true }),
  species('giant_squid', 'Mực khổng lồ', 'aquatic', ['deep_ocean'], ['fish', 'squid'], ['research_data'], 'high', { protected: true }),
]

export const speciesDefinitionsById: Readonly<Record<string, SpeciesDefinition>> =
  Object.fromEntries(speciesDefinitions.map((entry) => [entry.id, entry]))

export const foodWebLinks = [
  { from: 'plant', to: 'wild_rabbit' },
  { from: 'wild_fruit', to: 'wild_boar' },
  { from: 'wild_rabbit', to: 'wild_fox' },
  { from: 'wild_rabbit', to: 'wild_wolf' },
  { from: 'anchovy', to: 'tuna' },
  { from: 'anchovy', to: 'dolphin' },
  { from: 'kelp', to: 'sea_urchin' },
  { from: 'kelp', to: 'sardine' },
] as const
