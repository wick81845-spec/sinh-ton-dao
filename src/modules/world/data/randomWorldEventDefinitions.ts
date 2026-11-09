import type { ItemQuantity, RandomEventGroup, RandomEventRarity } from '../../../shared/types/game'
import type { BiomeId } from './biomeDefinitions'

export interface RandomWorldEventChoice {
  id: string
  label: string
  description: string
  costs?: ItemQuantity[]
  coinCost?: number
  rewards?: ItemQuantity[]
  coinReward?: number
  reputationDelta?: number
  staminaDelta?: number
  healthDelta?: number
  hungerDelta?: number
  thirstDelta?: number
  discoverIslandId?: string
  followUpEventId?: string
  resultText: string
}

export interface RandomWorldEventDefinition {
  id: string
  title: string
  group: RandomEventGroup
  rarity: RandomEventRarity
  scope: 'local'
  icon: string
  description: string
  weight: number
  minimumLevel?: number
  requiresShip?: boolean
  allowedBiomeIds?: BiomeId[]
  allowedRegionIds?: string[]
  requiredWeatherIds?: string[]
  choices: RandomWorldEventChoice[]
}

export const randomWorldEventDefinitions: readonly RandomWorldEventDefinition[] = [
  {
    id: 'drifting_crate',
    title: 'Thùng hàng mắc cạn',
    group: 'drift',
    rarity: 'common',
    scope: 'local',
    icon: '▣',
    description: 'Một thùng hàng dập nát mắc giữa đá ngầm. Bên trong có tiếng lách cách, nhưng những thanh gỗ quanh nó đang chuyển động theo sóng.',
    weight: 8,
    allowedBiomeIds: ['tropical_island', 'rainforest_island', 'mangrove_island', 'coral_island'],
    choices: [
      { id: 'salvage', label: 'Mở thùng hàng', description: 'Thử lấy món đồ bên trong.', staminaDelta: -10, healthDelta: -7, rewards: [{ itemId: 'item_wood', quantity: 3 }], resultText: 'Một thanh gỗ bật ngược làm bạn bị thương, nhưng bạn vẫn giữ được phần hàng còn lại.' },
      { id: 'leave', label: 'Tránh xa thùng hàng', description: 'Không mạo hiểm với đống đổ nát.', resultText: 'Bạn bỏ qua thùng hàng và tiếp tục hành trình an toàn.' },
    ],
  },
  {
    id: 'injured_sailor',
    title: 'Người lạ dưới mái đá',
    group: 'rescue',
    rarity: 'uncommon',
    scope: 'local',
    icon: '⚑',
    description: 'Một thủy thủ bị thương xin thức ăn. Anh ta nói tên An, nhưng chiếc túi rách bên cạnh lại có dấu hiệu vừa bị lục lọi.',
    weight: 7,
    allowedBiomeIds: ['tropical_island', 'rainforest_island', 'temperate_island', 'coral_island'],
    choices: [
      { id: 'rescue', label: 'Chia sẻ thức ăn và cứu giúp', description: 'Tốn lương thực và công sức; có thể kết giao.', costs: [{ itemId: 'item_wild_fruit', quantity: 2 }], staminaDelta: -8, coinReward: 8, reputationDelta: 8, followUpEventId: 'sailor_returns', resultText: 'Bạn mất sức khi đưa người lạ tới nơi an toàn. Anh ta tự nhận là An và hứa sẽ quay lại.' },
      { id: 'ignore', label: 'Rời khỏi mái đá', description: 'Không kiểm tra thêm.', reputationDelta: -2, resultText: 'Bạn rời đi; tiếng kêu cứu yếu dần phía sau.' },
      { id: 'take_supplies', label: 'Lục túi rồi bỏ đi', description: 'Có thể lấy được vật liệu, nhưng người kia sẽ không quên.', staminaDelta: -5, healthDelta: -6, rewards: [{ itemId: 'item_wood', quantity: 2 }], reputationDelta: -12, resultText: 'Người thủy thủ chống trả khi bạn lục túi; bạn thoát đi với vài tấm gỗ và một vết thương.' },
    ],
  },
  {
    id: 'hidden_cove',
    title: 'Luồng nước bí ẩn',
    group: 'mystery',
    rarity: 'rare',
    scope: 'local',
    icon: '⌖',
    description: 'Một lối nước hẹp lộ ra sau khi thủy triều rút. Dòng chảy mạnh kéo về phía một vịnh chưa được ghi trên bản đồ.',
    weight: 3,
    minimumLevel: 2,
    allowedBiomeIds: ['tropical_island', 'coral_island', 'ancient_island'],
    choices: [
      { id: 'chart', label: 'Men theo luồng nước', description: 'Thử tìm đường tới vịnh và ghi lại tọa độ.', staminaDelta: -18, healthDelta: -12, discoverIslandId: 'island_002', rewards: [{ itemId: 'item_wood_plank', quantity: 2 }], resultText: 'Dòng chảy quật bạn vào đá trước khi bạn kịp ghi lại tọa độ vịnh và nhặt vài tấm ván.' },
      { id: 'leave', label: 'Quay lại bờ', description: 'Chọn con đường an toàn.', resultText: 'Bạn tránh được dòng nước xiết và trở về bờ.' },
    ],
  },
  {
    id: 'fish_migration',
    title: 'Đàn cá giữa vùng nước đục',
    group: 'ecology',
    rarity: 'uncommon',
    scope: 'local',
    icon: '≈',
    description: 'Một đàn cá nổi sát mặt nước, nhưng vài con có đốm lạ và mùi tanh nồng. Không dễ phân biệt cá an toàn.',
    weight: 7,
    allowedBiomeIds: ['tropical_island', 'rainforest_island', 'mangrove_island', 'coral_island'],
    choices: [
      { id: 'catch_some', label: 'Bắt cá mang theo', description: 'Có thức ăn, nhưng không rõ đàn cá có bị nhiễm độc.', healthDelta: -10, thirstDelta: -12, resultText: 'Một phần cá có độc tố; bạn phải bỏ chúng và cơ thể bắt đầu suy yếu.' },
      { id: 'observe', label: 'Quan sát từ xa', description: 'Không tiếp xúc với đàn cá.', reputationDelta: 1, resultText: 'Bạn nhận ra những đốm lạ trên cá và tránh được nguy cơ.' },
    ],
  },
  {
    id: 'pirate_patrol',
    title: 'Kẻ lạ áp sát đảo',
    group: 'danger',
    rarity: 'rare',
    scope: 'local',
    icon: '⚔',
    description: 'Một chiếc thuyền lạ cập bờ. Người trên thuyền đang lục soát khu vực và có vẻ đã phát hiện dấu chân của bạn.',
    weight: 6,
    minimumLevel: 2,
    requiresShip: true,
    allowedRegionIds: ['region_starting_sea', 'region_outer_sea'],
    choices: [
      { id: 'hide', label: 'Ẩn trong rừng', description: 'Giữ im lặng và chờ chúng rời đi.', staminaDelta: -10, thirstDelta: -4, resultText: 'Bạn nín thở trong bụi rậm; kẻ lạ giẫm lên túi nước trước khi rời đảo.' },
      { id: 'intercept', label: 'Đối đầu để giữ đồ', description: 'Có thể đẩy lùi chúng, nhưng nguy cơ bị thương rất cao.', staminaDelta: -24, healthDelta: -18, rewards: [{ itemId: 'item_wood', quantity: 3 }], reputationDelta: -5, resultText: 'Bạn đẩy lùi được kẻ lạ nhưng bị thương nặng; vài mảnh gỗ là thứ duy nhất lấy lại được.' },
    ],
  },
  {
    id: 'fog_signal',
    title: 'Tiếng gọi trong sương mù',
    group: 'danger',
    rarity: 'rare',
    scope: 'local',
    icon: '〰',
    description: 'Có tiếng còi vọng lên giữa sương dày. Đá ngầm quanh đây khiến việc đi theo âm thanh đặc biệt nguy hiểm.',
    weight: 6,
    requiredWeatherIds: ['mist', 'dense_fog', 'sea_fog'],
    choices: [
      { id: 'follow_signal', label: 'Lần theo tiếng còi', description: 'Rời nơi trú ẩn để tìm nguồn phát tín hiệu.', staminaDelta: -14, healthDelta: -10, rewards: [{ itemId: 'item_stone', quantity: 2 }], resultText: 'Bạn vấp ngã trên đá ngầm; chiếc còi chỉ thuộc về một phao trôi dạt.' },
      { id: 'wait', label: 'Chờ sương tan', description: 'Ở lại nơi an toàn, bỏ lỡ cơ hội tìm hiểu.', thirstDelta: -2, resultText: 'Bạn giữ được an toàn nhưng phải chờ lâu trong sương lạnh.' },
    ],
  },
  {
    id: 'simulated_rescue_signal',
    title: 'Tín hiệu cầu cứu yếu ớt',
    group: 'players',
    rarity: 'uncommon',
    scope: 'local',
    icon: '⌁',
    description: 'Một tín hiệu cầu cứu chập chờn phát ra từ bè cứu sinh. Không thể xác định có bao nhiêu người ở đó hay họ còn sống không.',
    weight: 6,
    choices: [
      { id: 'answer', label: 'Tiếp cận bè cứu sinh', description: 'Mang theo thức ăn và chuẩn bị cho tình huống bất ngờ.', costs: [{ itemId: 'item_wild_fruit', quantity: 1 }], staminaDelta: -8, healthDelta: -8, coinReward: 4, reputationDelta: 4, resultText: 'Có kẻ phục kích trên bè; bạn bị thương trước khi lấy được vài đồng xu.' },
      { id: 'ignore', label: 'Tắt tín hiệu và rời đi', description: 'Không mạo hiểm tiếp cận.', reputationDelta: -1, resultText: 'Tín hiệu biến mất sau lưng bạn; bạn không biết đó là lời cầu cứu thật hay mồi nhử.' },
    ],
  },
  {
    id: 'merchant_convoy',
    title: 'Người buôn bán đáng ngờ',
    group: 'world',
    rarity: 'rare',
    scope: 'local',
    icon: '⚓',
    description: 'Một người buôn bán ghé đảo và mời đổi xu lấy ván gỗ. Hàng hóa ẩm mốc, còn lời hứa thì nghe quá hấp dẫn.',
    weight: 4,
    minimumLevel: 3,
    requiresShip: true,
    allowedRegionIds: ['region_starting_sea', 'region_outer_sea'],
    choices: [
      { id: 'trade', label: 'Mua thử lô ván', description: 'Trả xu trước; chất lượng hàng chỉ rõ sau khi kiểm tra.', coinCost: 6, staminaDelta: -4, healthDelta: -5, rewards: [{ itemId: 'item_wood_plank', quantity: 2 }], reputationDelta: -2, resultText: 'Số ván bị mục và người buôn bỏ đi; bạn mất xu, công sức lẫn uy tín.' },
      { id: 'decline', label: 'Từ chối giao dịch', description: 'Giữ lại xu và không nhận rủi ro.', resultText: 'Người buôn rời đảo khi thấy bạn không mắc bẫy.' },
    ],
  },
  {
    id: 'sailor_returns',
    title: 'Người được cứu quay lại',
    group: 'rescue',
    rarity: 'rare',
    scope: 'local',
    icon: '⚑',
    description: 'Người thủy thủ bạn từng giúp đã quay lại cùng một túi thức ăn. Anh ta có vẻ mệt mỏi, nhưng thức ăn đã để lâu ngoài biển.',
    weight: 0,
    choices: [
      { id: 'accept_gift', label: 'Nhận túi thức ăn', description: 'Chấp nhận món quà và kiểm tra sau.', rewards: [{ itemId: 'item_dried_fruit', quantity: 2 }], healthDelta: -5, reputationDelta: 2, resultText: 'Một phần thức ăn đã hỏng; bạn bị đau bụng sau khi thử, dù vẫn giữ lại được số còn tốt.' },
    ],
  },
]

export const randomEventGroupLabels: Record<RandomEventGroup, string> = {
  drift: 'Trôi dạt',
  rescue: 'Cứu giúp',
  mystery: 'Bí ẩn',
  ecology: 'Sinh thái',
  danger: 'Nguy hiểm',
  weather: 'Thời tiết',
  players: 'Tín hiệu lạ',
  world: 'Thương nhân',
}

export const randomEventRarityLabels: Record<RandomEventRarity, string> = {
  common: 'Thường',
  uncommon: 'Không thường',
  rare: 'Hiếm',
  legendary: 'Huyền thoại',
}
