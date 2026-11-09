export type WeatherSeverity = 'normal' | 'adverse' | 'dangerous'
export type WeatherGroup = 'sky' | 'rain' | 'wind' | 'extreme' | 'ocean' | 'special'
export const weatherSeverityLabels: Record<WeatherSeverity, string> = {
  normal: 'Bình thường',
  adverse: 'Bất lợi',
  dangerous: 'Nguy hiểm',
}

export interface WeatherDefinition {
  id: string
  name: string
  group: WeatherGroup
  severity: WeatherSeverity
  icon: string
  description: string
  temperatureDelta: number
  visibility: number
  wind: number
  sea: number
  weight: number
}

export const weatherDefinitions: readonly WeatherDefinition[] = [
  { id: 'sunny', name: 'Trời nắng', group: 'sky', severity: 'normal', icon: '☀', description: 'Ánh sáng mạnh, nhiệt độ tăng nhẹ.', temperatureDelta: 2, visibility: 1, wind: 1, sea: 1, weight: 12 },
  { id: 'cloudy', name: 'Nhiều mây', group: 'sky', severity: 'normal', icon: '☁', description: 'Ánh sáng giảm, thời tiết tương đối ổn định.', temperatureDelta: 0, visibility: .9, wind: 1, sea: 1, weight: 10 },
  { id: 'overcast', name: 'Trời âm u', group: 'sky', severity: 'normal', icon: '☁', description: 'Ít ánh sáng, có thể chuyển mưa.', temperatureDelta: -1, visibility: .8, wind: 1, sea: 1, weight: 7 },
  { id: 'mist', name: 'Có sương', group: 'sky', severity: 'adverse', icon: '〰', description: 'Sương làm giảm tầm nhìn và khó định hướng.', temperatureDelta: -1, visibility: .55, wind: 0, sea: 1, weight: 4 },
  { id: 'dense_fog', name: 'Sương mù dày', group: 'sky', severity: 'dangerous', icon: '≋', description: 'Tầm nhìn rất thấp, nguy hiểm khi đi biển.', temperatureDelta: -2, visibility: .2, wind: 0, sea: 1, weight: 1 },
  { id: 'drizzle', name: 'Mưa phùn', group: 'rain', severity: 'normal', icon: '☂', description: 'Mưa nhẹ kéo dài, làm ẩm quần áo.', temperatureDelta: -1, visibility: .8, wind: 0, sea: 1, weight: 7 },
  { id: 'moderate_rain', name: 'Mưa vừa', group: 'rain', severity: 'normal', icon: '☂', description: 'Mưa làm đất và quần áo ướt.', temperatureDelta: -2, visibility: .7, wind: 1, sea: 1, weight: 7 },
  { id: 'heavy_rain', name: 'Mưa lớn', group: 'rain', severity: 'adverse', icon: '🌧', description: 'Tầm nhìn giảm, mặt đất trơn trượt.', temperatureDelta: -3, visibility: .45, wind: 2, sea: 2, weight: 4 },
  { id: 'tropical_shower', name: 'Mưa rào nhiệt đới', group: 'rain', severity: 'adverse', icon: '🌧', description: 'Mưa mạnh trong thời gian ngắn.', temperatureDelta: -2, visibility: .5, wind: 2, sea: 2, weight: 4 },
  { id: 'thunderstorm', name: 'Dông', group: 'rain', severity: 'dangerous', icon: '⛈', description: 'Mưa dông và gió giật, không thuận lợi ra khơi.', temperatureDelta: -3, visibility: .35, wind: 5, sea: 4, weight: 2 },
  { id: 'lightning_storm', name: 'Giông sét', group: 'rain', severity: 'dangerous', icon: '⚡', description: 'Sét đánh nguy hiểm ngoài trời và trên biển.', temperatureDelta: -2, visibility: .3, wind: 5, sea: 4, weight: 1 },
  { id: 'hail', name: 'Mưa đá', group: 'rain', severity: 'dangerous', icon: '❄', description: 'Mưa đá có thể gây thương tích và hư hại.', temperatureDelta: -4, visibility: .4, wind: 3, sea: 2, weight: .5 },
  { id: 'light_wind', name: 'Gió nhẹ', group: 'wind', severity: 'normal', icon: '〰', description: 'Gió nhẹ, ít ảnh hưởng đến việc đi thuyền.', temperatureDelta: 0, visibility: 1, wind: 1, sea: 1, weight: 12 },
  { id: 'strong_wind', name: 'Gió mạnh', group: 'wind', severity: 'adverse', icon: '🌬', description: 'Khó điều khiển thuyền, sóng bắt đầu lớn.', temperatureDelta: -1, visibility: .8, wind: 5, sea: 3, weight: 4 },
  { id: 'gusty_wind', name: 'Gió giật', group: 'wind', severity: 'dangerous', icon: '🌬', description: 'Gió giật có thể ảnh hưởng thuyền và công trình.', temperatureDelta: -2, visibility: .7, wind: 7, sea: 4, weight: 1 },
  { id: 'whirlwind', name: 'Gió xoáy', group: 'wind', severity: 'dangerous', icon: '🌀', description: 'Gió xoáy nguy hiểm ở vùng biển và địa hình hẹp.', temperatureDelta: -1, visibility: .45, wind: 8, sea: 5, weight: .4 },
  { id: 'tropical_storm', name: 'Bão nhiệt đới', group: 'wind', severity: 'dangerous', icon: '🌀', description: 'Sóng lớn và mưa dữ dội; nên hoãn chuyến đi.', temperatureDelta: -3, visibility: .25, wind: 9, sea: 8, weight: .5 },
  { id: 'superstorm', name: 'Siêu bão', group: 'wind', severity: 'dangerous', icon: '🌀', description: 'Thời tiết cực kỳ nguy hiểm cho tàu và công trình.', temperatureDelta: -5, visibility: .1, wind: 10, sea: 10, weight: .1 },
  { id: 'heat', name: 'Nắng nóng', group: 'extreme', severity: 'adverse', icon: '☀', description: 'Cơ thể mất nước nhanh hơn khi hoạt động.', temperatureDelta: 5, visibility: 1, wind: 0, sea: 1, weight: 3 },
  { id: 'extreme_heat', name: 'Nắng nóng cực độ', group: 'extreme', severity: 'dangerous', icon: '♨', description: 'Nguy cơ say nắng; hạn chế hoạt động ngoài trời.', temperatureDelta: 9, visibility: .9, wind: 0, sea: 1, weight: .5 },
  { id: 'drought', name: 'Hạn hán', group: 'extreme', severity: 'adverse', icon: '☼', description: 'Nguồn nước ngọt suy giảm.', temperatureDelta: 4, visibility: .9, wind: 1, sea: 1, weight: .8 },
  { id: 'cold', name: 'Rét lạnh', group: 'extreme', severity: 'adverse', icon: '❄', description: 'Cơ thể mất nhiệt nhanh hơn.', temperatureDelta: -7, visibility: .8, wind: 2, sea: 2, weight: 3 },
  { id: 'severe_cold', name: 'Rét đậm', group: 'extreme', severity: 'dangerous', icon: '❄', description: 'Tăng nguy cơ hạ thân nhiệt khi ở ngoài lâu.', temperatureDelta: -12, visibility: .6, wind: 4, sea: 3, weight: .8 },
  { id: 'snowfall', name: 'Tuyết rơi', group: 'extreme', severity: 'adverse', icon: '❄', description: 'Tầm nhìn giảm, di chuyển khó khăn.', temperatureDelta: -8, visibility: .5, wind: 2, sea: 2, weight: 2 },
  { id: 'blizzard', name: 'Bão tuyết', group: 'extreme', severity: 'dangerous', icon: '🌨', description: 'Rất nguy hiểm khi di chuyển và đi biển.', temperatureDelta: -15, visibility: .15, wind: 8, sea: 5, weight: .4 },
  { id: 'freezing_rain', name: 'Mưa đóng băng', group: 'extreme', severity: 'dangerous', icon: '🌧', description: 'Bề mặt đóng băng, trơn trượt và khó di chuyển.', temperatureDelta: -8, visibility: .35, wind: 3, sea: 3, weight: .4 },
  { id: 'calm_sea', name: 'Sóng nhẹ', group: 'ocean', severity: 'normal', icon: '≈', description: 'Biển êm, thuận lợi đánh cá và đi thuyền.', temperatureDelta: 0, visibility: 1, wind: 0, sea: 0, weight: 12 },
  { id: 'high_waves', name: 'Sóng lớn', group: 'ocean', severity: 'adverse', icon: '≋', description: 'Khó điều khiển tàu và đánh bắt ngoài khơi.', temperatureDelta: 0, visibility: .8, wind: 3, sea: 5, weight: 3 },
  { id: 'rough_sea', name: 'Biển động', group: 'ocean', severity: 'dangerous', icon: '🌊', description: 'Nguy hiểm khi di chuyển bằng thuyền nhỏ.', temperatureDelta: -1, visibility: .6, wind: 5, sea: 7, weight: 1 },
  { id: 'violent_waves', name: 'Sóng dữ', group: 'ocean', severity: 'dangerous', icon: '🌊', description: 'Sóng dữ có thể gây hư hại tàu.', temperatureDelta: -2, visibility: .4, wind: 7, sea: 9, weight: .4 },
  { id: 'sea_fog', name: 'Sương mù biển', group: 'ocean', severity: 'dangerous', icon: '≋', description: 'Tầm nhìn thấp, khó định hướng trên biển.', temperatureDelta: -1, visibility: .18, wind: 1, sea: 2, weight: 1 },
  { id: 'strong_current', name: 'Dòng chảy mạnh', group: 'ocean', severity: 'adverse', icon: '↝', description: 'Khó bơi và lặn, dòng chảy đổi hướng nhanh.', temperatureDelta: 0, visibility: .8, wind: 1, sea: 5, weight: 2 },
  { id: 'storm_surge', name: 'Nước biển dâng do bão', group: 'ocean', severity: 'dangerous', icon: '🌊', description: 'Nước dâng gây nguy hiểm cho khu vực ven bờ.', temperatureDelta: -1, visibility: .35, wind: 7, sea: 9, weight: .3 },
  { id: 'red_tide', name: 'Thủy triều đỏ', group: 'ocean', severity: 'dangerous', icon: '〰', description: 'Nước biển có thể gây độc cho sinh vật biển.', temperatureDelta: 1, visibility: .7, wind: 0, sea: 2, weight: .3 },
  { id: 'rainbow', name: 'Cầu vồng', group: 'special', severity: 'normal', icon: '🌈', description: 'Cầu vồng xuất hiện sau mưa, không gây nguy hiểm.', temperatureDelta: 1, visibility: 1, wind: 0, sea: 1, weight: .5 },
  { id: 'meteor_shower', name: 'Mưa sao băng', group: 'special', severity: 'normal', icon: '✦', description: 'Hiện tượng hiếm trên bầu trời đêm.', temperatureDelta: 0, visibility: 1, wind: 0, sea: 1, weight: .08 },
  { id: 'aurora', name: 'Cực quang', group: 'special', severity: 'normal', icon: '✧', description: 'Ánh sáng rực rỡ hiếm gặp ở vùng biển lạnh.', temperatureDelta: -1, visibility: 1, wind: 0, sea: 1, weight: .08 },
  { id: 'volcanic_eruption', name: 'Phun trào núi lửa', group: 'special', severity: 'dangerous', icon: '🌋', description: 'Tro bụi, khí nóng và dung nham đe dọa khu vực.', temperatureDelta: 8, visibility: .25, wind: 4, sea: 5, weight: .05 },
  { id: 'ashfall', name: 'Mưa tro núi lửa', group: 'special', severity: 'adverse', icon: '☁', description: 'Tro làm giảm tầm nhìn và ảnh hưởng cây trồng.', temperatureDelta: 2, visibility: .3, wind: 2, sea: 2, weight: .1 },
  { id: 'tsunami', name: 'Sóng thần', group: 'special', severity: 'dangerous', icon: '🌊', description: 'Sóng thần cực kỳ nguy hiểm ở vùng ven biển.', temperatureDelta: 0, visibility: .2, wind: 4, sea: 10, weight: .01 },
]

