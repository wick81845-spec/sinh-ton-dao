import { addItems } from '../../inventory/services/inventoryService'
import type { GameSnapshot, WaterCollectorState } from '../../../shared/types/game'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'

const waterPerRainMinuteMs = 60 * 1000
const collectorCapacity = 10

export type WaterCollectionResult =
  | { ok: true; state: GameSnapshot; message: string }
  | { ok: false; message: string }

export function advanceRainCollection(
  state: GameSnapshot,
  elapsedMs: number,
  weather?: WeatherDefinition,
): { state: GameSnapshot; changed: boolean } {
  if (elapsedMs <= 0 || weather?.group !== 'rain' || weather.id === 'hail') {
    return { state, changed: false }
  }
  const collectors = state.buildings.filter((building) => (
    building.definitionId === 'building_rain_collector'
    && building.status === 'completed'
    && building.islandId === state.character.currentLocationId
  ))
  if (collectors.length === 0) return { state, changed: false }
  const waterCollectors = { ...state.waterCollectors }
  let changed = false
  for (const building of collectors) {
    const current: WaterCollectorState = waterCollectors[building.id] ?? { storedUnits: 0, progressMs: 0 }
    if (current.storedUnits >= collectorCapacity) continue
    const accumulated = current.progressMs + elapsedMs
    const produced = Math.floor(accumulated / waterPerRainMinuteMs)
    if (produced === 0 && waterCollectors[building.id]) continue
    const storedUnits = Math.min(collectorCapacity, current.storedUnits + produced)
    waterCollectors[building.id] = {
      storedUnits,
      progressMs: storedUnits >= collectorCapacity ? 0 : accumulated % waterPerRainMinuteMs,
    }
    if (storedUnits > current.storedUnits) changed = true
  }
  return {
    state: { ...state, waterCollectors },
    changed,
  }
}

export function collectRainwater(state: GameSnapshot, buildingId: string): WaterCollectionResult {
  if (state.character.status !== 'alive') return { ok: false, message: 'Bạn cần hồi sinh trước khi lấy nước.' }
  const building = state.buildings.find((entry) => (
    entry.id === buildingId
    && entry.definitionId === 'building_rain_collector'
    && entry.status === 'completed'
    && entry.islandId === state.character.currentLocationId
  ))
  if (!building) return { ok: false, message: 'Không tìm thấy máng hứng nước tại đảo hiện tại.' }
  const waterCollectors = state.waterCollectors ?? {}
  const collector = waterCollectors[buildingId]
  if (!collector || collector.storedUnits === 0) return { ok: false, message: 'Máng chưa hứng đủ nước mưa.' }
  const inventory = addItems(state.inventory, 'item_fresh_water', collector.storedUnits)
  if (!inventory.ok) return { ok: false, message: 'Túi đồ không đủ chỗ để lấy nước mưa.' }
  return {
    ok: true,
    state: {
      ...state,
      inventory: inventory.container,
      waterCollectors: {
        ...waterCollectors,
        [buildingId]: { storedUnits: 0, progressMs: collector.progressMs },
      },
    },
    message: `Đã hứng ${collector.storedUnits} phần nước mưa. Hãy lọc và đun sôi trước khi uống.`,
  }
}
