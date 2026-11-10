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
  freshwaterSources: string[]
  foodSources: string[]
  regenerationNotes: string[]
  specialMechanics: string[]
}

export const biomeDefinitions: readonly BiomeDefinition[] = [
  { id: 'tropical_island', name: 'Đảo nhiệt đới', description: 'Bãi cát, rừng cây thấp và nguồn nước ngọt; thích hợp làm vùng khởi đầu.', climate: { temperature: 'hot', humidity: 'high', rainfall: 'seasonal' }, terrain: ['Bãi cát', 'Rừng nhiệt đới', 'Bờ đá'], hazards: ['Nắng nóng', 'Bão theo mùa'], freshwaterSources: ['Suối nhỏ', 'Nước mưa hứng được'], foodSources: ['Dừa và quả theo mùa', 'Cá ven bờ', 'Cua và trứng chim'], regenerationNotes: ['Cây ăn quả mọc lại theo chu kỳ', 'Nguồn bãi triều phụ thuộc mùa và khai thác'], specialMechanics: ['Thủy triều đưa phế liệu vào bờ'] },
  { id: 'rainforest_island', name: 'Đảo rừng mưa', description: 'Rừng rậm ẩm ướt, đa dạng sinh vật và nhiều dược liệu.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'heavy' }, terrain: ['Rừng nhiều tầng', 'Thung lũng', 'Khe suối'], hazards: ['Côn trùng độc', 'Bệnh nhiệt đới', 'Lũ quét', 'Tầm nhìn hạn chế'], freshwaterSources: ['Suối và thác', 'Mạch nước trong rừng'], foodSources: ['Quả dại đã nhận diện', 'Nấm chỉ sau khi xác định an toàn', 'Cá suối'], regenerationNotes: ['Thực vật phát triển nhanh trong mùa mưa', 'Cây gỗ lớn phục hồi chậm'], specialMechanics: ['Một số sinh vật hoạt động ban đêm'] },
  { id: 'rocky_island', name: 'Đảo đá', description: 'Vách đá, sườn núi và hang động có điểm khoáng sản.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Vách đá', 'Hang động', 'Sườn núi'], hazards: ['Địa hình dốc', 'Đá lở', 'Sóng vỗ vào bờ đá'], freshwaterSources: ['Mạch nước trong hang', 'Vũng nước theo mùa'], foodSources: ['Hải sản bãi đá', 'Trứng chim theo mùa', 'Cây chịu hạn'], regenerationNotes: ['Khoáng sản không tái tạo trong thời gian chơi ngắn', 'Thảm thực vật khe đá phục hồi chậm'], specialMechanics: ['Vận chuyển hàng hóa tốn công hơn'] },
  { id: 'volcanic_island', name: 'Đảo núi lửa', description: 'Địa nhiệt và khoáng sản phong phú nhưng có vùng nguy hiểm.', climate: { temperature: 'hot', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Đá bazan', 'Miệng phun', 'Suối địa nhiệt'], hazards: ['Khí độc', 'Nhiệt độ cao', 'Phun trào', 'Động đất'], freshwaterSources: ['Nước mưa tích trữ', 'Suối đã kiểm tra an toàn'], foodSources: ['Cá vùng biển ấm', 'Thực vật tiên phong', 'Cua ven đá'], regenerationNotes: ['Đá và khoáng sản không tái tạo', 'Thảm thực vật chỉ mọc ở vùng đã nguội'], specialMechanics: ['Một số điểm khai thác cần đồ bảo hộ'] },
  { id: 'mangrove_island', name: 'Đảo rừng ngập mặn', description: 'Rừng nước lợ với rễ cây đan dày và thủy triều mạnh.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'frequent' }, terrain: ['Rừng ngập mặn', 'Bãi bùn', 'Lạch triều'], hazards: ['Bùn sâu', 'Thủy triều', 'Muỗi'], freshwaterSources: ['Nước mưa hứng được', 'Mạch nước ngọt tách biệt khỏi vùng lợ'], foodSources: ['Cá cửa sông', 'Tôm và cua', 'Ốc đã nhận diện an toàn'], regenerationNotes: ['Rừng ngập mặn là nơi ươm cá con', 'Khai thác rễ và sinh vật quá mức làm suy giảm bãi giống'], specialMechanics: ['Lối đi thay đổi theo thủy triều', 'Một số nơi chỉ vào được bằng thuyền nhỏ'] },
  { id: 'swamp_island', name: 'Đảo đầm lầy', description: 'Đất mềm, nước tù, nấm và cây ưa ẩm.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'frequent' }, terrain: ['Đầm lầy nước ngọt', 'Vũng nước', 'Bãi sậy'], hazards: ['Nước tù nhiễm khuẩn', 'Muỗi', 'Đỉa', 'Đất lún'], freshwaterSources: ['Ao và kênh nước ngọt; phải xử lý trước khi uống'], foodSources: ['Cá nước ngọt', 'Cua đồng', 'Thực vật đã xác định an toàn'], regenerationNotes: ['Lau sậy mọc nhanh', 'Nguồn cá và vùng đẻ phụ thuộc chất lượng nước'], specialMechanics: ['Di chuyển trong đầm lầy tiêu hao thể lực'] },
  { id: 'coral_island', name: 'Đảo san hô', description: 'Đảo thấp với đầm phá và rạn san hô phong phú.', climate: { temperature: 'warm', humidity: 'high', rainfall: 'seasonal' }, terrain: ['Rạn san hô', 'Đầm phá', 'Bãi cát carbonate'], hazards: ['Thủy triều', 'Sinh vật độc', 'Thiếu nước ngọt', 'San hô sắc nhọn'], freshwaterSources: ['Nước mưa dự trữ', 'Thấu kính nước ngọt mỏng, dễ nhiễm mặn'], foodSources: ['Cá rạn', 'Tôm, cua và ốc', 'Rong biển phù hợp'], regenerationNotes: ['Rạn san hô sống không phải tài nguyên khai thác', 'Khai thác quá mức làm giảm nơi cư trú của cá'], specialMechanics: ['Chỉ thu nhặt san hô chết tự nhiên; khai thác quá mức làm giảm sinh vật cư trú'] },
  { id: 'temperate_island', name: 'Đảo ôn đới', description: 'Rừng lá rộng, đồng cỏ và mùa rõ rệt.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Rừng lá rộng', 'Đồng cỏ', 'Sông và hồ'], hazards: ['Thời tiết mùa lạnh', 'Sương mù'], freshwaterSources: ['Sông và hồ', 'Mạch nước ngầm'], foodSources: ['Quả mọng theo mùa', 'Nấm đã nhận diện', 'Cá sông và thú hoang'], regenerationNotes: ['Cây và con mồi sinh sản theo mùa', 'Săn bắt quá mức làm giảm quần thể'], specialMechanics: ['Tài nguyên và động vật thay đổi theo mùa'] },
  { id: 'coniferous_island', name: 'Đảo rừng lá kim', description: 'Rừng thông và đồi núi trong khí hậu mát lạnh.', climate: { temperature: 'cold', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Rừng thông', 'Đồi đá', 'Hồ lạnh'], hazards: ['Mùa đông khắc nghiệt', 'Động vật săn mồi', 'Lạc đường'], freshwaterSources: ['Hồ và sông', 'Tuyết tan sau khi xử lý'], foodSources: ['Nấm và quả mọng theo mùa', 'Cá nước lạnh', 'Thú rừng'], regenerationNotes: ['Sinh trưởng giảm vào mùa đông', 'Rừng già và quần thể thú phục hồi chậm'], specialMechanics: ['Sinh trưởng giảm vào mùa đông', 'Nhựa thông thu hoạch theo mùa'] },
  { id: 'frozen_island', name: 'Đảo băng giá', description: 'Tuyết phủ, biển đóng băng theo mùa và sinh vật chịu lạnh.', climate: { temperature: 'freezing', humidity: 'low', rainfall: 'arid' }, terrain: ['Đài nguyên', 'Băng biển', 'Vách băng'], hazards: ['Hạ thân nhiệt', 'Băng nứt', 'Bão tuyết', 'Nước lạnh'], freshwaterSources: ['Băng và tuyết tan; cần đun hoặc xử lý trước khi uống'], foodSources: ['Cá biển lạnh', 'Trứng chim theo mùa', 'Sinh vật biển trong mùa thích hợp'], regenerationNotes: ['Thực vật phát triển rất chậm', 'Động vật sinh sản theo mùa ngắn'], specialMechanics: ['Cần quần áo và phương tiện phù hợp'] },
  { id: 'desert_island', name: 'Đảo khô hạn', description: 'Cát đá, ít mưa và nguồn nước ngọt khan hiếm.', climate: { temperature: 'hot', humidity: 'low', rainfall: 'arid' }, terrain: ['Cồn cát', 'Bãi đá', 'Ốc đảo theo mùa'], hazards: ['Mất nước', 'Bão cát', 'Nắng gắt', 'Lạnh về đêm'], freshwaterSources: ['Ốc đảo theo mùa', 'Giếng hoặc mạch ngầm nếu được phát hiện'], foodSources: ['Thực vật chịu hạn', 'Hạt và quả theo mùa', 'Hải sản ven đảo'], regenerationNotes: ['Thực vật phục hồi chậm và phụ thuộc mưa', 'Nước ngọt là nguồn hữu hạn'], specialMechanics: ['Có thể phát hiện mạch nước ngầm'] },
  { id: 'ancient_island', name: 'Đảo di tích cổ', description: 'Phế tích của nền văn minh cũ, nơi cần nghiên cứu trước khi phục hồi công nghệ.', climate: { temperature: 'temperate', humidity: 'moderate', rainfall: 'seasonal' }, terrain: ['Phế tích', 'Hầm ngầm', 'Bờ đá'], hazards: ['Bẫy cũ', 'Sinh vật nguy hiểm', 'Hệ thống phòng thủ', 'Công trình sập'], freshwaterSources: ['Giếng cũ chỉ dùng sau khi kiểm tra', 'Nước mưa tích trữ'], foodSources: ['Nguồn thực phẩm tự nhiên của vùng khí hậu', 'Vật phẩm được bảo quản trong khu kín'], regenerationNotes: ['Phế liệu di tích hữu hạn', 'Thảm thực vật mọc lại theo hệ sinh thái địa phương'], specialMechanics: ['Linh kiện cổ cần nghiên cứu, không thể dùng trực tiếp để chế tạo công nghệ cao'] },
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
