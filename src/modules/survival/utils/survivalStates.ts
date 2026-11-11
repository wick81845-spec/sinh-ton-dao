export type NeedState = 'normal' | 'rising' | 'deficit' | 'danger' | 'critical' | 'depleted'
export type StaminaState = 'normal' | 'slightly-tired' | 'tired' | 'mild-exhaustion' | 'severe-exhaustion' | 'depleted'
export type SurvivalMeterState = NeedState | StaminaState | 'healthy' | 'critical-health'

export function getNeedState(value: number): NeedState {
  if (value >= 80) return 'normal'
  if (value >= 60) return 'rising'
  if (value >= 40) return 'deficit'
  if (value >= 20) return 'danger'
  if (value > 0) return 'critical'
  return 'depleted'
}

export function getStaminaState(value: number): StaminaState {
  if (value >= 80) return 'normal'
  if (value >= 60) return 'slightly-tired'
  if (value >= 40) return 'tired'
  if (value >= 20) return 'mild-exhaustion'
  if (value > 0) return 'severe-exhaustion'
  return 'depleted'
}

export function getSurvivalMeterStatus(
  stat: 'health' | 'hunger' | 'thirst' | 'stamina',
  value: number,
): string {
  if (stat === 'health') {
    if (value === 0) return 'Đã tử vong'
    return value <= 25 ? 'Nguy cấp' : 'Ổn định'
  }

  if (stat === 'stamina') {
    switch (getStaminaState(value)) {
      case 'slightly-tired': return 'Hơi mệt'
      case 'tired': return 'Mệt mỏi'
      case 'mild-exhaustion': return 'Kiệt sức nhẹ'
      case 'severe-exhaustion': return 'Kiệt sức nặng'
      case 'depleted': return 'Cạn thể lực'
      default: return 'Bình thường'
    }
  }

  switch (getNeedState(value)) {
    case 'rising': return 'Nhu cầu tăng'
    case 'deficit': return 'Thiếu hụt'
    case 'danger': return 'Nguy hiểm'
    case 'critical': return 'Nguy kịch'
    case 'depleted': return 'Suy kiệt'
    default: return 'Bình thường'
  }
}
