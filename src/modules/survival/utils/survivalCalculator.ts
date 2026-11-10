import { survivalConfig } from '../data/survivalConfig'
import type { GameSnapshot, SurvivalStats } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'

const millisecondsPerHour = 60 * 60 * 1000
const millisecondsPerMinute = 60 * 1000

function roundStat(value: number): number {
  return Math.round(value * 100) / 100
}

function durationBelowThreshold(value: number, threshold: number, decayPerHour: number, elapsed: number): number {
  const timeToThreshold = Math.max(0, (value - threshold) / decayPerHour * millisecondsPerHour)
  return Math.max(0, Math.min(elapsed, elapsed - timeToThreshold))
}

export function getSurvivalConditions(stats: SurvivalStats): string[] {
  const conditions: string[] = []

  if (stats.hunger < survivalConfig.needWarningThreshold) {
    conditions.push(stats.hunger === 0 ? 'starving' : 'hungry')
  }
  if (stats.thirst < survivalConfig.needWarningThreshold) {
    conditions.push(stats.thirst === 0 ? 'dehydrated' : 'thirsty')
  }

  return conditions
}

export function isSurvivorBusy(state: Pick<GameSnapshot,
  'activeGathering' | 'activeExploration' | 'activeCombat' | 'voyages' | 'craftingQueue' | 'constructionQueue'
>): boolean {
  return Boolean(state.activeGathering)
    || Boolean(state.activeExploration)
    || Boolean(state.activeCombat)
    || state.craftingQueue.length > 0
    || state.constructionQueue.length > 0
    || state.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')
}

export function isSurvivorResting(state: Pick<GameSnapshot,
  'isResting' | 'activeGathering' | 'activeExploration' | 'activeCombat' | 'voyages' | 'craftingQueue' | 'constructionQueue'
>): boolean {
  return state.isResting === true
    && !isSurvivorBusy(state)
}

export function advanceSurvival(
  stats: SurvivalStats,
  elapsedMilliseconds: number,
  isResting = false,
  weather?: WeatherDefinition,
  restBonusMultiplier = 1,
  activityMultiplier = 1,
  isSheltered = false,
): SurvivalStats {
  const elapsed = Math.max(0, elapsedMilliseconds)
  const hotWeather = weather !== undefined && weather.temperatureDelta >= 5
  const needMultiplier = Math.max(1, activityMultiplier)
  const hungerDecayPerHour = survivalConfig.hunger.decayPerHour * needMultiplier
  const thirstDecayPerHour = survivalConfig.thirst.decayPerHour
    * needMultiplier
    * (hotWeather && !isSheltered ? survivalConfig.hotWeatherThirstMultiplier : 1)
  const temperatureDelta = weather?.temperatureDelta ?? 0
  const extremeWeatherDamage = !isSheltered && (temperatureDelta >= 9 || temperatureDelta <= -12)
    ? (elapsed / millisecondsPerHour) * survivalConfig.extremeWeatherDamagePerHour
    : 0
  const hunger = Math.max(
    0,
    stats.hunger - (elapsed / millisecondsPerHour) * hungerDecayPerHour,
  )
  const thirst = Math.max(
    0,
    stats.thirst - (elapsed / millisecondsPerHour) * thirstDecayPerHour,
  )
  const hungerDepletedAt = stats.hunger / hungerDecayPerHour * millisecondsPerHour
  const thirstDepletedAt = stats.thirst / thirstDecayPerHour * millisecondsPerHour
  const starvationDuration = Math.max(0, elapsed - hungerDepletedAt)
  const dehydrationDuration = Math.max(0, elapsed - thirstDepletedAt)
  const malnutritionDuration = durationBelowThreshold(
    stats.hunger,
    survivalConfig.criticalNeedThreshold,
    hungerDecayPerHour,
    elapsed,
  )
  const severeDehydrationDuration = durationBelowThreshold(
    stats.thirst,
    survivalConfig.criticalNeedThreshold,
    thirstDecayPerHour,
    elapsed,
  )
  const starvationDamage = (
    malnutritionDuration * survivalConfig.health.malnutritionDamagePerHour
    + starvationDuration * (survivalConfig.health.starvationDamagePerHour - survivalConfig.health.malnutritionDamagePerHour)
  ) / millisecondsPerHour
  const dehydrationDamage = (
    severeDehydrationDuration * survivalConfig.health.severeDehydrationDamagePerHour
    + dehydrationDuration * (survivalConfig.health.dehydrationDamagePerHour - survivalConfig.health.severeDehydrationDamagePerHour)
  ) / millisecondsPerHour
  let staminaRecoveryMultiplier = 1
  if (stats.hunger < survivalConfig.needWarningThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowNeedRecoveryMultiplier
  }
  if (stats.thirst < survivalConfig.needWarningThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowNeedRecoveryMultiplier
  }
  if (stats.hunger <= survivalConfig.criticalNeedThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.criticalNeedRecoveryMultiplier
  }
  if (stats.thirst <= survivalConfig.criticalNeedThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.criticalNeedRecoveryMultiplier
  }
  if (stats.health <= survivalConfig.health.max * survivalConfig.warningThreshold / 100) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowHealthRecoveryMultiplier
  }
  const staminaRecovery = isResting
    ? (elapsed / millisecondsPerMinute) * survivalConfig.stamina.recoveryPerMinute * staminaRecoveryMultiplier * restBonusMultiplier
    : 0
  const healthRecovery = isResting
    && stats.health > 0
    && stats.hunger >= survivalConfig.needWarningThreshold
    && stats.thirst >= survivalConfig.needWarningThreshold
    ? (elapsed / millisecondsPerHour) * survivalConfig.health.restRecoveryPerHour * restBonusMultiplier
    : 0
  const updatedStats = {
    ...stats,
    health: roundStat(Math.max(0, Math.min(
      survivalConfig.health.max,
      stats.health - starvationDamage - dehydrationDamage - extremeWeatherDamage + healthRecovery,
    ))),
    hunger: roundStat(hunger),
    thirst: roundStat(thirst),
    stamina: roundStat(Math.min(survivalConfig.stamina.max, stats.stamina + staminaRecovery)),
  }

  return {
    ...updatedStats,
    conditions: getSurvivalConditions(updatedStats),
  }
}
