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
import { randomGatheringActivityId } from '../data/gatheringConfig'
import {
  getFishAvailableAt,
  fishRarityNames,
  fishingActivity,
  fishingZoneDefinitions,
  rollFishMeasurement,
  type FishMeasurement,
} from '../data/fishingConfig'
import { fishCatalog } from '../../../data/items/fishCatalog'
import { biomeDefinitionsById } from '../../world/data/biomeDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { skillLevelForExperience } from '../../progression/data/progressionDefinitions'
import { FishingCatchReveal, FishingCatchToast, FishingEscapeReveal, FishingMinigame } from '../components/FishingMinigame'
import { ItemArtwork } from '../../../shared/components/ItemArtwork'
import type { ItemId, ItemQuantity } from '../../../shared/types/game'
import { gameEventBus } from '../../../services/events/gameEvents'
import { PixelFxEffect } from '../../../shared/components/PixelFxEffect'
import * as collectBurst from 'pixelfx/fx/pickups/collect-burst'

const secondsFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

function getMapFitZoom(): number {
  return window.matchMedia('(max-width: 760px)').matches ? 1.25 : 1
}

const gatheringMapMarkers: Record<string, { left: string; top: string; icon: string }> = {
  shoreline: { left: '22%', top: '68%', icon: '⌁' },
  'rocky-outcrop': { left: '77%', top: '38%', icon: '◆' },
  'wild-grove': { left: '41%', top: '33%', icon: '❋' },
  'forest-edge': { left: '55%', top: '57%', icon: '♧' },
  'palm-grove': { left: '70%', top: '67%', icon: '♧' },
  'fallen-tree': { left: '53%', top: '22%', icon: '▥' },
  'freshwater-stream': { left: '32%', top: '47%', icon: '≈' },
  'tidal-rocks': { left: '83%', top: '72%', icon: '◈' },
}

function FishingBetaRoadmap() {
  return (
    <div className="fishing-beta-roadmap">
      <span>SẮP RA MẮT</span>
    </div>
  )
}

