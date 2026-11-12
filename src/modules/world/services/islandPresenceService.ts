import { islandDefinitions } from '../data/worldDefinitions'

export interface IslandPresenceInfo {
  islandId: string
  islandName: string
  isPersonal: boolean
  playerCount: number
  players: string[]
}

const sharedIslandSurvivors: Record<string, string[]> = {
  island_002: [
    'Sora (Cấp 4 - Đang hái lượm)',
    'Lâm_Vũ (Cấp 5 - Dựng chòi)',
    'Thợ_Rừng (Cấp 3 - Đốn củi)',
    'Bạch_Hải (Cấp 6 - Đặt bẫy cá)',
    'An_Nhiên (Cấp 4 - Tìm thảo dược)',
    'Tiểu_Phong (Cấp 2 - Thám hiểm)',
  ],
  island_003: [
    'Mina (Cấp 6 - Khảo sát tàn tích)',
    'Hải_Đăng (Cấp 7 - Lặn biển)',
    'Hắc_Kỳ (Cấp 5 - Mở rương cổ)',
    'Thủy_Thủ (Cấp 4 - Sửa thuyền)',
  ],
  island_004: [
    'Kael (Cấp 7 - Đào mỏ sắt)',
    'Thợ_Mỏ_Vàng (Cấp 8 - Đập quặng)',
    'Đá_Tảng (Cấp 5 - Nung than)',
    'Quang_Minh (Cấp 6 - Vận chuyển đá)',
    'Thiết_Giáp (Cấp 7 - Rèn dụng cụ)',
    'Bão_Biển (Cấp 4 - Đãi khoáng)',
    'Hải_Âu (Cấp 5 - Đào quặng đồng)',
    'Sơn_Lâm (Cấp 6 - Thăm dò hang động)',
  ],
  island_005: [
    'Hỏa_Long (Cấp 9 - Thu nham thạch)',
    'Chiến_Binh_Đỏ (Cấp 8 - Canh gác)',
    'Tro_Tàn (Cấp 7 - Luyện lưu huỳnh)',
  ],
  island_006: [
    'Ẩn_Sĩ (Cấp 10 - Khám phá sương mù)',
    'Vô_Danh (Cấp 9 - Trực chiến)',
  ],
}

export function getIslandPresence(islandId: string): IslandPresenceInfo {
  const island = islandDefinitions.find((entry) => entry.id === islandId)
  const islandName = island?.name ?? 'Đảo xa'
  const isPersonal = island?.type === 'personal'

  if (isPersonal) {
    return {
      islandId,
      islandName,
      isPersonal: true,
      playerCount: 1,
      players: ['Bạn (Chủ sở hữu - Đảo riêng tư)'],
    }
  }

  const list = sharedIslandSurvivors[islandId] ?? [
    'Nhà_Du_Hành (Cấp 3)',
    'Thợ_Săn_Biển (Cấp 4)',
  ]

  return {
    islandId,
    islandName,
    isPersonal: false,
    playerCount: list.length,
    players: list,
  }
}
