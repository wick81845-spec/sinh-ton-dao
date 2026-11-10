import type { FishItemId } from '../../shared/types/game'
import type { BiomeId } from '../../modules/world/data/biomeDefinitions'

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

export interface FishCatalogEntry {
  itemId: FishItemId
  name: string
  description: string
  rarity: FishRarity
  weight: number
  biomes: readonly BiomeId[]
  oceanZones: readonly string[]
  weatherIds?: readonly string[]
  hungerRestore: number
  usable?: boolean
}

type FishSeed = readonly [
  itemId: FishItemId,
  name: string,
  description: string,
  biomes: readonly BiomeId[],
  oceanZones: readonly string[],
  weatherIds?: readonly string[],
]

const tropicalCoast: readonly BiomeId[] = ['tropical_island', 'rainforest_island', 'mangrove_island', 'coral_island', 'desert_island']
const warmShallows: readonly BiomeId[] = ['tropical_island', 'mangrove_island', 'swamp_island', 'rainforest_island']
const reefs: readonly BiomeId[] = ['tropical_island', 'coral_island', 'rocky_island']
const temperateCoast: readonly BiomeId[] = ['rocky_island', 'temperate_island', 'coniferous_island']
const coldSeas: readonly BiomeId[] = ['coniferous_island', 'frozen_island']
const deepSea: readonly BiomeId[] = ['rocky_island', 'volcanic_island', 'ancient_island', 'frozen_island']
const coastal = ['coastal_water', 'coral_sea']
const offshore = ['open_ocean']
const wreck = ['shipwreck_zone']
const coastAndOffshore = ['coastal_water', 'coral_sea', 'open_ocean']
const offshoreAndWreck = ['open_ocean', 'shipwreck_zone']

function makeTier(
  rarity: FishRarity,
  weight: number,
  hungerRestore: number,
  seeds: readonly FishSeed[],
): FishCatalogEntry[] {
  return seeds.map(([itemId, name, description, biomes, oceanZones, weatherIds]) => ({
    itemId,
    name,
    description,
    rarity,
    weight,
    biomes,
    oceanZones,
    ...(weatherIds ? { weatherIds } : {}),
    hungerRestore,
  }))
}

