import { survivalConfig } from '../data/survivalConfig'
import type { GameSnapshot, SurvivalStats } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'
import { worldGameTimeScale } from '../../world/services/worldClock'
import { getNeedState } from './survivalStates'

const millisecondsPerHour = 60 * 60 * 1000
const millisecondsPerMinute = 60 * 1000

function roundStat(value: number): number {
  return Math.round(value * 100) / 100
}

export function getSurvivalConditions(stats: SurvivalStats): string[] {
  const conditions: string[] = []

  const hungerState = getNeedState(stats.hunger)
  const thirstState = getNeedState(stats.thirst)
  if (hungerState !== 'normal') conditions.push(`hunger-${hungerState}`)
  if (thirstState !== 'normal') conditions.push(`thirst-${thirstState}`)

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
  gameTimeScale = worldGameTimeScale,
  seasonalThirstMultiplier = 1,
  nightRestMultiplier = 1,
): SurvivalStats {
  const elapsed = Math.max(0, elapsedMilliseconds)
  const gameElapsed = elapsed * Math.max(0, gameTimeScale)
  const hotWeather = weather !== undefined && weather.temperatureDelta >= 5
  const needMultiplier = Math.max(1, activityMultiplier)
  const hungerDecayPerHour = survivalConfig.hunger.decayPerDay / 24 * needMultiplier
  const thirstDecayPerHour = survivalConfig.thirst.decayPerDay / 24
    * needMultiplier
    * Math.max(0, seasonalThirstMultiplier)
    * (hotWeather && !isSheltered ? survivalConfig.hotWeatherThirstMultiplier : 1)
  const hunger = Math.max(
    0,
    stats.hunger - (gameElapsed / millisecondsPerHour) * hungerDecayPerHour,
  )
  const thirst = Math.max(
    0,
    stats.thirst - (gameElapsed / millisecondsPerHour) * thirstDecayPerHour,
  )
  let staminaRecoveryMultiplier = 1
  if (stats.hunger < survivalConfig.needRisingThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowNeedRecoveryMultiplier
  }
  if (stats.thirst < survivalConfig.needRisingThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowNeedRecoveryMultiplier
  }
  if (stats.hunger < survivalConfig.needDangerThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.criticalNeedRecoveryMultiplier
  }
  if (stats.thirst < survivalConfig.needDangerThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.criticalNeedRecoveryMultiplier
  }
  if (stats.health <= survivalConfig.healthCriticalThreshold) {
    staminaRecoveryMultiplier *= survivalConfig.stamina.lowHealthRecoveryMultiplier
  }
  const staminaRecovery = isResting
    ? (elapsed / millisecondsPerMinute)
      * survivalConfig.stamina.recoveryPerMinute
      * staminaRecoveryMultiplier
      * restBonusMultiplier
      * Math.max(1, nightRestMultiplier)
    : 0
  const healthRecovery = isResting
    && stats.health > 0
    && stats.hunger >= survivalConfig.needRecoveryThreshold
    && stats.thirst >= survivalConfig.needRecoveryThreshold
    ? (elapsed / millisecondsPerHour) * survivalConfig.health.restRecoveryPerHour * restBonusMultiplier
    : 0
  const updatedStats = {
    ...stats,
    health: roundStat(Math.max(0, Math.min(
      survivalConfig.health.max,
      stats.health + healthRecovery,
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
