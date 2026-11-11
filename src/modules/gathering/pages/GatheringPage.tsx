import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { gameClock } from '../../../services/clock/gameClock'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { getResourceDefinition } from '../../../data/resources/resourceDefinitions'
import { getFishingLootAvailableAt } from '../../../data/items/fishingLootCatalog'
import { addItems } from '../../inventory/services/inventoryService'
import {
  gatheringActivities,
  getGatheringAvailability,
  getNodeUnlockIssue,
  resourceNodeDefinitions,
} from '../services/gatheringService'
import { gatheringMapLayouts } from '../data/gatheringMapLayouts'
import { randomGatheringActivityId } from '../data/gatheringConfig'
import {
  getFishAvailableAt,
  getSpearFishAvailableAt,
  fishRarityNames,
  fishingActivity,
  isFishingActivityId,
  spearFishingActivity,
  fishingZoneDefinitions,
  rollFishMeasurement,
  type FishMeasurement,
} from '../data/fishingConfig'
import { fishCatalog } from '../../../data/items/fishCatalog'
import { getBestFishingRod } from '../../../data/items/fishingRodCatalog'
import { biomeDefinitionsById } from '../../world/data/biomeDefinitions'
import { getIslandDefinition, worldLocations } from '../../world/data/worldDefinitions'
import { getCurrentWeather } from '../../world/services/weatherService'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { getBodyStatusEffects, type BodyStatusSeverity } from '../../survival/services/bodyStatusService'
import { skillLevelForExperience } from '../../progression/data/progressionDefinitions'
import { FishingCatchReveal, FishingCatchToast, FishingEscapeReveal, FishingMinigame } from '../components/FishingMinigame'
import { ItemArtwork } from '../../../shared/components/ItemArtwork'
import type { ItemId, ItemQuantity } from '../../../shared/types/game'
import { gameEventBus } from '../../../services/events/gameEvents'
import { PixelFxEffect } from '../../../shared/components/PixelFxEffect'
import * as collectBurst from 'pixelfx/fx/pickups/collect-burst'

const secondsFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

function formatRespawnCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function getMapFitZoom(): number {
  return window.matchMedia('(max-width: 760px)').matches ? 1.25 : 1
}

