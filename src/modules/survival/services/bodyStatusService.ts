import { survivalConfig } from '../data/survivalConfig'
import type { SurvivalAilment, SurvivalStats } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'
import { getNeedState, getStaminaState } from '../utils/survivalStates'

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

const ailmentDetails: Readonly<Record<string, Omit<BodyStatusEffect, 'severity'>>> = {
  sunburn: { id: 'sunburn', name: 'Cháy nắng', appearance: 'Da đỏ rát sau thời gian dài dưới nắng', cause: 'Phơi nắng lâu ngoài trời', impact: 'Gây khó chịu và làm cơ thể suy yếu.', icon: '☀' },
  sprain: { id: 'sprain', name: 'Bong gân', appearance: 'Cử động khó khăn, khớp đau nhức', cause: 'Di chuyển quá sức hoặc địa hình hiểm trở', impact: 'Làm giảm sức lực khi hoạt động.', icon: '⌁' },
  fracture: { id: 'fracture', name: 'Gãy xương', appearance: 'Đau nhức, hạn chế vận động', cause: 'Chấn thương nặng', impact: 'Gây mất sức khỏe và giảm sức lực khi vận động.', icon: '✚' },
  blisters: { id: 'blisters', name: 'Phồng rộp', appearance: 'Da phồng rộp do cọ xát', cause: 'Di chuyển kéo dài', impact: 'Làm giảm sức lực khi tiếp tục hoạt động.', icon: '◌' },
  insectBites: { id: 'insectBites', name: 'Côn trùng cắn', appearance: 'Các vết cắn gây ngứa và sưng', cause: 'Côn trùng ngoài tự nhiên', impact: 'Có thể dẫn đến sốt nhiệt đới nếu không được chăm sóc.', icon: '✣' },
  tropicalFever: { id: 'tropicalFever', name: 'Sốt nhiệt đới', appearance: 'Mệt mỏi và sốt cao', cause: 'Vết côn trùng cắn bị nhiễm bệnh', impact: 'Làm suy giảm sức khỏe và sức lực.', icon: '☼' },
  diarrhea: { id: 'diarrhea', name: 'Tiêu chảy', appearance: 'Cơ thể suy yếu và mất nước', cause: 'Thức ăn hoặc nước không an toàn', impact: 'Làm giảm sức khỏe và sức lực.', icon: '⌁' },
  allergy: { id: 'allergy', name: 'Dị ứng', appearance: 'Da kích ứng, ngứa ngáy', cause: 'Tiếp xúc với tác nhân gây dị ứng', impact: 'Làm giảm sức khỏe và sức lực.', icon: '✣' },
  smoke: { id: 'smoke', name: 'Hít phải khói', appearance: 'Ho và khó thở', cause: 'Tiếp xúc với khói đậm đặc', impact: 'Làm giảm sức khỏe và sức lực.', icon: '〰' },
  marineSting: { id: 'marineSting', name: 'Sinh vật biển đốt', appearance: 'Vết đốt sưng đau', cause: 'Chạm phải sinh vật biển có độc', impact: 'Gây đau và suy giảm sức khỏe.', icon: '≈' },
  dehydration: { id: 'dehydration', name: 'Mất nước', appearance: 'Khô môi, chóng mặt và mệt mỏi', cause: 'Tình trạng mất nước đã có từ trước', impact: 'Mức khát hiện tại thể hiện trực tiếp tình trạng cân bằng nước.', icon: '⌁' },
  burns: { id: 'burns', name: 'Bỏng', appearance: 'Da tổn thương do nhiệt', cause: 'Tiếp xúc với lửa hoặc bề mặt nóng', impact: 'Gây đau và mất sức khỏe.', icon: '♨' },
  frostbite: { id: 'frostbite', name: 'Tê cóng', appearance: 'Da tái lạnh, tê buốt', cause: 'Phơi lạnh kéo dài khi cơ thể ướt', impact: 'Làm giảm sức khỏe và sức lực.', icon: '❄' },
  animalBite: { id: 'animalBite', name: 'Động vật cắn', appearance: 'Vết cắn đau và sưng', cause: 'Bị động vật hoang dã tấn công', impact: 'Gây mất sức khỏe; cần được chăm sóc.', icon: '✚' },
  exhaustion: { id: 'exhaustion', name: 'Kiệt sức', appearance: 'Thở dốc, cơ thể rã rời', cause: 'Trạng thái kiệt sức cũ', impact: 'Mức thể lực hiện tại thể hiện trực tiếp tình trạng mệt mỏi.', icon: 'ϟ' },
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
    if (ailment.id === 'exhaustion') continue
    const ailmentSeverity = ailment.severity
      ?? (ailment.elapsedMs >= 10 * 60 * 1000 ? 'severe' : 'moderate')
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
    } else if (ailment.id === 'hypothermia') {
      const hypothermiaActive = ailment.elapsedMs >= 10 * 60 * 1000
      effects.push({
        id: 'hypothermia',
        name: hypothermiaActive ? 'Hạ thân nhiệt' : 'Nguy cơ hạ thân nhiệt',
        severity: hypothermiaActive ? 'severe' : 'moderate',
        appearance: hypothermiaActive ? 'Run rẩy dữ dội, cơ thể lạnh buốt' : 'Run rẩy, co người giữ ấm',
        cause: 'Phơi ngoài trời lạnh cực độ khi không có nơi trú',
        impact: hypothermiaActive
          ? 'Mất sức khỏe khi tiếp tục phơi lạnh; ngồi gần lửa trại hoặc uống trà nóng để hồi phục.'
          : 'Tiếp xúc kéo dài có thể gây hạ thân nhiệt; hãy trú ấm hoặc đến gần lửa trại.',
        icon: '❄',
      })
    } else {
      const details = ailmentDetails[ailment.id]
      if (details) effects.push({ ...details, severity: ailmentSeverity })
    }
  }

  const bodyTemperature = stats.bodyTemperature ?? 37
  if (bodyTemperature >= 39 || bodyTemperature < 35) {
    const hot = bodyTemperature >= 39
    effects.push({
      id: 'body-temperature',
      name: hot ? 'Thân nhiệt tăng cao' : 'Thân nhiệt hạ thấp',
      severity: hot ? 'severe' : 'moderate',
      appearance: hot ? 'Cơ thể nóng ran, mặt đỏ' : 'Run rẩy, tay chân lạnh buốt',
      cause: hot ? 'Cơ thể quá nóng hoặc phơi nắng kéo dài' : 'Mưa lạnh và quần áo ướt',
      impact: hot ? 'Tiếp xúc kéo dài có thể gây say nắng.' : 'Tiếp xúc kéo dài có thể gây hạ thân nhiệt.',
      icon: hot ? '☀' : '❄',
    })
  }
  const wetness = stats.wetness ?? 0
  if (wetness > 0) {
    effects.push({
      id: 'wet-clothes',
      name: wetness >= 50 ? 'Quần áo ướt đẫm' : 'Quần áo còn ẩm',
      severity: wetness >= 70 ? 'moderate' : 'mild',
      appearance: wetness >= 50 ? 'Quần áo thấm nhiều nước mưa' : 'Quần áo đang khô dần',
      cause: 'Mưa ngoài trời',
      impact: wetness >= 50
        ? 'Làm cơ thể mất nhiệt nhanh hơn khi gặp trời lạnh.'
        : 'Ở nơi khô ráo hoặc có nắng để quần áo khô nhanh hơn.',
      icon: '☂',
    })
  }

  const hungerState = getNeedState(stats.hunger)
  if (hungerState !== 'normal') {
    const hungerStages = {
      rising: { id: 'hunger-rising', name: 'Nhu cầu năng lượng tăng', severity: 'mild' as const, appearance: 'Cơ thể sắp cần được bổ sung thức ăn' },
      deficit: { id: 'hungry', name: 'Thiếu năng lượng', severity: 'mild' as const, appearance: 'Bụng réo, cơ thể bắt đầu thiếu năng lượng' },
      danger: { id: 'malnutrition', name: 'Thiếu năng lượng nghiêm trọng', severity: 'moderate' as const, appearance: 'Cơ thể yếu đi do thiếu năng lượng' },
      critical: { id: 'hunger-critical', name: 'Nguy kịch do thiếu năng lượng', severity: 'severe' as const, appearance: 'Dáng vẻ suy kiệt, cần tìm thức ăn' },
      depleted: { id: 'starving', name: 'Cạn năng lượng', severity: 'severe' as const, appearance: 'Cơ thể suy kiệt vì đã cạn nguồn năng lượng' },
    } as const
    const stage = hungerStages[hungerState]
    effects.push({
      ...stage,
      cause: 'Chỉ số no bụng thấp',
      impact: hungerState === 'rising' || hungerState === 'deficit'
        ? 'Thiếu năng lượng kéo dài làm giảm khả năng hồi phục và hoạt động.'
        : 'Tình trạng này không gây sát thương tức thời; hãy bổ sung thức ăn và nghỉ ngơi.',
      icon: '◒',
    })
  } else if (stats.hunger >= 80) {
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

  const thirstState = getNeedState(stats.thirst)
  if (thirstState !== 'normal') {
    const thirstStages = {
      rising: { id: 'thirst-rising', name: 'Nhu cầu nước tăng', severity: 'mild' as const, appearance: 'Cơ thể bắt đầu cần được bổ sung nước' },
      deficit: { id: 'thirsty', name: 'Thiếu nước', severity: 'mild' as const, appearance: 'Môi khô, thường xuyên liếm môi' },
      danger: { id: 'thirst-danger', name: 'Thiếu nước nghiêm trọng', severity: 'moderate' as const, appearance: 'Môi khô, cơ thể bắt đầu suy yếu' },
      critical: { id: 'thirst-critical', name: 'Nguy kịch do thiếu nước', severity: 'severe' as const, appearance: 'Cơ thể suy kiệt, cần tìm nước an toàn' },
      depleted: { id: 'dehydrated', name: 'Cạn nước', severity: 'severe' as const, appearance: 'Nguồn nước trong cơ thể đã cạn' },
    } as const
    const stage = thirstStages[thirstState]
    effects.push({
      ...stage,
      cause: 'Chỉ số nước thấp',
      impact: thirstState === 'rising' || thirstState === 'deficit'
        ? 'Thiếu nước làm giảm khả năng hồi phục và khiến cơ thể nhanh mất thể lực hơn.'
        : 'Tình trạng này không gây sát thương tức thời; hãy uống nước an toàn và nghỉ ngơi.',
      icon: '⌁',
    })
  } else if (stats.thirst >= 80) {
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

  const staminaState = getStaminaState(stats.stamina)
  if (staminaState !== 'normal') {
    const staminaStages = {
      'slightly-tired': { id: 'slightly-tired', name: 'Hơi mệt', severity: 'mild' as const, appearance: 'Có dấu hiệu mệt nhẹ sau hoạt động' },
      tired: { id: 'tired', name: 'Mệt mỏi', severity: 'mild' as const, appearance: 'Dáng vẻ mệt mỏi, cần cân nhắc nghỉ ngơi' },
      'mild-exhaustion': { id: 'exhausted', name: 'Kiệt sức nhẹ', severity: 'moderate' as const, appearance: 'Thở dốc, dáng người rũ xuống' },
      'severe-exhaustion': { id: 'severely-exhausted', name: 'Kiệt sức nặng', severity: 'severe' as const, appearance: 'Cơ thể gần như cạn sức' },
      depleted: { id: 'stamina-depleted', name: 'Cạn thể lực', severity: 'severe' as const, appearance: 'Không còn thể lực cho hoạt động nặng' },
    } as const
    const stage = staminaStages[staminaState]
    effects.push({
      ...stage,
      cause: 'Thể lực thấp sau các hoạt động',
      impact: stats.stamina === 0
        ? 'Không thể tiếp tục hoạt động nặng; vẫn có thể di chuyển chậm, ăn uống, dùng vật phẩm và nghỉ ngơi.'
        : 'Thể lực thấp làm giảm hiệu quả hoạt động; nghỉ ngơi để hồi phục.',
      icon: 'ϟ',
    })
  } else if (stats.stamina >= 80
    && stats.hunger >= survivalConfig.needRecoveryThreshold
    && stats.thirst >= survivalConfig.needRecoveryThreshold
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

  if (stats.health <= survivalConfig.healthCriticalThreshold && stats.health > 0) {
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
    && stats.hunger >= survivalConfig.needRecoveryThreshold
    && stats.thirst >= survivalConfig.needRecoveryThreshold) {
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
      impact: wetness >= 35
        ? 'Quần áo ướt có thể làm cơ thể mất nhiệt nhanh hơn; hãy trú ấm và hong khô.'
        : 'Thời tiết lạnh có thể làm thân nhiệt giảm nếu tiếp xúc kéo dài.',
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