export const fishCatalog: readonly FishCatalogEntry[] = [
  ...makeTier('common', 10, 14, [
    ['item_anchovy', 'Cá cơm', 'Cá nhỏ màu bạc thường tụ thành đàn gần bờ.', tropicalCoast, coastal],
    ['item_sardine', 'Cá mòi', 'Cá thân bạc bơi thành đàn ở vùng biển ven đảo.', tropicalCoast, coastal],
    ['item_herring', 'Cá trích', 'Cá nhỏ sống thành đàn ở vùng biển mát.', [...temperateCoast, ...coldSeas], coastAndOffshore],
    ['item_mullet', 'Cá đối', 'Cá ven bờ thường kiếm ăn tại cửa lạch và bãi triều.', warmShallows, coastal],
    ['item_tilapia', 'Cá rô phi', 'Cá nước ấm khỏe mạnh, sống ở ao hồ và dòng nước lặng.', ['tropical_island', 'rainforest_island', 'swamp_island'], coastal],
    ['item_goby', 'Cá bống', 'Cá đáy nhỏ ẩn mình giữa bùn, cát và khe đá.', ['mangrove_island', 'swamp_island', 'rocky_island'], coastal],
    ['item_rabbitfish', 'Cá dìa', 'Cá ăn rong phổ biến quanh bãi đá và rạn nông.', reefs, coastal],
    ['item_scad', 'Cá nục', 'Cá biển nhỏ nhanh nhẹn, thường đi thành đàn.', tropicalCoast, coastAndOffshore],
    ['item_flying_fish', 'Cá chuồn', 'Cá mặt nước có vây ngực rộng, lướt trên sóng khi gặp nguy hiểm.', tropicalCoast, coastAndOffshore, ['sunny', 'light_wind']],
    ['item_damselfish', 'Cá thia', 'Cá rạn nhỏ nhiều màu sống quanh san hô.', reefs, coastal],
  ]),
  ...makeTier('uncommon', 5, 19, [
    ['item_small_mackerel', 'Cá thu nhỏ', 'Cá săn mồi nhanh thường xuất hiện ở vùng nước thoáng.', tropicalCoast, coastAndOffshore, ['cloudy', 'overcast', 'drizzle', 'moderate_rain']],
    ['item_red_snapper', 'Cá hồng', 'Cá thân đỏ sống quanh rạn và bãi đá.', reefs, coastal],
    ['item_grouper', 'Cá mú', 'Cá săn mồi ẩn trong các khe đá và rạn san hô.', reefs, coastal],
    ['item_catfish', 'Cá trê', 'Cá da trơn sống ở vùng nước ngọt đục và đầm lầy.', ['rainforest_island', 'mangrove_island', 'swamp_island'], coastal],
    ['item_carp', 'Cá chép', 'Cá nước ngọt khỏe, thường kiếm ăn ở hồ và vùng nước chảy chậm.', ['rainforest_island', 'temperate_island', 'swamp_island'], coastal],
    ['item_snakehead', 'Cá lóc', 'Cá nước ngọt săn mồi, ưa vùng nước ấm nhiều thực vật.', warmShallows, coastal],
    ['item_white_pomfret', 'Cá chim trắng', 'Cá thân dẹt bơi ở vùng biển ven bờ.', tropicalCoast, coastAndOffshore],
    ['item_spotted_rabbitfish', 'Cá dìa bông', 'Cá dìa có đốm, thường gặm rong ở rạn nông.', reefs, coastal],
    ['item_croaker', 'Cá đục', 'Cá cát nhỏ thường kiếm ăn ở đáy vùng ven bờ.', ['tropical_island', 'mangrove_island', 'temperate_island'], coastal],
    ['item_sea_bream', 'Cá kẽm', 'Cá thân dày sống quanh bãi đá và vùng nước lợ.', ['mangrove_island', 'rocky_island', 'temperate_island'], coastal],
  ]),
  ...makeTier('unusual', 2.5, 24, [
    ['item_skipjack_tuna', 'Cá ngừ sọc dưa', 'Cá ngừ nhỏ bơi nhanh thành đàn ngoài khơi.', tropicalCoast, coastAndOffshore, ['sunny', 'calm_sea', 'light_wind']],
    ['item_amberjack', 'Cá cam', 'Cá săn mồi khỏe thường tuần tra quanh rạn sâu.', reefs, coastAndOffshore],
    ['item_barracuda', 'Cá nhồng', 'Cá thân dài và nhanh, thường rình mồi ở vùng nước trong.', tropicalCoast, coastAndOffshore],
    ['item_seabass', 'Cá vược', 'Cá săn mồi sống ở cửa sông và vùng ven biển ôn đới.', ['mangrove_island', 'temperate_island', 'rocky_island'], coastal],
    ['item_trevally', 'Cá bè', 'Cá biển khỏe thường bơi theo đàn quanh các dòng chảy.', tropicalCoast, coastAndOffshore],
    ['item_leatherjacket', 'Cá bò da', 'Cá da cứng nhỏ thường lẩn quanh rạn đá.', reefs, coastal],
    ['item_parrotfish', 'Cá mó', 'Cá rạn có mỏ khỏe, gặm tảo bám trên san hô.', reefs, coastal],
    ['item_butterflyfish', 'Cá bướm biển', 'Cá rạn nhiều màu thường sống theo cặp giữa san hô.', reefs, coastal],
    ['item_lionfish', 'Cá mao tiên', 'Cá có vây xòe và gai độc thường ẩn dưới gờ đá.', reefs, coastal],
    ['item_milkfish', 'Cá măng biển', 'Cá thân bạc nhanh nhẹn sống ở vùng nước nông ấm.', tropicalCoast, coastAndOffshore],
  ]),
  ...makeTier('rare', 1, 29, [
    ['item_yellowfin_tuna', 'Cá ngừ vây vàng', 'Cá ngừ lớn bơi xa ngoài khơi và có vây ánh vàng.', tropicalCoast, offshore, ['sunny', 'calm_sea', 'light_wind']],
    ['item_bigeye_tuna', 'Cá ngừ mắt to', 'Cá ngừ biển sâu có đôi mắt lớn thích nghi với tầng nước tối.', deepSea, offshore],
    ['item_red_grouper', 'Cá hồng đỏ', 'Cá đỏ quý sống ở vùng rạn sâu và nền đá.', reefs, ['coastal_water', 'shipwreck_zone']],
    ['item_giant_grouper', 'Cá mú nghệ', 'Cá mú lớn ẩn nấp quanh các hang đá và xác tàu.', ['coral_island', 'rocky_island', 'ancient_island'], ['coastal_water', 'shipwreck_zone']],
    ['item_shortbill_swordfish', 'Cá kiếm nhỏ', 'Cá săn mồi có mỏ nhọn thường lướt nhanh ngoài khơi.', tropicalCoast, offshore],
    ['item_mahi_mahi', 'Cá mahi-mahi', 'Cá biển nhiệt đới rực màu, thường săn mồi gần mặt nước.', tropicalCoast, offshore],
    ['item_sailfish', 'Cá cờ buồm', 'Cá săn mồi tốc độ cao với chiếc vây lưng lớn như cánh buồm.', tropicalCoast, offshore],
    ['item_large_pomfret', 'Cá chim lớn', 'Cá thân dẹt lớn sống ở vùng nước sâu ngoài khơi.', temperateCoast, offshore],
    ['item_devil_grouper', 'Cá mú mặt quỷ', 'Cá mú ngụy trang có dáng vẻ dữ tợn, ẩn trong khe đá sâu.', deepSea, wreck],
    ['item_moray_eel', 'Cá chình biển', 'Cá chình lớn ẩn trong hang đá và xác tàu đắm.', deepSea, wreck],
  ]),
  ...makeTier('very_rare', 0.4, 34, [
    ['item_swordfish', 'Cá kiếm', 'Cá săn mồi lớn với chiếc mỏ dài, thường bơi ở biển sâu.', deepSea, offshore],
    ['item_blue_marlin', 'Cá cờ xanh', 'Cá cờ mạnh mẽ sống ở vùng biển khơi sâu.', deepSea, offshore],
    ['item_bluefin_tuna', 'Cá ngừ vây xanh', 'Cá ngừ khổng lồ di cư qua những vùng biển lạnh và sâu.', coldSeas, offshore, ['cloudy', 'calm_sea', 'cold']],
    ['item_giant_carp', 'Cá hô', 'Cá nước ngọt khổng lồ của những dòng sông nhiệt đới.', ['rainforest_island', 'mangrove_island'], coastal],
    ['item_sturgeon', 'Cá tầm', 'Cá lớn sống ở vùng nước mát sâu và các cửa sông.', ['temperate_island', 'coniferous_island', 'rainforest_island'], coastAndOffshore],
    ['item_whale_shark', 'Cá nhám voi', 'Cá mập hiền lành khổng lồ lọc sinh vật phù du ngoài khơi.', tropicalCoast, offshore],
    ['item_ocean_sunfish', 'Cá mặt trăng', 'Cá thân dẹt khổng lồ trôi nổi ở vùng biển rộng.', tropicalCoast, offshore],
    ['item_wolffish', 'Cá sói biển', 'Cá săn mồi răng khỏe sống ở vùng biển lạnh và đáy sâu.', coldSeas, offshore],
    ['item_giant_halibut', 'Cá bơn khổng lồ', 'Cá đáy dẹt lớn ngụy trang dưới nền cát lạnh.', coldSeas, offshore],
    ['item_giant_grouper_rare', 'Cá mú khổng lồ', 'Cá mú đồ sộ trú quanh rạn sâu và xác tàu cổ.', deepSea, wreck],
  ]),
  ...makeTier('epic', 0.15, 40, [
    ['item_sea_dragon', 'Cá rồng biển', 'Sinh vật biển kỳ lạ với vây giống tán rong biển.', reefs, ['coastal_water', 'shipwreck_zone']],
    ['item_oarfish', 'Cá mái chèo', 'Cá thân dài hiếm gặp ở tầng nước sâu ngoài khơi.', deepSea, offshore],
    ['item_megamouth_shark', 'Cá nhám miệng rộng', 'Cá mập biển sâu hiếm hoi với chiếc miệng rộng lọc sinh vật phù du.', deepSea, offshoreAndWreck],
    ['item_great_hammerhead', 'Cá mập đầu búa lớn', 'Cá mập săn mồi tuần tra vùng biển nhiệt đới sâu.', tropicalCoast, offshore, ['sunny', 'calm_sea']],
    ['item_mako_shark', 'Cá mập mako', 'Cá mập săn mồi nhanh bậc nhất ngoài khơi.', tropicalCoast, offshore],
    ['item_great_white_shark', 'Cá mập trắng', 'Cá mập lớn săn mồi ở vùng biển rộng và sâu.', ['temperate_island', 'coniferous_island', 'frozen_island'], offshore],
    ['item_tiger_shark', 'Cá mập hổ', 'Cá mập săn mồi lớn thường xuất hiện quanh vùng biển ấm.', tropicalCoast, offshore],
    ['item_greenland_shark', 'Cá mập Greenland', 'Cá mập sống lâu ở vùng biển lạnh sâu.', coldSeas, offshore],
    ['item_giant_lanternfish', 'Cá đèn lồng khổng lồ', 'Loài cá phát sáng hiếm thấy trong tầng biển tối.', deepSea, wreck],
    ['item_coelacanth', 'Cá vây tay', 'Loài cá cổ xưa tưởng đã biến mất, trú trong hang biển sâu.', deepSea, wreck],
  ]),
  ...makeTier('legendary', 0.0015, 48, [
    ['item_black_dragonfish', 'Cá rồng đen biển sâu', 'Biến thể huyền thoại phát sáng trong bóng tối đáy biển.', deepSea, wreck],
    ['item_ancient_megamouth', 'Cá mập Megamouth cổ đại', 'Cá mập khổng lồ cổ xưa chỉ xuất hiện trong truyền thuyết.', deepSea, wreck],
    ['item_giant_shark', 'Cá mập khổng lồ', 'Sinh vật săn mồi khổng lồ từ những vùng biển chưa được khám phá.', deepSea, offshoreAndWreck],
    ['item_giant_manta', 'Cá đuối quỷ khổng lồ', 'Cá đuối khổng lồ lướt qua biển sâu như một chiếc bóng.', tropicalCoast, offshore],
    ['item_white_orca', 'Cá voi sát thủ trắng', 'Biến thể cá voi sát thủ trắng hiếm gặp ở biển lạnh.', coldSeas, offshore],
    ['item_ancient_swordfish', 'Cá kiếm cổ đại', 'Cá kiếm khổng lồ mang dấu tích của một thời đại xa xưa.', deepSea, offshoreAndWreck],
    ['item_golden_tuna', 'Cá ngừ hoàng kim', 'Cá ngừ huyền thoại có lớp vảy ánh vàng rực rỡ.', tropicalCoast, offshore, ['sunny', 'calm_sea']],
    ['item_giant_sunfish', 'Cá mặt trăng khổng lồ', 'Biến thể cá mặt trăng lớn nhất từng được ghi nhận.', tropicalCoast, offshore],
    ['item_deep_sea_dragonfish', 'Cá rồng biển sâu', 'Rồng biển truyền thuyết sống trong vực nước tối.', deepSea, wreck],
    ['item_leviathan', 'Leviathan biển sâu', 'Sinh vật biển hư cấu khổng lồ chỉ được kể trong những truyền thuyết cổ.', deepSea, wreck],
  ]),
]

export const fishItemIds: readonly FishItemId[] = fishCatalog.map((fish) => fish.itemId)