export function GatheringPage({
  asPanel = false,
  onOpenPanel,
  onClosePanel,
}: {
  asPanel?: boolean
  onOpenPanel?: (path: string, title: string) => void
  onClosePanel?: () => void
}) {
  const { gameState, isLoading, error, startGathering, cancelGathering, finishFishing, failFishing } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isFishingLocationSelected, setIsFishingLocationSelected] = useState(false)
  const [mapZoom, setMapZoom] = useState(getMapFitZoom)
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const [isMapDragging, setIsMapDragging] = useState(false)
  const mapViewportRef = useRef<HTMLDivElement>(null)
  const mapDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const [fishingOutcome, setFishingOutcome] = useState<
    { type: 'caught'; itemId: ItemId; measurement?: FishMeasurement } | { type: 'escaped' } | null
  >(null)
  const [fishingNotice, setFishingNotice] = useState<{ itemId: ItemId; measurement?: FishMeasurement } | null>(null)
  const [gatheringResult, setGatheringResult] = useState<{ rewards: ItemQuantity[]; seed: number } | null>(null)
  const isMapInterface = !asPanel

  const changeMapZoom = useCallback((amount: number) => {
    setMapZoom((current) => Math.max(1, Math.min(3.5, Math.round((current + amount) * 100) / 100)))
  }, [])
  const handleMapPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest('button'))) return
    mapDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: mapOffset.x,
      offsetY: mapOffset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsMapDragging(true)
  }, [mapOffset])
  const handleMapPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = mapDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setMapOffset({
      x: drag.offsetX + event.clientX - drag.startX,
      y: drag.offsetY + event.clientY - drag.startY,
    })
  }, [])
  const stopMapDragging = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (mapDragRef.current?.pointerId !== event.pointerId) return
    mapDragRef.current = null
    setIsMapDragging(false)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isMapInterface) return
    return gameEventBus.on('gathering:completed', ({ activityId, rewards }) => {
      if (!isFishingActivityId(activityId)) {
        setGatheringResult((current) => ({ rewards, seed: (current?.seed ?? 0) + 1 }))
      }
    })
  }, [isMapInterface])

  const onFishCaught = useCallback((itemId: ItemId) => {
    const fish = fishCatalog.find((entry) => entry.itemId === itemId)
    const measurement = fish ? rollFishMeasurement(fish, Math.random(), Math.random()) : undefined
    setFishingOutcome({ type: 'caught', itemId, measurement })
    setFishingNotice({ itemId, measurement })
  }, [])
  const onFishEscaped = useCallback((reason?: 'rod-damaged') => {
    setFishingOutcome({ type: 'escaped' })
    setFishingNotice(null)
    failFishing(reason === 'rod-damaged')
  }, [failFishing])
  const closeFishingOutcome = useCallback(() => {
    setFishingOutcome(null)
    setFishingNotice(null)
  }, [])
  const startActivity = useCallback((activityId: string) => {
    if (isFishingActivityId(activityId)) setFishingOutcome(null)
    const result = startGathering(activityId)
    if (result.ok) {
      setSelectedNodeId(null)
      setIsFishingLocationSelected(false)
      onClosePanel?.()
    }
    return result
  }, [onClosePanel, startGathering])

  const active = gameState?.activeGathering
  const isFishingActive = active ? isFishingActivityId(active.activityId) : false

  useEffect(() => {
    if (!fishingNotice) return
    const timer = window.setTimeout(() => setFishingNotice(null), 6_000)
    return () => window.clearTimeout(timer)
  }, [fishingNotice])

  useEffect(() => {
    const viewport = mapViewportRef.current
    if (!viewport || !isMapInterface || isFishingActive || isLoading) return
    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault()
      changeMapZoom(event.deltaY < 0 ? 0.15 : -0.15)
    }
    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [changeMapZoom, isFishingActive, isLoading, isMapInterface])

  if (isLoading) return <p className="page-state">Đang tải điểm tài nguyên…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const currentIsland = getIslandDefinition(gameState.character.currentLocationId)
  const currentMapLayout = currentIsland ? gatheringMapLayouts[currentIsland.id] : undefined
  const currentWorldLocation = worldLocations.find((location) => location.islandId === gameState.character.currentLocationId)
  const currentPositionName = currentWorldLocation?.name ?? currentIsland?.name ?? 'Vị trí chưa xác định'
  const currentFishingZone = fishingZoneDefinitions.find((entry) => entry.id === currentIsland?.oceanZoneId)
  const currentFishingRod = getBestFishingRod(gameState)
  const hasCampfireHere = gameState.buildings.some((building) => (
    building.definitionId === 'building_campfire'
    && building.status === 'completed'
    && building.islandId === gameState.character.currentLocationId
  ))
  const hasCookingStoveHere = gameState.buildings.some((building) => (
    building.definitionId === 'building_cooking_stove'
    && building.status === 'completed'
    && building.islandId === gameState.character.currentLocationId
  ))
  const shelter = gameState.buildings.find((building) => (
    building.definitionId === 'building_shelter'
    && building.status === 'completed'
    && building.islandId === gameState.character.currentLocationId
  ))
  const shelterName = buildingDefinitions.find((building) => building.id === shelter?.definitionId)?.name
  const shelterLabel = shelter
    ? `${shelterName ?? 'Lều'} · Cấp ${shelter.level}`
    : 'Lều nghỉ ngơi'
  const shelterActionLabel = shelter
    ? `Nghỉ tại ${shelterLabel}`
    : 'Nghỉ ngơi tại lều'
  const currentWeather = getCurrentWeather(gameState)
  const severityOrder: Record<BodyStatusSeverity, number> = {
    severe: 0,
    moderate: 1,
    mild: 2,
    positive: 3,
  }
  const activeStatusEffects = getBodyStatusEffects(
    gameState.survival,
    currentWeather,
    gameState.isResting,
    shelter?.level ?? 0,
    gameState.ailments ?? [],
  )
    .filter((effect) => effect.severity !== 'positive')
    .sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
  const currentWeatherId = currentIsland && gameState.weather?.locationId === currentIsland.id
    ? gameState.weather.weatherId
    : undefined
  const currentFishingFish = currentIsland
    ? getFishAvailableAt(currentIsland.biomeId, currentWeatherId, currentIsland.oceanZoneId)
      .filter((fish) => addItems(gameState.inventory, fish.itemId, 1).ok)
    : []
  const currentSpearFishingFish = currentIsland
    ? getSpearFishAvailableAt(currentIsland.biomeId, currentWeatherId, currentIsland.oceanZoneId)
      .filter((fish) => addItems(gameState.inventory, fish.itemId, 1).ok)
    : []
  const currentFishingLoot = currentIsland
    ? getFishingLootAvailableAt(currentIsland.oceanZoneId)
      .filter((loot) => addItems(gameState.inventory, loot.itemId, 1).ok)
    : []
  const activeFishingMethod = active?.activityId === spearFishingActivity.id ? 'spear' : 'rod'
  const activeFishingFish = activeFishingMethod === 'spear' ? currentSpearFishingFish : currentFishingFish
  const activeFishingLoot = activeFishingMethod === 'spear' ? [] : currentFishingLoot
  const islandFishingZone = fishingZoneDefinitions.find((entry) => entry.id === currentIsland?.oceanZoneId)
  const islandResourceNodes = currentIsland
    ? resourceNodeDefinitions.filter((node) =>
      getResourceDefinition(node.resourceId)?.sources.biomes.includes(currentIsland.biomeId))
    : []
  const selectedNode = islandResourceNodes.find((node) => node.id === selectedNodeId)
    ?? islandResourceNodes[0]
    ?? resourceNodeDefinitions[0]
  const selectedGatheringActivity = gatheringActivities.find((activity) => activity.nodeId === selectedNode.id)
  const selectedResource = getResourceDefinition(selectedNode.resourceId)
  const selectedNodeState = gameState.resourceNodes.find((entry) => entry.nodeId === selectedNode.id)
  const selectedNodeRespawn = selectedNodeState && selectedNodeState.available < selectedNode.capacity
    && selectedNodeState.respawnAt !== null
    ? Math.max(0, Math.ceil((selectedNodeState.respawnAt - now) / 1000))
    : null
  const activeActivity = active?.activityId === randomGatheringActivityId
    ? { name: 'Thu thập quanh đây' }
    : active && gatheringActivities.find((activity) => activity.id === active.activityId)
  const selectedGatheringIssue = selectedGatheringActivity
    ? getGatheringAvailability(gameState, selectedGatheringActivity.id, now)
    : 'Điểm này chưa có hoạt động thu hoạch.'
  const randomGatheringIssue = getGatheringAvailability(gameState, randomGatheringActivityId, now)
  const fishingIssue = getGatheringAvailability(gameState, fishingActivity.id, now)
  const spearFishingIssue = getGatheringAvailability(gameState, spearFishingActivity.id, now)
  const progress = active
    ? Math.max(0, Math.min(100, ((now - active.startedAt) / (active.completesAt - active.startedAt)) * 100))
    : 0
  const secondsRemaining = active ? Math.max(0, Math.ceil((active.completesAt - now) / 1000)) : 0

  if (isMapInterface) {
    return (
      <div className="gathering-page gathering-map-preview">
        {isFishingActive && active ? (
          <div className="fishing-session-inline">
            <div className="fishing-session-dialog" role="dialog" aria-label="Câu cá">
              <FishingMinigame
                key={active.startedAt}
                startedAt={active.startedAt}
                fishingSkillLevel={skillLevelForExperience(gameState.character.skillExperience?.gathering ?? 0)}
                sceneImage={currentFishingZone?.image ?? ''}
                sceneName={currentFishingZone?.name ?? 'Vùng câu cá'}
                method={activeFishingMethod}
                staminaCost={fishingActivity.staminaCost}
                fishPool={activeFishingFish}
                lootPool={activeFishingLoot}
                rod={currentFishingRod}
                onFinish={finishFishing}
                onCancel={cancelGathering}
                onCaught={onFishCaught}
                onEscaped={onFishEscaped}
              />
            </div>
          </div>
        ) : (
          <>
            <section className="gathering-map-stage" aria-label="Bản đồ các điểm thu hoạch">

              {gatheringResult && (
                <section className="gathering-reward-card" aria-label="Kết quả thu hoạch" aria-live="polite">
                  <button
                    className="gathering-reward-close"
                    type="button"
                    aria-label="Đóng kết quả thu hoạch"
                    onClick={() => setGatheringResult(null)}
                  >
                    ×
                  </button>
                  <PixelFxEffect
                    className="pixel-fx-gathering"
                    effect={collectBurst}
                    seed={gatheringResult.seed}
                    palette={['#214b3b', '#397251', '#639264', '#9eae70', '#d2bd78', '#ead99b', '#fff0c2', '#ffffff']}
                    repeat
                  />
                  <span className="gathering-map-kicker">THU HOẠCH THÀNH CÔNG</span>
                  <h2>Bạn nhận được</h2>
                  <div className="gathering-reward-list">
                    {gatheringResult.rewards.map(({ itemId, quantity }) => (
                      <div className="gathering-reward-item" key={itemId}>
                        <ItemArtwork itemId={itemId} />
                        <strong>{itemDefinitions[itemId].name}</strong>
                        <span>× {quantity}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div
                ref={mapViewportRef}
                className={`gathering-map-viewport${isMapDragging ? ' is-dragging' : ''}`}
                onPointerDown={handleMapPointerDown}
                onPointerMove={handleMapPointerMove}
                onPointerUp={stopMapDragging}
                onPointerCancel={stopMapDragging}
              >
                <div
                  className="gathering-map-world"
                  style={{
                    transform: `translate(calc(-50% + ${mapOffset.x}px), calc(-50% + ${mapOffset.y}px)) scale(${mapZoom})`,
                  }}
                >
                  <img className="gathering-island-art" src={currentIsland?.artwork ?? '/assets/gathering/island-map.png'} alt="" />
                  <div className="gathering-map-marker-list">
                    {islandResourceNodes.map((node) => {
                      const position = currentMapLayout?.nodes[node.id]
                      if (!position) {
                        throw new Error(`Missing gathering map position for ${currentIsland?.id ?? 'unknown island'}: ${node.id}`)
                      }
                      const nodeState = gameState.resourceNodes.find((entry) => entry.nodeId === node.id)
                      const isSelected = selectedNodeId === node.id
                      const lockReason = getNodeUnlockIssue(gameState, node.id)
                      return (
                        <button
                          className={`gathering-map-marker${isSelected ? ' is-selected' : ''}${lockReason ? ' is-locked' : ''}`}
                          key={node.id}
                          type="button"
                          style={{ left: `${position.x}%`, top: `${position.y}%` }}
                          aria-pressed={isSelected}
                          aria-label={`${node.name}${lockReason ? `, chưa mở khóa: ${lockReason}` : ''}`}
                          onClick={() => {
                            setSelectedNodeId(node.id)
                            setIsFishingLocationSelected(false)
                          }}
                        >
                          <span className="gathering-marker-icon" aria-hidden="true">{position.icon}</span>
                          <span className="gathering-marker-copy">
                            <strong>{node.name}</strong>
                            <small>{lockReason ? 'Chưa mở khóa' : `${nodeState?.available ?? 0} tài nguyên`}</small>
                          </span>
                        </button>
                      )
                    })}
                    {currentMapLayout && <button
                      className="gathering-map-fishing-marker"
                      type="button"
                      style={{ left: `${currentMapLayout.fishing.x}%`, top: `${currentMapLayout.fishing.y}%` }}
                      aria-label={`Câu cá tại ${islandFishingZone?.name ?? 'vùng biển hiện tại'}`}
                      aria-pressed={isFishingLocationSelected}
                      onClick={() => {
                        setSelectedNodeId(null)
                        setIsFishingLocationSelected(true)
                      }}
                    >
                      <span className="gathering-map-fishing-icon" aria-hidden="true">🎣</span>
                      <span className="gathering-marker-copy">
                        <strong>Điểm câu cá</strong>
                        <small>{islandFishingZone?.name ?? 'Vùng biển hiện tại'}</small>
                      </span>
                    </button>}
                  </div>
                </div>
              </div>

              <aside className="gathering-map-location-card">
                <div className="gathering-map-location-heading">
                  <div>
                    <span className="gathering-map-kicker">
                      {gameState.character.currentLocationId === gameState.character.homeIslandId ? 'ĐẢO NHÀ' : 'VỊ TRÍ HIỆN TẠI'}
                    </span>
                    <h1>{currentIsland?.name ?? 'Vùng đất chưa xác định'}</h1>
                  </div>
                  <span className="gathering-map-current-position" title={currentPositionName}>
                    <span aria-hidden="true">⌖</span>
                    <strong>{currentPositionName}</strong>
                  </span>
                </div>
                <div className="gathering-map-player-line">
                  <strong>{gameState.character.name}</strong>
                  <span>Cấp {gameState.character.level}</span>
                  {gameState.isResting && <span className="gathering-map-resting-indicator">Đang nghỉ ngơi tại {shelterLabel}</span>}
                </div>
                <div className="gathering-map-survival-stats" aria-label="Thông số sinh tồn hiện tại">
                  {([
                    ['hunger', 'Đói', '◒'],
                    ['thirst', 'Khát', '≈'],
                    ['stamina', 'Thể lực', 'ϟ'],
                    ['health', 'Sức khỏe', '♥'],
                  ] as const).map(([key, label, icon]) => {
                    const value = gameState.survival[key]
                    return (
                      <div className={`gathering-map-stat gathering-map-stat-${key}`} key={key} aria-label={`${label}: ${Math.round(value)}%`}>
                        <div>
                          <span aria-hidden="true">{icon}</span>
                          <strong>{Math.round(value)}%</strong>
                        </div>
                        <small>{label}</small>
                        <i><b style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></i>
                      </div>
                    )
                  })}
                </div>
                <div className="gathering-map-active-effects" aria-label="Hiệu ứng bất lợi đang mắc">
                  <strong>ĐANG BỊ</strong>
                  {activeStatusEffects.length > 0
                    ? (
                      <>
                        {activeStatusEffects.slice(0, 3).map((effect) => (
                          <span
                            className={`gathering-map-effect gathering-map-effect-${effect.severity}`}
                            key={effect.id}
                            title={`${effect.name}: ${effect.impact}`}
                          >
                            <span aria-hidden="true">{effect.icon}</span>
                            {effect.name}
                          </span>
                        ))}
                        {activeStatusEffects.length > 3 && (
                          <span className="gathering-map-effect-overflow">+{activeStatusEffects.length - 3}</span>
                        )}
                      </>
                    )
                    : <span className="gathering-map-effects-clear">Ổn định</span>}
                </div>
              </aside>
              {!selectedNodeId && !isFishingLocationSelected && !active && (
                <div className="gathering-map-home-actions" aria-label="Thao tác căn cứ">
                  {(gameState.character.currentLocationId === gameState.character.homeIslandId || hasCampfireHere) && (
                    <button type="button" aria-label="Nấu thức ăn và đun nước ở lửa trại" onClick={() => onOpenPanel?.('/campfire', 'Lửa trại')}>
                      <span aria-hidden="true">🔥</span>
                      <span><strong>Lửa trại</strong></span>
                    </button>
                  )}
                  {hasCookingStoveHere && (
                    <button type="button" aria-label="Mở bếp nấu" onClick={() => onOpenPanel?.('/cooking-stove', 'Bếp nấu')}>
                      <span aria-hidden="true">♨</span>
                      <span><strong>Bếp nấu</strong></span>
                    </button>
                  )}
                  <button type="button" aria-label="Mở bàn chế tạo" onClick={() => onOpenPanel?.('/crafting', 'Bàn chế tạo')}>
                    <span aria-hidden="true">⚒</span>
                    <span><strong>Chế tạo</strong></span>
                  </button>
                  <button type="button" aria-label={gameState.isResting ? 'Mở bảng để dừng nghỉ' : shelterActionLabel} onClick={() => onOpenPanel?.('/survival', gameState.isResting ? `Đang nghỉ tại ${shelterLabel}` : shelterActionLabel)}>
                    <span aria-hidden="true">⛺</span>
                    <span><strong>{gameState.isResting ? `Đang nghỉ ngơi tại ${shelterLabel}` : shelterActionLabel}</strong></span>
                  </button>
                </div>
              )}
            </section>

            {(selectedNodeId !== null || isFishingLocationSelected || active) && (
              <section
                className={`gathering-map-dock${isFishingLocationSelected ? ' is-fishing' : ''}`}
                aria-label={isFishingLocationSelected ? 'Điểm câu cá' : 'Điểm thu hoạch'}
              >
                <button
                  className="gathering-map-dock-close"
                  type="button"
                  aria-label="Đóng bảng địa điểm"
                  onClick={() => {
                    setSelectedNodeId(null)
                    setIsFishingLocationSelected(false)
                  }}
                >
                  ×
                </button>
                <div className="gathering-map-selected">
                  {isFishingLocationSelected
                    ? <span className="gathering-map-fishing-icon" aria-hidden="true">🎣</span>
                    : selectedResource && <img src={selectedResource.image} alt="" aria-hidden="true" />}
                  <div>
                    <span className="gathering-map-kicker">
                      {isFishingLocationSelected ? 'ĐIỂM CÂU CÁ' : 'THU HOẠCH'}
                    </span>
                    <h2>{isFishingLocationSelected ? 'Điểm đánh bắt' : selectedNode.name}</h2>
                    {isFishingLocationSelected
                      ? <p>{islandFishingZone?.name ?? 'Vùng biển hiện tại'}</p>
                      : <small>
                        {getNodeUnlockIssue(gameState, selectedNode.id)
                          ? 'Chưa mở khóa'
                          : selectedNodeState
                            ? selectedNodeState.available > 0
                              ? `${selectedNodeState.available} còn lại${selectedNodeRespawn === null ? '' : ` · +1 sau ${formatRespawnCountdown(selectedNodeRespawn)}`}`
                              : selectedNodeRespawn === null
                                ? 'Đang khởi tạo hồi tài nguyên…'
                                : `+1 tài nguyên sau ${formatRespawnCountdown(selectedNodeRespawn)}`
                            : 'Đang đồng bộ điểm tài nguyên…'}
                      </small>}
                  </div>
                </div>
                {!isFishingLocationSelected && selectedGatheringActivity && (
                  <small className="gathering-map-loot">
                    Nhặt được: {[
                      selectedResource?.name,
                      ...selectedGatheringActivity.ordinaryByproducts.map((drop) => itemDefinitions[drop.itemId].name),
                      itemDefinitions[selectedGatheringActivity.luckyDrop.itemId].name,
                    ]
                      .filter((name): name is string => Boolean(name))
                      .filter((name, index, list) => list.indexOf(name) === index)
                      .slice(0, 3)
                      .join(' · ')}
                  </small>
                )}

                <div className="gathering-map-actions">
                  {active && activeActivity && (
                    <div className="gathering-map-progress" aria-live="polite">
                      <div className="gathering-map-progress-heading">
                        <strong>{activeActivity.name}</strong>
                        <button className="small-action cancel-action" type="button" onClick={cancelGathering}>Hủy</button>
                      </div>
                      <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ thu hoạch" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <small>{secondsRemaining > 0 ? `Còn ${secondsFormatter.format(secondsRemaining)} giây` : 'Đang nhận kết quả…'}</small>
                      {active.outcome === 'adverse' && <small className="gathering-map-adverse">Gặp trở ngại · mất thêm 30 giây</small>}
                    </div>
                  )}
                  <div className="gathering-map-buttons">
                    {isFishingLocationSelected ? (
                      <>
                        <button
                          className="gathering-map-fishing-action"
                          type="button"
                          disabled={Boolean(fishingIssue)}
                          onClick={() => startActivity(fishingActivity.id)}
                        >
                          <span aria-hidden="true">⌁</span>
                          Bắt đầu câu cá
                        </button>
                        <button
                          className="gathering-map-fishing-action"
                          type="button"
                          disabled={Boolean(spearFishingIssue)}
                          onClick={() => startActivity(spearFishingActivity.id)}
                        >
                          <span aria-hidden="true">↗</span>
                          Đánh cá bằng lao
                        </button>
                      </>
                    ) : (
                      <button
                        className="gathering-map-primary-action"
                        type="button"
                        disabled={!selectedGatheringActivity || Boolean(selectedGatheringIssue)}
                        onClick={() => {
                          if (selectedGatheringActivity) startActivity(selectedGatheringActivity.id)
                        }}
                      >
                        <span aria-hidden="true">✦</span>
                        {active?.activityId === selectedGatheringActivity?.id
                          ? 'Đang thu hoạch…'
                          : 'Thu hoạch'}
                      </button>
                    )}
                  </div>
                  {isFishingLocationSelected
                    ? (
                      <div className="gathering-map-fishing-notes">
                        {fishingIssue && !active && <small className="activity-blocked">{fishingIssue}</small>}
                        {!currentFishingRod && !active && onOpenPanel && (
                          <button
                            className="small-action"
                            type="button"
                            onClick={() => onOpenPanel?.('/crafting', 'Chế tạo cần câu')}
                          >
                            Chế tạo cần câu
                          </button>
                        )}
                        {currentFishingRod && !active && (
                          <small className="gathering-map-rod-status">
                            Đang dùng {currentFishingRod.name} · độ bền {currentFishingRod.durability}/{currentFishingRod.maxDurability}
                          </small>
                        )}
                        {spearFishingIssue && !active && <small className="activity-blocked">{spearFishingIssue}</small>}
                      </div>
                    )
                    : selectedGatheringIssue && !active && <small className="activity-blocked">{selectedGatheringIssue}</small>}
                </div>
              </section>
            )}
          </>
        )}

        {!isFishingActive && fishingOutcome?.type === 'caught' && (
          <FishingCatchReveal
            itemId={fishingOutcome.itemId}
            measurement={fishingOutcome.measurement}
            onClose={closeFishingOutcome}
          />
        )}
        {fishingNotice && (
          <FishingCatchToast
            itemId={fishingNotice.itemId}
            measurement={fishingNotice.measurement}
            onClose={() => setFishingNotice(null)}
          />
        )}
        {!isFishingActive && fishingOutcome?.type === 'escaped' && (
          <FishingEscapeReveal onClose={closeFishingOutcome} />
        )}
      </div>
    )
  }

  return (
    <div className="gathering-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">ĐẢO MẦM XANH · TÀI NGUYÊN</span>
          <h1>Thu thập</h1>
          <p>Bấm Thu thập để tìm tài nguyên ngẫu nhiên quanh đảo; câu cá có hoạt động riêng.</p>
        </div>
        <div className="stamina-chip">ϟ <strong>{gameState.survival.stamina.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</strong> thể lực</div>
      </div>
      {isFishingActive && active && (
        <div className="fishing-session-inline">
          <div className="fishing-session-dialog" role="dialog" aria-label="Câu cá">
            <FishingMinigame
              key={active.startedAt}
              startedAt={active.startedAt}
              fishingSkillLevel={skillLevelForExperience(gameState.character.skillExperience?.gathering ?? 0)}
              sceneImage={currentFishingZone?.image ?? ''}
              sceneName={currentFishingZone?.name ?? 'Vùng câu cá'}
              method={activeFishingMethod}
              staminaCost={fishingActivity.staminaCost}
              fishPool={activeFishingFish}
              lootPool={activeFishingLoot}
              rod={currentFishingRod}
              onFinish={finishFishing}
              onCancel={cancelGathering}
              onCaught={onFishCaught}
              onEscaped={onFishEscaped}
            />
          </div>
        </div>
      )}

      {!isFishingActive && fishingOutcome?.type === 'caught' && (
        <FishingCatchReveal
          itemId={fishingOutcome.itemId}
          measurement={fishingOutcome.measurement}
          onClose={closeFishingOutcome}
        />
      )}
      {fishingNotice && (
        <FishingCatchToast
          itemId={fishingNotice.itemId}
          measurement={fishingNotice.measurement}
          onClose={() => setFishingNotice(null)}
        />
      )}

      {!isFishingActive && fishingOutcome?.type === 'escaped' && (
        <FishingEscapeReveal onClose={closeFishingOutcome} />
      )}

      {active && activeActivity && !isFishingActive && (
        <section className="gathering-progress" aria-live="polite">
          <div className="progress-heading">
            <div>
              <span className="section-kicker">ĐANG THỰC HIỆN</span>
              <h2>{activeActivity.name}</h2>
            </div>
            <button className="small-action cancel-action" type="button" onClick={cancelGathering}>Hủy hoạt động</button>
          </div>
          <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ thu thập" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-footer">
            <span>{secondsRemaining > 0 ? `Còn ${secondsFormatter.format(secondsRemaining)} giây` : 'Đang nhận kết quả…'}</span>
            <span>{Math.floor(progress)}%</span>
          </div>
        </section>
      )}

      <section className="resource-node-grid" aria-label="Điểm tài nguyên">
        {resourceNodeDefinitions.map((node) => {
          const currentNode = gameState.resourceNodes.find((entry) => entry.nodeId === node.id)
          const available = currentNode?.available
          const respawnSeconds = currentNode && available !== undefined && available < node.capacity
            && currentNode.respawnAt !== null
            ? Math.max(0, Math.ceil((currentNode.respawnAt - now) / 1000))
            : null
          return (
            <article className={`resource-node-card${getNodeUnlockIssue(gameState, node.id) ? ' is-locked' : ''}`} key={node.id}>
              <img
                className="node-icon"
                src={getResourceDefinition(node.resourceId)?.image}
                alt=""
                aria-hidden="true"
              />
              <div className="node-copy">
                <h2>{node.name}</h2>
                <p>{node.description}</p>
              </div>
              <span className={`node-availability${available === 0 ? ' depleted' : ''}`}>
                {getNodeUnlockIssue(gameState, node.id)
                  ? 'Chưa mở khóa'
                  : currentNode
                    ? available !== undefined && available > 0
                    ? `${available} còn lại${respawnSeconds === null ? '' : ` · +1 sau ${formatRespawnCountdown(respawnSeconds)}`}`
                    : respawnSeconds === null
                      ? 'Đang khởi tạo hồi tài nguyên…'
                      : `+1 tài nguyên sau ${formatRespawnCountdown(respawnSeconds)}`
                    : 'Đang đồng bộ điểm tài nguyên…'}
              </span>
              {getNodeUnlockIssue(gameState, node.id) && (
                <small className="activity-blocked">{getNodeUnlockIssue(gameState, node.id)}</small>
              )}
            </article>
          )
        })}
      </section>

      <div className="section-heading gathering-section-heading">
        <div>
          <span className="section-kicker">HOẠT ĐỘNG KHẢ DỤNG</span>
          <h2>Tài nguyên quanh bạn</h2>
        </div>
      </div>
      <section className="gathering-activity-list">
        {!isFishingActive && (
          <article className="gathering-activity forage-activity">
            <div className="gathering-activity-copy">
              <h3>Thu thập quanh đây</h3>
              <p>Vật phẩm phụ thuộc địa điểm: 75% bình thường, 15% may mắn, 10% bất lợi.</p>
              <div className="activity-requirements">
                <span>ϟ Thay đổi theo kết quả</span>
                <span>6 giây</span>
                <span>Tài nguyên ngẫu nhiên</span>
              </div>
              {randomGatheringIssue && !active && <small className="activity-blocked">{randomGatheringIssue}</small>}
            </div>
            <button
              className="gather-button"
              type="button"
              disabled={Boolean(randomGatheringIssue) || Boolean(active)}
              onClick={() => startActivity(randomGatheringActivityId)}
            >
              Thu thập
            </button>
          </article>
        )}

        {gatheringActivities.filter((activity) => isFishingActivityId(activity.id)).map((activity) => {
          const issue = getGatheringAvailability(gameState, activity.id, now)
          const zone = currentFishingZone
          const isSpearFishing = activity.id === spearFishingActivity.id
          const activitySettings = isSpearFishing ? spearFishingActivity : fishingActivity
          return (
            <article className="gathering-activity fishing-activity" key={activity.id}>
              {zone && !isFishingActive && (
                <div className="fishing-location-scene">
                  <img src={zone.image} alt={zone.name} />
                  <span>{zone.name}</span>
                </div>
              )}
              <div className="gathering-activity-copy fishing-activity-copy">
                <h3>{activity.name}</h3>
                <p>{activity.description}</p>
                <div className="activity-requirements">
                  <span>ϟ {activitySettings.staminaCost}</span>
                  <span>{activitySettings.durationSeconds} giây</span>
                  <span>{isSpearFishing ? 'Cá nhỏ ven bờ × 1' : 'Cá ngẫu nhiên × 1'}</span>
                  {isSpearFishing && <span>Cần có lao đánh cá</span>}
                  {!isSpearFishing && currentFishingRod && (
                    <span>{currentFishingRod.name} · bền {currentFishingRod.durability}/{currentFishingRod.maxDurability}</span>
                  )}
                </div>
                {issue && !active && <small className="activity-blocked">{issue}</small>}
                {!isSpearFishing && !currentFishingRod && !active && (
                  <small className="activity-blocked">Chế tạo cần câu ở mục Chế tạo trước khi câu cá.</small>
                )}
              </div>
              <button
                className="gather-button"
                type="button"
                disabled={Boolean(issue)}
                onClick={() => startActivity(activity.id)}
              >
                {active?.activityId === activity.id
                  ? isSpearFishing ? 'Đang phóng lao…' : 'Đang câu…'
                  : issue ? 'Chưa thể' : isSpearFishing ? 'Đánh cá bằng lao' : 'Thả câu'}
              </button>
            </article>
          )
        })}
      </section>
      <details className="fish-zone-guide">
        <summary>
          <span>
            <strong>Sổ tay {fishCatalog.length} loài cá</strong>
            <small>Phân bố theo vùng nước và quần xã</small>
          </span>
          <span className="fish-guide-toggle" aria-hidden="true">⌄</span>
        </summary>
        <p className="fish-guide-note">Danh mục gồm cá biển và cá nước ngọt. Những loài chưa có cách đánh bắt phù hợp được ghi chú để cập nhật ở phần sau.</p>
        <div className="fish-zone-grid">
          {fishingZoneDefinitions.map((zone) => {
            const zoneFish = fishCatalog.filter((fish) => fish.oceanZones.includes(zone.id))
            return (
              <section className="fish-zone-card" key={zone.id}>
                <img className="fish-zone-artwork" src={zone.image} alt={zone.name} />
                <div className="fish-zone-heading">
                  <div>
                    <h3>{zone.name}</h3>
                    <p>{zone.description}</p>
                  </div>
                  <span>{zoneFish.length} lượt phân bố</span>
                </div>
                <div className="fish-guide-list">
                  {zoneFish.map((fish) => (
                    <article className={`fish-guide-item rarity-${fish.rarity}`} key={fish.itemId}>
                      <img src={itemDefinitions[fish.itemId].image} alt="" aria-hidden="true" />
                      <div>
                        <strong>{fish.name}</strong>
                        <small>{fishRarityNames[fish.rarity]} · {fish.catchable ? 'Có thể đánh bắt' : 'Chưa mở cách đánh bắt'}</small>
                        <span>{fish.biomes.map((biomeId) => biomeDefinitionsById[biomeId].name).join(' · ')}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </details>
    </div>
  )
}