export function GatheringPage({ asPanel = false }: { asPanel?: boolean }) {
  const { gameState, isLoading, error, startGathering, cancelGathering, finishFishing } = useGame()
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
  const resetMapView = useCallback(() => {
    setMapZoom(getMapFitZoom())
    setMapOffset({ x: 0, y: 0 })
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
      if (activityId !== fishingActivity.id) {
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
  const onFishEscaped = useCallback(() => {
    setFishingOutcome({ type: 'escaped' })
    setFishingNotice(null)
    cancelGathering()
  }, [cancelGathering])
  const closeFishingOutcome = useCallback(() => {
    setFishingOutcome(null)
    setFishingNotice(null)
  }, [])
  const startActivity = useCallback((activityId: string) => {
    if (activityId === fishingActivity.id) setFishingOutcome(null)
    startGathering(activityId)
  }, [startGathering])

  const active = gameState?.activeGathering
  const isFishingActive = active?.activityId === fishingActivity.id

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
  const currentFishingZone = fishingZoneDefinitions.find((entry) => entry.id === currentIsland?.oceanZoneId)
  const currentWeatherId = currentIsland && gameState.weather?.locationId === currentIsland.id
    ? gameState.weather.weatherId
    : undefined
  const currentFishingFish = currentIsland
    ? getFishAvailableAt(currentIsland.biomeId, currentWeatherId, currentIsland.oceanZoneId)
      .filter((fish) => addItems(gameState.inventory, fish.itemId, 1).ok)
    : []
  const currentFishingLoot = currentIsland
    ? getFishingLootAvailableAt(currentIsland.oceanZoneId)
      .filter((loot) => addItems(gameState.inventory, loot.itemId, 1).ok)
    : []
  const homeIsland = getIslandDefinition(gameState.character.homeIslandId)
  const isAtHomeIsland = gameState.character.currentLocationId === homeIsland?.id
  const homeFishingZone = fishingZoneDefinitions.find((entry) => entry.id === homeIsland?.oceanZoneId)
  const islandResourceNodes = homeIsland
    ? resourceNodeDefinitions.filter((node) =>
      getResourceDefinition(node.resourceId)?.sources.biomes.includes(homeIsland.biomeId))
    : []
  const selectedNode = islandResourceNodes.find((node) => node.id === selectedNodeId)
    ?? islandResourceNodes[0]
    ?? resourceNodeDefinitions[0]
  const selectedGatheringActivity = gatheringActivities.find((activity) => activity.nodeId === selectedNode.id)
  const selectedResource = getResourceDefinition(selectedNode.resourceId)
  const selectedNodeState = gameState.resourceNodes.find((entry) => entry.nodeId === selectedNode.id)
  const selectedNodeRespawn = selectedNodeState?.respawnAt
    ? Math.max(0, Math.ceil((selectedNodeState.respawnAt - now) / 1000))
    : selectedNode.respawnSeconds
  const activeActivity = active?.activityId === randomGatheringActivityId
    ? { name: 'Thu thập quanh đây' }
    : active && gatheringActivities.find((activity) => activity.id === active.activityId)
  const selectedGatheringIssue = selectedGatheringActivity
    ? !isAtHomeIsland
      ? 'Hãy quay về đảo khởi đầu để thu hoạch tại địa điểm này.'
      : getGatheringAvailability(gameState, selectedGatheringActivity.id, now)
    : 'Điểm này chưa có hoạt động thu hoạch.'
  const randomGatheringIssue = getGatheringAvailability(gameState, randomGatheringActivityId, now)
  const fishingIssue = getGatheringAvailability(gameState, fishingActivity.id, now)
  const mapFishingIssue = !isAtHomeIsland
    ? 'Hãy quay về đảo khởi đầu để câu cá tại đây.'
    : fishingIssue
  const progress = active
    ? Math.max(0, Math.min(100, ((now - active.startedAt) / (active.completesAt - active.startedAt)) * 100))
    : 0
  const secondsRemaining = active ? Math.max(0, Math.ceil((active.completesAt - now) / 1000)) : 0

  if (isMapInterface) {
    return (
      <div className="gathering-page gathering-map-preview">
        {isFishingActive && active ? (
          <FishingMinigame
            key={active.startedAt}
            startedAt={active.startedAt}
            fishingSkillLevel={skillLevelForExperience(gameState.character.skillExperience?.gathering ?? 0)}
            sceneImage={currentFishingZone?.image ?? ''}
            sceneName={currentFishingZone?.name ?? 'Vùng câu cá'}
            fishPool={currentFishingFish}
            lootPool={currentFishingLoot}
            onFinish={finishFishing}
            onCancel={cancelGathering}
            onCaught={onFishCaught}
            onEscaped={onFishEscaped}
          />
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
                  <img className="gathering-island-art" src="/assets/gathering/island-map.png" alt="" />
                  <div className="gathering-map-marker-list">
                    {islandResourceNodes.map((node) => {
                      const position = gatheringMapMarkers[node.id]
                      const nodeState = gameState.resourceNodes.find((entry) => entry.nodeId === node.id)
                      const isSelected = selectedNodeId === node.id
                      const lockReason = getNodeUnlockIssue(gameState, node.id)
                      return (
                        <button
                          className={`gathering-map-marker${isSelected ? ' is-selected' : ''}${lockReason ? ' is-locked' : ''}`}
                          key={node.id}
                          type="button"
                          style={{ left: position.left, top: position.top }}
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
                    <button
                      className="gathering-map-fishing-marker"
                      type="button"
                      style={{ left: '18%', top: '87%' }}
                      aria-label={`Câu cá tại ${homeFishingZone?.name ?? 'vùng biển đảo nhà'}`}
                      aria-pressed={isFishingLocationSelected}
                      onClick={() => {
                        setSelectedNodeId(null)
                        setIsFishingLocationSelected(true)
                      }}
                    >
                      <span className="gathering-map-fishing-icon" aria-hidden="true">🎣</span>
                      <span className="gathering-marker-copy">
                        <strong>Điểm câu cá</strong>
                        <small>{homeFishingZone?.name ?? 'Vùng biển đảo nhà'}</small>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <aside className="gathering-map-location-card">
                <span className="gathering-map-kicker">ĐẢO KHỞI ĐẦU</span>
                <h1>{gameState.character.homeIslandName ?? homeIsland?.name ?? 'Đảo khởi đầu'}</h1>
                <p>{homeIsland?.description ?? 'Khám phá các điểm tài nguyên quanh đảo.'}</p>
                <div className="gathering-map-player">
                  <span className="gathering-map-player-icon" aria-hidden="true">♙</span>
                  <span>
                    <strong>{gameState.character.name}</strong>
                    <small>ϟ {gameState.survival.stamina.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% thể lực</small>
                  </span>
                </div>
                <FishingBetaRoadmap />
              </aside>
              <div className="gathering-map-compass" aria-hidden="true">
                <span>BẮC</span>
                <strong>↑</strong>
              </div>
              <div className="gathering-map-zoom-controls" aria-label="Điều khiển thu phóng bản đồ">
                <button type="button" aria-label="Thu nhỏ bản đồ" disabled={mapZoom <= 1} onClick={() => changeMapZoom(-0.25)}>−</button>
                <span aria-live="polite">{Math.round(mapZoom * 100)}%</span>
                <button type="button" aria-label="Phóng to bản đồ" disabled={mapZoom >= 3.5} onClick={() => changeMapZoom(0.25)}>+</button>
                <button type="button" aria-label="Đưa bản đồ về giữa" onClick={resetMapView}>⌖</button>
              </div>
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
                      {isFishingLocationSelected ? 'ĐIỂM CÂU CÁ' : 'ĐIỂM THU HOẠCH'}
                    </span>
                    <h2>{isFishingLocationSelected ? 'Câu cá ven bờ' : selectedNode.name}</h2>
                    {isFishingLocationSelected
                      ? <p>{homeFishingZone?.name ?? 'Vùng biển đảo nhà'}</p>
                      : (
                        <>
                          <small>
                            {getNodeUnlockIssue(gameState, selectedNode.id)
                              ? 'Địa điểm chưa mở khóa'
                              : selectedNodeState?.available
                                ? `${selectedNodeState.available} tài nguyên có sẵn`
                                : `Tài nguyên hồi lại sau ${selectedNodeRespawn} giây`}
                          </small>
                          {selectedGatheringActivity && (
                            <small className="gathering-map-loot">
                              Có thể tìm: {[
                                selectedResource?.name,
                                ...selectedGatheringActivity.ordinaryByproducts.map((drop) => itemDefinitions[drop.itemId].name),
                                itemDefinitions[selectedGatheringActivity.luckyDrop.itemId].name,
                              ].filter((name): name is string => Boolean(name)).filter((name, index, list) => list.indexOf(name) === index).join(' · ')}
                            </small>
                          )}
                        </>
                      )}
                  </div>
                </div>

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
                      <button
                        className="gathering-map-fishing-action"
                        type="button"
                        disabled={Boolean(mapFishingIssue)}
                        onClick={() => startActivity(fishingActivity.id)}
                      >
                        <span aria-hidden="true">⌁</span>
                        Bắt đầu câu cá
                      </button>
                    ) : (
                      <button
                        className="gathering-map-primary-action"
                        type="button"
                        disabled={!selectedGatheringActivity || Boolean(selectedGatheringIssue)}
                        onClick={() => {
                          if (selectedGatheringActivity) startGathering(selectedGatheringActivity.id)
                        }}
                      >
                        <span aria-hidden="true">✦</span>
                        {active?.activityId === selectedGatheringActivity?.id
                          ? 'Đang thu hoạch…'
                          : `Thu hoạch ${selectedResource?.name ?? 'tại đây'}`}
                      </button>
                    )}
                  </div>
                  {isFishingLocationSelected
                    ? mapFishingIssue && !active && <small className="activity-blocked">{mapFishingIssue}</small>
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
      <FishingBetaRoadmap />

      {isFishingActive && active && (
        <FishingMinigame
          key={active.startedAt}
          startedAt={active.startedAt}
          fishingSkillLevel={skillLevelForExperience(gameState.character.skillExperience?.gathering ?? 0)}
          sceneImage={currentFishingZone?.image ?? ''}
          sceneName={currentFishingZone?.name ?? 'Vùng câu cá'}
          fishPool={currentFishingFish}
          lootPool={currentFishingLoot}
          onFinish={finishFishing}
          onCancel={cancelGathering}
          onCaught={onFishCaught}
          onEscaped={onFishEscaped}
        />
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
          const available = currentNode?.available ?? 0
          const respawnSeconds = currentNode?.respawnAt
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
                  : available > 0 ? `${available} còn lại` : `Hồi sau ${respawnSeconds ?? node.respawnSeconds}s`}
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
              onClick={() => startGathering(randomGatheringActivityId)}
            >
              Thu thập
            </button>
          </article>
        )}

        {gatheringActivities.filter((activity) => activity.id === fishingActivity.id).map((activity) => {
          const issue = getGatheringAvailability(gameState, activity.id, now)
          const zone = currentFishingZone
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
                  <span>ϟ {fishingActivity.staminaCost}</span>
                  <span>{fishingActivity.durationSeconds} giây</span>
                  <span>Cá ngẫu nhiên × 1</span>
                </div>
                {issue && !active && <small className="activity-blocked">{issue}</small>}
              </div>
              <button
                className="gather-button"
                type="button"
                disabled={Boolean(issue)}
                onClick={() => startActivity(activity.id)}
              >
                {isFishingActive ? 'Đang câu…' : issue ? 'Chưa thể' : 'Thả câu'}
              </button>
            </article>
          )
        })}
      </section>
      <details className="fish-zone-guide">
        <summary>
          <span>
            <strong>Sổ tay 70 loài cá</strong>
            <small>Phân bố theo vùng biển và quần xã</small>
          </span>
          <span className="fish-guide-toggle" aria-hidden="true">⌄</span>
        </summary>
        <p className="fish-guide-note">Một số loài xuất hiện ở nhiều vùng. Cá hiếm cần đúng quần xã; các loài huyền thoại thường ở ngoài khơi hoặc vùng xác tàu.</p>
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
                        <small>{fishRarityNames[fish.rarity]}</small>
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
