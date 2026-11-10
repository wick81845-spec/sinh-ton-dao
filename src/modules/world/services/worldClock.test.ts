import { describe, expect, it } from 'vitest'
import { getWeatherDefinition } from '../data/weatherDefinitions'
import { getWorldClock, getWorldSeason, getWorldWeatherAtTime, worldDayDurationMs, worldDaysPerSeason } from './worldClock'

const timestampAtGameMinute = (minute: number) => minute * worldDayDurationMs / (24 * 60)

describe('worldClock', () => {
  it('runs a synchronized 24-hour cycle in 30 real minutes', () => {
    expect(getWorldClock(0).time).toBe('00:00')
    expect(getWorldClock(worldDayDurationMs / 2).time).toBe('12:00')
    expect(getWorldClock(worldDayDurationMs).time).toBe('00:00')
  })

  it('uses the proposed dawn, day, afternoon, sunset, night, and pre-dawn phases', () => {
    expect(getWorldClock(timestampAtGameMinute(6 * 60)).phaseName).toBe('Bình minh')
    expect(getWorldClock(timestampAtGameMinute(9 * 60)).phaseName).toBe('Ban ngày')
    expect(getWorldClock(timestampAtGameMinute(15 * 60)).phaseName).toBe('Chiều')
    expect(getWorldClock(timestampAtGameMinute(18 * 60)).phaseName).toBe('Hoàng hôn')
    expect(getWorldClock(timestampAtGameMinute(21 * 60)).phaseName).toBe('Ban đêm')
    expect(getWorldClock(timestampAtGameMinute(3 * 60)).phaseName).toBe('Rạng sáng')
  })

  it('applies daylight and night temperature shifts without adding a survival meter', () => {
    const hotWeather = getWeatherDefinition('heat')

    expect(getWorldWeatherAtTime(hotWeather, timestampAtGameMinute(12 * 60))?.temperatureDelta).toBe(7)
    expect(getWorldWeatherAtTime(hotWeather, timestampAtGameMinute(0))?.temperatureDelta).toBe(3)
    expect(getWorldWeatherAtTime(undefined, 0)).toBeUndefined()
  })

  it('changes seasons every seven game days and applies seasonal climate effects', () => {
    const firstSummerDay = worldDayDurationMs * worldDaysPerSeason
    const firstWinterDay = worldDayDurationMs * worldDaysPerSeason * 3

    expect(getWorldSeason(0)).toMatchObject({ name: 'Mùa xuân', day: 1, thirstMultiplier: 1 })
    expect(getWorldSeason(firstSummerDay)).toMatchObject({ name: 'Mùa hè', day: 1, thirstMultiplier: 1.2 })
    expect(getWorldSeason(firstSummerDay * 2)).toMatchObject({ name: 'Mùa thu', day: 1 })
    expect(getWorldSeason(firstWinterDay)).toMatchObject({ name: 'Mùa đông', day: 1, thirstMultiplier: 0.9 })
    expect(getWorldSeason(worldDayDurationMs * worldDaysPerSeason * 4).name).toBe('Mùa xuân')
    expect(getWorldWeatherAtTime(
      getWeatherDefinition('cloudy'),
      firstSummerDay + worldDayDurationMs / 2,
    )?.temperatureDelta).toBe(5)
  })
})
