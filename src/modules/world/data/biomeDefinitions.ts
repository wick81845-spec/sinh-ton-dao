import { resourceDefinitions } from '../../../data/resources/resourceDefinitions'

export type BiomeId =
  | 'tropical_island'
  | 'rainforest_island'
  | 'rocky_island'
  | 'volcanic_island'
  | 'mangrove_island'
  | 'swamp_island'
  | 'coral_island'
  | 'temperate_island'
  | 'coniferous_island'
  | 'frozen_island'
  | 'desert_island'
  | 'ancient_island'

export type AbundanceLevel = 'abundant' | 'common' | 'uncommon' | 'rare' | 'very_rare'

export interface BiomeDefinition {
  id: BiomeId
  name: string
  description: string
  climate: {
    temperature: 'hot' | 'warm' | 'temperate' | 'cold' | 'freezing'
    humidity: 'low' | 'moderate' | 'high'
    rainfall: 'arid' | 'seasonal' | 'frequent' | 'heavy'
  }
  terrain: string[]
  hazards: string[]
  specialMechanics: string[]
}

export const biomeDefinitions: readonly BiomeDefinition[] = [
  { id: 'tropical_island', name: 'Đảo nhiệt đới', description: 'Bãi cát, rừng cây thấp và nguồn nước ngọt; thích hợp làm vùng khởi đầu.', climate: { temperature: 'hot', humidity: 'high', rainfall: 'seasonal' }, terrain: ['Bãi cát', 'Rừng nhiệt đới', 'Bờ đá'], hazards: ['Nắng nóng', 'Bão theo mùa'], specialMechanics: ['Cây ăn quả sinh trưởng theo chu kỳ', 'Thủy triều đưa phế liệu vào bờ'] },
  { id: 'rainforest_island', name: 'Đảo rừng mưa', description: 'Rừng rậm ẩm ướt, đa dạng sinh vật và nhiều dược liệu.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'heavy' }, terrain: ['Rừng rậm', 'Đồng cỏ', 'Suối'], hazards: ['Côn trùng độc', 'Bệnh nhiệt đới', 'Tầm nhìn hạn chế'], specialMechanics: ['Một số sinh vật hoạt động ban đêm'] },
  { id: 'rocky_island', name: 'Đảo đá', description: 'Vách đá, sườn núi và hang động có điểm khoáng sản.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Vách đá', 'Hang động', 'Sườn núi'], hazards: ['Địa hình dốc', 'Đá lở'], specialMechanics: ['Vận chuyển hàng hóa tốn công hơn'] },
  { id: 'volcanic_island', name: 'Đảo núi lửa', description: 'Địa nhiệt và khoáng sản phong phú nhưng có vùng nguy hiểm.', climate: { temperature: 'hot', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Đá bazan', 'Miệng phun', 'Suối địa nhiệt'], hazards: ['Khí độc', 'Nhiệt độ cao', 'Phun trào'], specialMechanics: ['Một số điểm khai thác cần đồ bảo hộ'] },
  { id: 'mangrove_island', name: 'Đảo rừng ngập mặn', description: 'Rừng nước lợ với rễ cây đan dày và thủy triều mạnh.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'frequent' }, terrain: ['Rừng ngập mặn', 'Bãi bùn', 'Lạch triều'], hazards: ['Bùn sâu', 'Thủy triều'], specialMechanics: ['Lối đi thay đổi theo thủy triều', 'Một số nơi chỉ vào được bằng thuyền nhỏ'] },
  { id: 'swamp_island', name: 'Đảo đầm lầy', description: 'Đất mềm, nước tù, nấm và cây ưa ẩm.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'frequent' }, terrain: ['Đầm lầy', 'Vũng nước', 'Bãi sậy'], hazards: ['Bệnh', 'Nước sâu', 'Đất lún'], specialMechanics: ['Di chuyển trong đầm lầy tiêu hao thể lực'] },
  { id: 'coral_island', name: 'Đảo san hô', description: 'Đảo thấp với đầm phá và rạn san hô phong phú.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'seasonal' }, terrain: ['Rạn san hô', 'Đầm phá', 'Bãi cát san hô'], hazards: ['Thủy triều', 'Sinh vật độc'], specialMechanics: ['Khai thác rạn quá mức làm giảm sinh vật cư trú'] },
  { id: 'temperate_island', name: 'Đảo ôn đới', description: 'Rừng lá rộng, đồng cỏ và mùa rõ rệt.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Rừng lá rộng', 'Đồng cỏ', 'Sông'], hazards: ['Thời tiết mùa lạnh'], specialMechanics: ['Tài nguyên và động vật thay đổi theo mùa'] },
  { id: 'coniferous_island', name: 'Đảo rừng lá kim', description: 'Rừng thông và đồi núi trong khí hậu mát lạnh.', climate: { temperature: 'cold', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Rừng thông', 'Đồi', 'Hồ lạnh'], hazards: ['Mùa đông khắc nghiệt', 'Động vật săn mồi'], specialMechanics: ['Sinh trưởng giảm vào mùa đông', 'Nhựa thông thu hoạch theo mùa'] },
  { id: 'frozen_island', name: 'Đảo băng giá', description: 'Tuyết phủ, biển đóng băng theo mùa và sinh vật chịu lạnh.', climate: { temperature: 'freezing', humidity: 'low', rainfall: 'arid' }, terrain: ['Tundra', 'Băng biển', 'Vách băng'], hazards: ['Hạ thân nhiệt', 'Băng nứt', 'Bão tuyết'], specialMechanics: ['Cần quần áo và phương tiện phù hợp'] },
  { id: 'desert_island', name: 'Đảo khô hạn', description: 'Cát đá, ít mưa và nguồn nước ngọt khan hiếm.', climate: { temperature: 'hot', humidity: 'low', rainfall: 'arid' }, terrain: ['Cồn cát', 'Bãi đá', 'Ốc đảo'], hazards: ['Mất nước', 'Bão cát', 'Nắng gắt'], specialMechanics: ['Có thể phát hiện mạch nước ngầm'] },
  { id: 'ancient_island', name: 'Đảo di tích cổ', description: 'Phế tích của nền văn minh cũ, nơi cần nghiên cứu trước khi phục hồi công nghệ.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Phế tích', 'Hầm ngầm', 'Bờ đá'], hazards: ['Bẫy cũ', 'Sinh vật nguy hiểm', 'Hệ thống phòng thủ'], specialMechanics: ['Linh kiện cổ cần nghiên cứu, không thể dùng trực tiếp để chế tạo công nghệ cao'] },
]

export const biomeDefinitionsById: Readonly<Record<BiomeId, BiomeDefinition>> =
  Object.fromEntries(biomeDefinitions.map((biome) => [biome.id, biome])) as Record<BiomeId, BiomeDefinition>

export function getBiomeResources(biomeId: BiomeId) {
  return resourceDefinitions
    .filter((resource) => resource.abundanceByBiome[biomeId] !== undefined)
    .map((resource) => ({
      id: resource.id,
      name: resource.name,
      image: resource.image,
      category: resource.category,
      abundance: resource.abundanceByBiome[biomeId] ?? 'common',
    }))
}

export function isBiomeId(value: unknown): value is BiomeId {
  return typeof value === 'string' && Object.hasOwn(biomeDefinitionsById, value)
}
