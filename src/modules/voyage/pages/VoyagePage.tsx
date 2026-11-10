import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import type { VoyageStatus } from '../../../shared/types/game'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { getShipConstructionAvailability, shipDefinitions } from '../../ship/services/shipService'
import { getVoyageAvailability, getDiscoveredDestinations } from '../services/voyageService'
import { getCurrentWeather } from '../../world/services/weatherService'
import { weatherSeverityLabels } from '../../world/data/weatherDefinitions'

function getVoyageStatusLabel(status: VoyageStatus) {
  if (status === 'arrived') return 'Đã cập bến'
  if (status === 'interrupted') return 'Bị gián đoạn'
  if (status === 'cancelled') return 'Đã hủy'
  if (status === 'preparing') return 'Đang chuẩn bị'
  if (status === 'departed') return 'Vừa khởi hành'
  return 'Đang di chuyển'
}

export function VoyagePage() {
  const { gameState, isLoading, error, buildShip, startVoyage } = useGame()
  const [now, setNow] = useState(gameClock.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang tải thông tin hàng hải…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const shipJob = gameState.shipConstruction
  const shipDefinition = shipJob && shipDefinitions.find((definition) => definition.id === shipJob.definitionId)
  const shipProgress = shipJob
    ? Math.max(0, Math.min(100, ((now - shipJob.startedAt) / (shipJob.completesAt - shipJob.startedAt)) * 100))
    : 0
  const activeVoyage = gameState.voyages.find((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')
  const activeDestination = activeVoyage && getIslandDefinition(activeVoyage.destinationId)
  const voyageProgress = activeVoyage
    ? Math.max(0, Math.min(100, ((now - activeVoyage.startedAt) / (activeVoyage.completesAt - activeVoyage.startedAt)) * 100))
    : 0
  const remaining = activeVoyage ? Math.max(0, Math.ceil((activeVoyage.completesAt - now) / 1000)) : 0
  const ship = gameState.ships[0]
  const weather = getCurrentWeather(gameState)

  return (
    <div className="voyage-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">THUYỀN · HÀNH TRÌNH</span>
          <h1>Hàng hải</h1>
          <p>Đóng phương tiện và di chuyển giữa những hòn đảo đã phát hiện; thời tiết xấu làm tăng rủi ro hành trình.</p>
        </div>
        <div className="voyage-weather-summary">
          <span aria-hidden="true">{weather?.icon ?? '☀'}</span>
          <div>
            <strong>{weather?.name ?? 'Thời tiết ổn định'}</strong>
            <small>{weatherSeverityLabels[weather?.severity ?? 'normal']} · Tầm nhìn {Math.round((weather?.visibility ?? 1) * 100)}%</small>
          </div>
          <span className="stamina-chip"><strong>{gameState.discoveredIslandIds.length}</strong> điểm đến</span>
        </div>
      </div>

      {shipJob && shipDefinition && (
        <section className="gathering-progress" aria-live="polite">
          <div className="progress-heading">
            <div>
              <span className="section-kicker">
                {shipDefinition.upgradeFromDefinitionId ? 'ĐANG NÂNG CẤP THUYỀN' : 'ĐANG ĐÓNG THUYỀN'}
              </span>
              <h2>{shipDefinition.name}</h2>
            </div>
            <span className="crafting-time">{Math.max(0, Math.ceil((shipJob.completesAt - now) / 1000))} giây</span>
          </div>
          <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ đóng thuyền" aria-valuenow={shipProgress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${shipProgress}%` }} />
          </div>
          <div className="progress-footer"><span>Hoàn tất tại {getIslandDefinition(shipJob.locationId)?.name ?? shipJob.locationId}</span><span>{Math.floor(shipProgress)}%</span></div>
        </section>
      )}

      {activeVoyage && activeDestination && (
        <section className="gathering-progress" aria-live="polite">
          <div className="progress-heading">
            <div>
              <span className="section-kicker">ĐANG DI CHUYỂN</span>
              <h2>Đến {activeDestination.name}</h2>
            </div>
            <span className="crafting-time">{remaining > 0 ? `Còn ${remaining} giây` : 'Đang cập bến…'}</span>
          </div>
          <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ chuyến đi" aria-valuenow={voyageProgress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${voyageProgress}%` }} />
          </div>
          <div className="progress-footer"><span>Rủi ro thời tiết: {activeDestination.weatherRisk === 'low' ? 'thấp' : activeDestination.weatherRisk === 'moderate' ? 'vừa' : 'cao'}</span><span>{Math.floor(voyageProgress)}%</span></div>
        </section>
      )}

      <div className="section-heading voyage-section-heading">
        <div>
          <span className="section-kicker">PHƯƠNG TIỆN CỦA BẠN</span>
          <h2>Thuyền</h2>
        </div>
      </div>
      {!ship && !shipJob
        ? shipDefinitions.filter((definition) => !definition.upgradeFromDefinitionId).map((definition) => {
          const issue = getShipConstructionAvailability(gameState, definition.id)
          return (
            <article className="ship-card" key={definition.id}>
              <div className="building-emblem" aria-hidden="true">≈</div>
              <div className="ship-card-copy">
                <span className="section-kicker">THUYỀN CƠ BẢN</span>
                <h3>{definition.name}</h3>
                <p>{definition.description}</p>
                <div className="activity-requirements">
                  {definition.constructionCost.map((cost) => (
                    <ItemStack key={cost.itemId} itemId={cost.itemId} quantity={cost.quantity} />
                  ))}
                  <span>{definition.constructionDurationSeconds} giây</span>
                </div>
                {issue && <small className="activity-blocked">{issue}</small>}
              </div>
              <button className="gather-button" type="button" disabled={Boolean(issue)} onClick={() => buildShip(definition.id)}>
                {issue ? 'Chưa thể đóng' : 'Đóng thuyền'}
              </button>
            </article>
          )
        })
        : ship && (
          <article className="ship-card">
            <div className="building-emblem" aria-hidden="true">≈</div>
            <div className="ship-card-copy">
              <span className="section-kicker">{ship.status === 'traveling' ? 'ĐANG TRÊN BIỂN' : 'ĐANG CẬP BẾN'}</span>
              <h3>{shipDefinitions.find((definition) => definition.id === ship.definitionId)?.name ?? 'Thuyền'}</h3>
              <p>Độ bền {ship.health} · Vị trí: {getIslandDefinition(ship.currentLocationId)?.name ?? ship.currentLocationId}</p>
            </div>
          </article>
        )}
      {ship && shipDefinitions
        .filter((definition) => definition.upgradeFromDefinitionId === ship.definitionId)
        .map((definition) => {
          const issue = getShipConstructionAvailability(gameState, definition.id)
          return (
            <article className="ship-card" key={definition.id}>
              <div className="building-emblem" aria-hidden="true">≈</div>
              <div className="ship-card-copy">
                <span className="section-kicker">NÂNG CẤP PHƯƠNG TIỆN</span>
                <h3>{definition.name}</h3>
                <p>{definition.description}</p>
                <div className="activity-requirements">
                  {definition.constructionCost.map((cost) => (
                    <ItemStack key={cost.itemId} itemId={cost.itemId} quantity={cost.quantity} />
                  ))}
                  <span>{definition.constructionDurationSeconds} giây</span>
                  <span>Thời gian hành trình ×{definition.travelTimeMultiplier}</span>
                </div>
                {issue && <small className="activity-blocked">{issue}</small>}
              </div>
              <button
                className="gather-button"
                type="button"
                disabled={Boolean(issue)}
                onClick={() => buildShip(definition.id)}
              >
                {issue ? 'Chưa thể nâng cấp' : 'Nâng cấp thuyền'}
              </button>
            </article>
          )
        })}

      <div className="section-heading voyage-section-heading">
        <div>
          <span className="section-kicker">ĐIỂM ĐẾN ĐÃ BIẾT</span>
          <h2>Lập hành trình</h2>
        </div>
      </div>
      <section className="voyage-destination-list" aria-label="Danh sách điểm đến">
        {getDiscoveredDestinations(gameState)
          .filter((destination) => destination.id !== gameState.character.currentLocationId)
          .map((destination) => {
            const issue = getVoyageAvailability(gameState, destination.id)
            return (
              <article className="voyage-destination" key={destination.id}>
                <div className="node-icon" aria-hidden="true">≈</div>
                <div className="gathering-activity-copy">
                  <span className="section-kicker">{destination.regionId === 'region_starting_sea' ? 'VÙNG BIỂN KHỞI ĐẦU' : 'VÙNG BIỂN NGOÀI KHƠI'}</span>
                  <h3>{destination.name}</h3>
                  <p>{destination.description}</p>
                  <div className="activity-requirements">
                    <span>{destination.travelDurationSeconds} giây</span>
                    <span>Rủi ro {destination.weatherRisk === 'low' ? 'thấp' : destination.weatherRisk === 'moderate' ? 'vừa' : 'cao'}</span>
                  </div>
                  {issue && <small className="activity-blocked">{issue}</small>}
                </div>
                <button className="gather-button" type="button" disabled={Boolean(issue)} onClick={() => startVoyage(destination.id)}>
                  Khởi hành
                </button>
              </article>
            )
          })}
        {getDiscoveredDestinations(gameState).filter((destination) => destination.id !== gameState.character.currentLocationId).length === 0
          && <p className="empty-world-log">Chưa có điểm đến mới. Hãy thám hiểm để tìm đảo ngoài khơi.</p>}
      </section>

      {gameState.voyages.length > 0 && (
        <section className="voyage-history">
          <div className="section-heading">
            <div>
              <span className="section-kicker">HÀNH TRÌNH ĐÃ GHI</span>
              <h2>Nhật ký hàng hải</h2>
            </div>
          </div>
          <div className="world-event-list">
            {gameState.voyages.slice().reverse().map((voyage) => (
              <article className="world-event-row" key={voyage.id}>
                <span className="queue-index">{voyage.status === 'arrived' ? '✓' : '≈'}</span>
                <div>
                  <strong>{getIslandDefinition(voyage.originId)?.name ?? voyage.originId} → {getIslandDefinition(voyage.destinationId)?.name ?? voyage.destinationId}</strong>
                  <p>{getVoyageStatusLabel(voyage.status)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
