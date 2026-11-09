export const survivalConfig = {
  health: {
    max: 100,
    starvationDamagePerHour: 2,
    dehydrationDamagePerHour: 4,
    malnutritionDamagePerHour: 0.5,
    severeDehydrationDamagePerHour: 1,
    restRecoveryPerHour: 1,
  },
  hunger: { max: 100, decayPerHour: 6 },
  thirst: { max: 100, decayPerHour: 9 },
  stamina: {
    max: 100,
    recoveryPerMinute: 5,
    lowNeedRecoveryMultiplier: 0.5,
    criticalNeedRecoveryMultiplier: 0.5,
    lowHealthRecoveryMultiplier: 0.5,
  },
  hotWeatherThirstMultiplier: 1.5,
  warningThreshold: 25,
  criticalNeedThreshold: 10,
} as const