export const weatherDefinitionsById: Readonly<Record<string, WeatherDefinition>> =
  Object.fromEntries(weatherDefinitions.map((weather) => [weather.id, weather]))

export const weatherChangeIntervalMs = 5 * 60 * 1000

function hashString(value: string): number {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getWeatherForTime(locationId: string, timestamp: number, biomeId?: string): WeatherDefinition {
  const slot = Math.floor(timestamp / weatherChangeIntervalMs)
  const seed = hashString(`${locationId}:${slot}`)
  const isColdBiome = biomeId === 'frozen_island' || biomeId === 'coniferous_island'
  const isHotBiome = biomeId === 'tropical_island' || biomeId === 'rainforest_island'
    || biomeId === 'desert_island' || biomeId === 'volcanic_island'
  const isVolcanicBiome = biomeId === 'volcanic_island'
  const candidates = weatherDefinitions.filter((weather) => {
    if (['snowfall', 'blizzard', 'freezing_rain', 'severe_cold'].includes(weather.id) && !isColdBiome) return false
    if (['cold'].includes(weather.id) && isHotBiome) return false
    if (weather.id === 'aurora' && !isColdBiome) return false
    if (['volcanic_eruption', 'ashfall'].includes(weather.id) && !isVolcanicBiome) return false
    if (['heat', 'extreme_heat', 'drought'].includes(weather.id) && isColdBiome) return false
    return true
  }).map((weather) => ({
    weather,
    weight: weather.weight * (isColdBiome && ['snowfall', 'blizzard', 'freezing_rain', 'severe_cold'].includes(weather.id)
      ? 8
      : isVolcanicBiome && weather.id === 'volcanic_eruption'
        ? 12
        : isVolcanicBiome && weather.id === 'ashfall'
          ? 8
          : 1),
  }))
  const totalWeight = candidates.reduce((total, entry) => total + entry.weight, 0)
  let target = (seed / 0xffffffff) * totalWeight
  for (const entry of candidates) {
    target -= entry.weight
    if (target <= 0) return entry.weather
  }
  return candidates[candidates.length - 1].weather
}

export function getWeatherDefinition(weatherId: string): WeatherDefinition | undefined {
  return weatherDefinitionsById[weatherId]
}
