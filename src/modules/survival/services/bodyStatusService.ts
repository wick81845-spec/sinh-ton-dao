import { survivalConfig } from '../data/survivalConfig'
import type { SurvivalAilment, SurvivalStats } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'

export type BodyStatusSeverity = 'mild' | 'moderate' | 'severe' | 'positive'

export interface BodyStatusEffect {
  id: string
  name: string
  severity: BodyStatusSeverity
  appearance: string
  cause: string
  impact: string
  icon: string
}

export function getBodyStatusEffects(
  stats: SurvivalStats,
  weather?: WeatherDefinition,
  isResting = true,
  shelterLevel = 0,
  ailments: SurvivalAilment[] = [],
): BodyStatusEffect[] {
  const effects: BodyStatusEffect[] = []

  for (const ailment of ailments) {
    if (ailment.id === 'bleeding') {
      effects.push({
        id: 'bleeding',
        name: 'Vết thương đang chảy máu',
        severity: 'severe',
        appearance: 'Có vết thương cần được băng bó',
        cause: 'Bị thương trong chiến đấu',
        impact: 'Mất sức khỏe theo thời gian; nếu không chữa, vết thương có thể nhiễm trùng.',
        icon: '✚',
      })
    } else if (ailment.id === 'infection') {
      effects.push({
        id: 'infection',
        name: 'Nhiễm trùng vết thương',
        severity: 'severe',
        appearance: 'Vết thương viêm đỏ, cơ thể suy yếu',
        cause: 'Vết thương không được xử lý kịp thời',
        impact: 'Tiếp tục mất sức khỏe cho đến khi dùng thuốc đắp thảo mộc.',
        icon: '!',
      })
    } else if (ailment.id === 'poisoning') {
      effects.push({
        id: 'poisoning',
        name: 'Ngộ độc thực phẩm',
        severity: 'severe',
        appearance: 'Buồn nôn, chóng mặt và suy nhược',
        cause: 'Ăn phải nấm độc',
        impact: 'Mất sức khỏe theo thời gian; dùng thuốc giải độc để hồi phục.',
        icon: '☠',
      })
    } else if (ailment.id === 'heatstroke') {
      const heatstrokeActive = ailment.elapsedMs >= 10 * 60 * 1000
      effects.push({
        id: 'heatstroke',
        name: heatstrokeActive ? 'Say nắng' : 'Nguy cơ say nắng',
        severity: heatstrokeActive ? 'severe' : 'moderate',
        appearance: heatstrokeActive ? 'Mặt đỏ, choáng váng vì nóng' : 'Đổ mồ hôi nhiều, cơ thể quá nóng',
        cause: 'Phơi ngoài trời nắng nóng cực độ khi không có nơi trú',
        impact: heatstrokeActive
          ? 'Mất sức khỏe khi tiếp tục phơi nóng; uống nước sạch để điều trị.'
          : 'Tiếp xúc kéo dài có thể gây say nắng; hãy tìm nơi trú.',
        icon: '☀',
      })
    } else {
      const hypothermiaActive = ailment.elapsedMs >= 10 * 60 * 1000
      effects.push({
        id: 'hypothermia',
        name: hypothermiaActive ? 'Hạ thân nhiệt' : 'Nguy cơ hạ thân nhiệt',
        severity: hypothermiaActive ? 'severe' : 'moderate',
        appearance: hypothermiaActive ? 'Run rẩy dữ dội, cơ thể lạnh buốt' : 'Run rẩy, co người giữ ấm',
        cause: 'Phơi ngoài trời lạnh cực độ khi không có nơi trú',
        impact: hypothermiaActive
          ? 'Mất sức khỏe khi tiếp tục phơi lạnh; uống trà nóng để điều trị.'
          : 'Tiếp xúc kéo dài có thể gây hạ thân nhiệt; hãy tìm nơi trú.',
        icon: '❄',
      })
    }
  }

  if (stats.hunger < survivalConfig.needWarningThreshold) {
    const starving = stats.hunger === 0
    const malnourished = stats.hunger <= survivalConfig.criticalNeedThreshold
    effects.push({
      id: starving ? 'starving' : malnourished ? 'malnutrition' : 'hungry',
      name: starving ? 'Đói lả' : malnourished ? 'Suy dinh dưỡng' : 'Đói',
      severity: starving ? 'severe' : malnourished ? 'moderate' : 'mild',
      appearance: starving ? 'Ôm bụng, dáng vẻ suy kiệt' : malnourished ? 'Thiếu năng lượng, cơ thể yếu đi' : 'Bụng réo, thỉnh thoảng ôm bụng',
      cause: 'Chỉ số no bụng thấp',
      impact: starving
        ? `Mất ${survivalConfig.health.starvationDamagePerHour} sức khỏe mỗi giờ; hồi sức lực chậm`
        : malnourished
          ? `Mất ${survivalConfig.health.malnutritionDamagePerHour} sức khỏe mỗi giờ; hồi sức lực chậm`
          : 'Làm chậm hồi sức lực khi nghỉ; sức khỏe giảm khi đói kéo dài',
      icon: '◒',
    })
  } else if (stats.hunger >= 75) {
    effects.push({
      id: 'well-fed',
      name: 'No đủ',
      severity: 'positive',
      appearance: 'Dáng vẻ thoải mái',
      cause: 'No bụng đang ở mức tốt',
      impact: 'Duy trì tốc độ hồi sức lực và hỗ trợ hồi sức khỏe khi nghỉ',
      icon: '✓',
    })
  }

  if (stats.thirst < survivalConfig.needWarningThreshold) {
    const dehydrated = stats.thirst === 0
    const severeDehydration = stats.thirst <= survivalConfig.criticalNeedThreshold
    effects.push({
      id: dehydrated ? 'dehydrated' : severeDehydration ? 'dehydration' : 'thirsty',
      name: dehydrated ? 'Mất nước nghiêm trọng' : severeDehydration ? 'Mất nước' : 'Khát',
      severity: dehydrated ? 'severe' : severeDehydration ? 'moderate' : 'mild',
      appearance: severeDehydration ? 'Môi khô, vẻ mặt kiệt quệ' : 'Môi khô, thường xuyên liếm môi',
      cause: 'Chỉ số nước thấp',
      impact: dehydrated
        ? `Mất ${survivalConfig.health.dehydrationDamagePerHour} sức khỏe mỗi giờ; hồi sức lực rất chậm`
        : severeDehydration
          ? `Mất ${survivalConfig.health.severeDehydrationDamagePerHour} sức khỏe mỗi giờ; hồi sức lực rất chậm`
          : 'Làm chậm hồi sức lực; sức khỏe giảm khi mất nước kéo dài',
      icon: '⌁',
    })
  } else if (stats.thirst >= 75) {
    effects.push({
      id: 'hydrated',
      name: 'Được cung cấp nước',
      severity: 'positive',
      appearance: 'Trông tỉnh táo, không có dấu hiệu khát',
      cause: 'Chỉ số nước đang ở mức tốt',
      impact: 'Duy trì tốc độ hồi sức lực và hỗ trợ hồi sức khỏe khi nghỉ',
      icon: '✓',
    })
  }

  if (stats.stamina <= 40) {
    effects.push({
      id: 'exhausted',
      name: stats.stamina <= 20 ? 'Kiệt sức' : 'Mệt mỏi',
      severity: stats.stamina <= 10 ? 'severe' : stats.stamina <= 20 ? 'moderate' : 'mild',
      appearance: stats.stamina <= 20 ? 'Thở dốc, dáng người rũ xuống' : 'Dáng vẻ mệt mỏi, cần nghỉ',
      cause: 'Thể lực thấp sau các hoạt động',
      impact: 'Không đủ thể lực sẽ không thể bắt đầu hoạt động cần nhiều sức',
      icon: 'ϟ',
    })
  } else if (stats.stamina >= 80
    && stats.hunger >= survivalConfig.needWarningThreshold
    && stats.thirst >= survivalConfig.needWarningThreshold
    && isResting) {
    effects.push({
      id: 'vigorous',
      name: 'Sung sức',
      severity: 'positive',
      appearance: 'Dáng đứng linh hoạt, tỉnh táo',
      cause: 'Thể lực đang ở mức tốt',
      impact: 'Đủ thể lực cho các hoạt động',
      icon: '✦',
    })
  }

  if (stats.health <= 25 && stats.health > 0) {
    effects.push({
      id: 'critical-health',
      name: 'Sinh lực nguy cấp',
      severity: 'severe',
      appearance: 'Yếu ớt, cần được chăm sóc ngay',
      cause: 'Sinh lực xuống rất thấp',
      impact: 'Một lượng sát thương nhỏ nữa có thể khiến nhân vật gục ngã; hồi sức lực chậm hơn',
      icon: '!',
    })
  } else if (stats.health >= 80) {
    effects.push({
      id: 'healthy',
      name: 'Khỏe mạnh',
      severity: 'positive',
      appearance: 'Sắc mặt và dáng đi khỏe khoắn',
      cause: 'Sinh lực đang ở mức tốt',
      impact: 'Cơ thể đang ở trạng thái khỏe mạnh',
      icon: '✚',
    })
  }

  if (isResting && (stats.stamina < survivalConfig.stamina.max || stats.health < survivalConfig.health.max)
    && stats.hunger >= survivalConfig.needWarningThreshold
    && stats.thirst >= survivalConfig.needWarningThreshold) {
    const recoveryDetails = [
      stats.stamina < survivalConfig.stamina.max
        ? `Hồi ${survivalConfig.stamina.recoveryPerMinute} sức lực/phút`
        : '',
      stats.health < survivalConfig.health.max
        ? `hồi ${survivalConfig.health.restRecoveryPerHour} sức khỏe/giờ`
        : '',
    ].filter(Boolean)
    effects.push({
      id: 'recovering',
      name: 'Hồi phục',
      severity: 'positive',
      appearance: 'Đang nghỉ ngơi để lấy lại sức',
      cause: 'Đang nghỉ và nhu cầu ăn uống ổn định',
      impact: recoveryDetails.join('; '),
      icon: '✦',
    })
  }

  if (shelterLevel > 0) {
    effects.push({
      id: 'sheltered',
      name: 'Đang trú trong lều',
      severity: 'positive',
      appearance: 'Có nơi nghỉ được che chắn khỏi thời tiết',
      cause: `Lều lá cấp ${shelterLevel}`,
      impact: `Tăng ${Math.round((0.25 + Math.max(0, shelterLevel - 1) * 0.15) * 100)}% hồi phục khi nghỉ và giảm tác động thời tiết cực đoan.`,
      icon: '⌂',
    })
  }

  if (shelterLevel === 0 && weather && weather.temperatureDelta >= 5) {
    effects.push({
      id: 'overheated',
      name: weather.temperatureDelta >= 9 ? 'Nắng nóng cực độ' : 'Nóng',
      severity: weather.temperatureDelta >= 9 ? 'severe' : 'moderate',
      appearance: 'Đổ mồ hôi, mặt đỏ vì nắng nóng',
      cause: weather.name,
      impact: `Khát giảm nhanh hơn ${Math.round((survivalConfig.hotWeatherThirstMultiplier - 1) * 100)}%; phơi nắng cực độ lâu có thể gây say nắng.`,
      icon: '☀',
    })
  } else if (shelterLevel === 0 && weather && weather.temperatureDelta <= -7) {
    effects.push({
      id: 'cold-weather',
      name: weather.temperatureDelta <= -12 ? 'Rét đậm' : 'Rét lạnh',
      severity: weather.temperatureDelta <= -12 ? 'severe' : 'moderate',
      appearance: 'Run rẩy, co người giữ ấm',
      cause: weather.name,
      impact: 'Phơi lạnh cực độ lâu có thể gây hạ thân nhiệt.',
      icon: '❄',
    })
  }

  if (shelterLevel === 0 && weather && ['drizzle', 'moderate_rain', 'heavy_rain', 'tropical_shower', 'thunderstorm', 'lightning_storm'].includes(weather.id)) {
    effects.push({
      id: 'rain-wet',
      name: 'Đang gặp mưa',
      severity: 'mild',
      appearance: 'Quần áo và tóc bị ướt',
      cause: weather.name,
      impact: 'Trạng thái gắn với thời tiết mưa hiện tại.',
      icon: '☂',
    })
  }

  return effects
}
