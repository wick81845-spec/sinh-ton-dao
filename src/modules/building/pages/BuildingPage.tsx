import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { buildingDefinitions, getConstructionAvailability, getUpgradeAvailability } from '../services/buildingService'
import { campfireFuelOptions, getCampfireRemainingMs } from '../services/campfireService'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { cropDefinitions, getCropPlantAvailability } from '../services/farmService'

function formatCost(cost: { itemId: keyof typeof itemDefinitions; quantity: number }[]) {
  return (
    <span className="item-stack-list">
      {cost.map((entry) => <ItemStack key={entry.itemId} itemId={entry.itemId} quantity={entry.quantity} />)}
    </span>
  )
}

export function BuildingPage() {
  const {
    gameState,
    isLoading,
    error,
    startBuilding,
    upgradeBuilding,
    fuelCampfire,
    plantCrop,
    harvestCrop,
    raiseChicken,
    collectEggs,
    raiseGoat,
    collectGoatMilk,
    collectRainwater,
  } = useGame()
  const [now, setNow] = useState(gameClock.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang tải công trình…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  return (
    <div className="building-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">ĐẢO NHÀ · PHÁT TRIỂN CĂN CỨ</span>
          <h1>Xây dựng</h1>
          <p>Dựng công trình và nâng cấp căn cứ trên đảo nhà.</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.constructionQueue.length} / 2</strong> việc xây dựng</div>
      </div>

      {gameState.constructionQueue.length > 0 && (
        <section className="construction-queue" aria-label="Tiến độ xây dựng">
          <div className="section-heading">
            <div>
              <span className="section-kicker">ĐANG THỰC HIỆN</span>
              <h2>Tiến độ công trình</h2>
            </div>
          </div>
          <div className="construction-list">
            {gameState.constructionQueue.map((job) => {
              const building = gameState.buildings.find((entry) => entry.id === job.buildingId)
              const definition = buildingDefinitions.find((entry) => entry.id === building?.definitionId)
              const progress = Math.max(0, Math.min(100, ((now - job.startedAt) / (job.completesAt - job.startedAt)) * 100))
              const remaining = Math.max(0, Math.ceil((job.completesAt - now) / 1000))
              return (
                <article className="construction-progress" key={job.id}>
                  <div className="progress-heading">
                    <div>
                      <span className="section-kicker">{job.kind === 'upgrade' ? 'NÂNG CẤP' : 'ĐANG XÂY'}</span>
                      <h3>{definition?.name ?? 'Công trình'}</h3>
                    </div>
                    <span className="crafting-time">{remaining > 0 ? `Còn ${remaining} giây` : 'Đang hoàn tất…'}</span>
                  </div>
                  <div className="gathering-progress-track" role="progressbar" aria-label={`Tiến độ ${definition?.name ?? 'công trình'}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="progress-footer"><span>Cấp mục tiêu {job.targetLevel}</span><span>{Math.floor(progress)}%</span></div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <div className="section-heading building-section-heading">
        <div>
          <span className="section-kicker">CÔNG TRÌNH CÓ THỂ DỰNG</span>
          <h2>Phát triển đảo nhà</h2>
        </div>
      </div>
      <section className="building-grid" aria-label="Công trình có thể xây">
        {buildingDefinitions.map((definition) => {
          const issue = getConstructionAvailability(gameState, definition.id)
          return (
            <article className="building-card" key={definition.id}>
              <span className="building-emblem" aria-hidden="true">⌂</span>
              <span className="section-kicker">TỐI ĐA CẤP {definition.maxLevel}</span>
              <h3>{definition.name}</h3>
              <p>{definition.description}</p>
              <div className="building-spec">
                <span>Chi phí</span>
                <strong>{formatCost(definition.constructionCost)}</strong>
              </div>
              <div className="building-spec">
                <span>Thời gian</span>
                <strong>{definition.constructionDurationSeconds} giây</strong>
              </div>
              {issue && <small className="activity-blocked">{issue}</small>}
              <button
                className="gather-button building-action"
                type="button"
                disabled={Boolean(issue)}
                onClick={() => startBuilding(definition.id)}
              >
                {issue ? 'Chưa thể xây' : 'Xây công trình'}
              </button>
            </article>
          )
        })}
      </section>

      <div className="section-heading building-section-heading">
        <div>
          <span className="section-kicker">CÔNG TRÌNH CỦA BẠN</span>
          <h2>Đã xây dựng</h2>
        </div>
      </div>
      {gameState.buildings.length === 0
        ? <p className="empty-buildings">Chưa có công trình nào. Hãy dựng công trình đầu tiên trên đảo nhà.</p>
        : (
          <section className="owned-building-list" aria-label="Công trình đã xây dựng">
            {gameState.buildings.map((building) => {
              const definition = buildingDefinitions.find((entry) => entry.id === building.definitionId)
              if (!definition) return null
              const nextLevel = building.level + 1
              const upgradeCost = definition.upgradeCosts[nextLevel]
              const issue = getUpgradeAvailability(gameState, building.id)
              const isCampfire = building.definitionId === 'building_campfire'
              const isGardenBed = building.definitionId === 'building_garden_bed'
              const farmPlot = gameState.farmPlots?.find((plot) => plot.buildingId === building.id)
              const crop = farmPlot && cropDefinitions.find((entry) => entry.id === farmPlot.cropId)
              const chickenCoop = building.definitionId === 'building_chicken_coop'
              const goatPen = building.definitionId === 'building_goat_pen'
              const isRainCollector = building.definitionId === 'building_rain_collector'
              const livestock = gameState.livestockPens?.find((pen) => pen.buildingId === building.id)
              const chickenQuantity = gameState.inventory.slots
                .filter((slot) => slot.itemId === 'item_chicken')
                .reduce((total, slot) => total + slot.quantity, 0)
              const goatQuantity = gameState.inventory.slots
                .filter((slot) => slot.itemId === 'item_goat')
                .reduce((total, slot) => total + slot.quantity, 0)
              const fuelRemaining = getCampfireRemainingMs(gameState, building.id, now)
              return (
                <article className="owned-building" key={building.id}>
                  <span className="building-emblem" aria-hidden="true">⌂</span>
                  <div className="owned-building-copy">
                    <span className="section-kicker">{building.status === 'completed' ? 'ĐÃ HOÀN THÀNH' : 'ĐANG THI CÔNG'}</span>
                    <h3>{definition.name}</h3>
                    <p>Cấp {building.level} / {definition.maxLevel} · Độ bền {building.health} / {definition.maxHealth}</p>
                    {isCampfire && building.status === 'completed' && (
                      <p role="status">
                        {fuelRemaining > 0
                          ? `Đang cháy · còn ${Math.ceil(fuelRemaining / 60_000)} phút`
                          : 'Đã tắt · cần thêm nhiên liệu'}
                      </p>
                    )}
                  </div>
                  {isGardenBed && building.status === 'completed' && (
                    <div className="owned-building-upgrade" aria-label="Quản lý luống trồng">
                      {farmPlot && crop
                        ? (
                          <>
                            <p>{crop.name} · {now >= farmPlot.readyAt
                              ? 'Sẵn sàng thu hoạch'
                              : `Còn ${Math.ceil((farmPlot.readyAt - now) / 60_000)} phút`}</p>
                            <button
                              className="small-action"
                              type="button"
                              disabled={now < farmPlot.readyAt}
                              onClick={() => harvestCrop(farmPlot.id)}
                            >
                              Thu hoạch
                            </button>
                          </>
                        )
                        : cropDefinitions.map((cropOption) => {
                          const issue = getCropPlantAvailability(gameState, building.id, cropOption.id)
                          return (
                            <button
                              className="small-action"
                              type="button"
                              key={cropOption.id}
                              disabled={Boolean(issue)}
                              title={issue ?? undefined}
                              onClick={() => plantCrop(building.id, cropOption.id)}
                            >
                              Gieo {cropOption.name} · cần {itemDefinitions[cropOption.seedItemId].name}
                              {issue ? ` · ${issue}` : ''}
                            </button>
                          )
                        })}
                    </div>
                  )}
                  {chickenCoop && building.status === 'completed' && (
                    <div className="owned-building-upgrade" aria-label="Quản lý chuồng gà">
                      <p>Gà nuôi: {livestock?.chickenCount ?? 0} / 3</p>
                      <button
                        className="small-action"
                        type="button"
                        disabled={chickenQuantity < 1 || (livestock?.chickenCount ?? 0) >= 3}
                        onClick={() => raiseChicken(building.id)}
                      >
                        Nuôi gà con · có {chickenQuantity}
                      </button>
                      {livestock && (
                        <button
                          className="small-action"
                          type="button"
                          disabled={now < (livestock.nextEggAt ?? now)}
                          onClick={() => collectEggs(building.id)}
                        >
                          {(livestock.nextEggAt ?? now) > now
                            ? `Trứng dự kiến sau ${Math.ceil(((livestock.nextEggAt ?? now) - now) / 60_000)} phút`
                            : 'Thu trứng'}
                        </button>
                      )}
                    </div>
                  )}
                  {goatPen && building.status === 'completed' && (
                    <div className="owned-building-upgrade" aria-label="Quản lý chuồng dê">
                      <p>Dê nuôi: {livestock?.goatCount ?? 0} / 2</p>
                      <button
                        className="small-action"
                        type="button"
                        disabled={goatQuantity < 1 || (livestock?.goatCount ?? 0) >= 2}
                        onClick={() => raiseGoat(building.id)}
                      >
                        Nuôi dê con · có {goatQuantity}
                      </button>
                      {(livestock?.goatCount ?? 0) > 0 && (
                        <button
                          className="small-action"
                          type="button"
                          disabled={now < (livestock?.nextMilkAt ?? now)}
                          onClick={() => collectGoatMilk(building.id)}
                        >
                          {(livestock?.nextMilkAt ?? now) > now
                            ? `Sữa dê dự kiến sau ${Math.ceil(((livestock?.nextMilkAt ?? now) - now) / 60_000)} phút`
                            : 'Thu sữa dê'}
                        </button>
                      )}
                    </div>
                  )}
                  {isRainCollector && building.status === 'completed' && (
                    <div className="owned-building-upgrade" aria-label="Máng hứng nước mưa">
                      <p>Nước mưa dự trữ: {gameState.waterCollectors?.[building.id]?.storedUnits ?? 0} / 10</p>
                      <button
                        className="small-action"
                        type="button"
                        disabled={(gameState.waterCollectors?.[building.id]?.storedUnits ?? 0) === 0}
                        onClick={() => collectRainwater(building.id)}
                      >
                        Thu nước mưa
                      </button>
                    </div>
                  )}
                  {isCampfire && building.status === 'completed' && (
                    <div className="owned-building-upgrade">
                      {campfireFuelOptions.map(({ itemId, durationMs }) => {
                        const quantity = gameState.inventory.slots
                          .filter((slot) => slot.itemId === itemId)
                          .reduce((total, slot) => total + slot.quantity, 0)
                        const item = itemDefinitions[itemId]
                        return (
                          <button
                            className="small-action"
                            type="button"
                            key={itemId}
                            disabled={quantity < 1 || gameState.character.currentLocationId !== building.islandId}
                            onClick={() => fuelCampfire(building.id, itemId)}
                          >
                            Thêm {item.name} (+{durationMs / 60_000} phút) · có {quantity}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {upgradeCost && (
                    <div className="owned-building-upgrade">
                      <small>{formatCost(upgradeCost)}</small>
                      {issue && <small className="activity-blocked">{issue}</small>}
                      <button
                        className="small-action"
                        type="button"
                        disabled={Boolean(issue)}
                        onClick={() => upgradeBuilding(building.id)}
                      >
                        Nâng cấp
                      </button>
                    </div>
                  )}
                  {!upgradeCost && <span className="building-max-level">Đã đạt cấp tối đa</span>}
                </article>
              )
            })}
          </section>
        )}
      <p className="inventory-note">Vật liệu bị trừ khi bắt đầu xây hoặc nâng cấp. Mỗi công trình chỉ nhận một dự án tại một thời điểm.</p>
    </div>
  )
}
