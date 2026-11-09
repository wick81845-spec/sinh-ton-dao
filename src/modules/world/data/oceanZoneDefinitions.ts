export interface OceanZoneDefinition {
  id: string
  name: string
  description: string
  risks: string[]
}

export const oceanZoneDefinitions: readonly OceanZoneDefinition[] = [
  { id: 'coastal_water', name: 'Ven bờ', description: 'Nước nông gần đảo, thuận tiện cho người mới đánh cá và lượm sò.', risks: ['Đá ngầm'] },
  { id: 'coral_sea', name: 'Biển san hô', description: 'Rạn san hô với cá nhiệt đới và sinh vật đáy biển.', risks: ['Sinh vật độc', 'Rạn nông'] },
  { id: 'open_ocean', name: 'Biển khơi', description: 'Vùng nước xa bờ, cá lớn và thời tiết thay đổi nhanh.', risks: ['Bão', 'Sóng lớn'] },
  { id: 'deep_ocean', name: 'Biển sâu', description: 'Vùng nước sâu với sinh vật hiếm; cần thiết bị chuyên dụng.', risks: ['Áp lực nước', 'Tầm nhìn thấp'] },
  { id: 'kelp_forest', name: 'Rừng tảo bẹ', description: 'Thảm tảo dưới nước tạo nơi trú ẩn cho nhiều loài cá.', risks: ['Dòng chảy', 'Tầm nhìn hạn chế'] },
  { id: 'mangrove_water', name: 'Nước rừng ngập mặn', description: 'Nước lợ theo thủy triều, giàu tôm cua và cá nhỏ.', risks: ['Thủy triều', 'Lạch bùn'] },
  { id: 'cold_current', name: 'Dòng biển lạnh', description: 'Dòng nước lạnh theo mùa, là nơi có cá vùng lạnh.', risks: ['Hạ thân nhiệt', 'Dòng xiết'] },
  { id: 'volcanic_water', name: 'Vùng biển núi lửa', description: 'Vùng nước địa nhiệt có sinh vật và khoáng vật đặc biệt.', risks: ['Khí thoát', 'Nước nóng'] },
  { id: 'shipwreck_zone', name: 'Vùng tàu đắm', description: 'Xác tàu và phế tích có thể chứa vật liệu tái chế.', risks: ['Kết cấu sập', 'Dòng chảy'] },
]

export function getOceanZoneDefinition(zoneId: string) {
  return oceanZoneDefinitions.find((zone) => zone.id === zoneId)
}
