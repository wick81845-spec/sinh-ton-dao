export const survivalConfig = {
  health: {
    max: 100,
    restRecoveryPerHour: 1,
  },
  hunger: { max: 100, decayPerDay: 35 },
  thirst: { max: 100, decayPerDay: 60 },
  activityNeedMultiplier: 1.5,
  stamina: {
    max: 100,
    recoveryPerMinute: 8,
    nightRestRecoveryMultiplier: 1.5,
    lowNeedRecoveryMultiplier: 0.5,
    criticalNeedRecoveryMultiplier: 0.5,
    lowHealthRecoveryMultiplier: 0.5,
  },
  hotWeatherThirstMultiplier: 1.5,
  healthCriticalThreshold: 25,
  needRisingThreshold: 60,
  needDangerThreshold: 20,
  needRecoveryThreshold: 80,
} as const
