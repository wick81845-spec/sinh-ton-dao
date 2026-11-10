import { describe, expect, it } from 'vitest'
import { getWeatherDefinition } from '../data/weatherDefinitions'
import { getWorldClock, getWorldWeatherAtTime, worldDayDurationMs } from './worldClock'

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
})
