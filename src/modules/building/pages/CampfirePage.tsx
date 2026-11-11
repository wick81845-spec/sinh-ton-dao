import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { CampfireClothesDryingControl } from '../components/CampfireClothesDryingControl'
import {
  getRecipeAvailability,
  getRecipesForStation,
  getRecipeOutputQuantity,
  type FishProcessingItemId,
} from '../../crafting/services/craftingService'
import { FishProcessingSelector } from '../../crafting/components/FishProcessingSelector'
import { buildingDefinitions } from '../data/buildingDefinitions'
import {
  campfireFuelOptions,
  getCampfireRemainingMs,
  isCampfireLitAt,
} from '../services/campfireService'
import { getConstructionAvailability } from '../services/buildingService'

export function CampfirePage() {
  const { gameState, isLoading, error, startBuilding, fuelCampfire, setCampfireWarming, queueRecipe } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [fishItemId, setFishItemId] = useState<FishProcessingItemId>()

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang kiểm tra lửa trại…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const campfireDefinition = buildingDefinitions.find((building) => building.id === 'building_campfire')
  if (!campfireDefinition) throw new Error('Campfire building definition is missing.')

  const campfire = gameState.buildings.find((building) => (
    building.definitionId === campfireDefinition.id
    && building.islandId === gameState.character.currentLocationId
    && building.status === 'completed'
  ))
  const campfireUnderConstruction = gameState.buildings.some((building) => (
    building.definitionId === campfireDefinition.id
    && building.islandId === gameState.character.currentLocationId
    && building.status !== 'completed'
  ))
  const fuelRemaining = campfire ? getCampfireRemainingMs(gameState, campfire.id, now) : 0
  const isLit = campfire ? isCampfireLitAt(gameState, campfire.id, now) : false
  const bodyTemperature = gameState.survival.bodyTemperature ?? 37
  const isWarming = gameState.isWarmingAtCampfire === true
  const campfireRecipes = getRecipesForStation(campfireDefinition.id)
  const constructionIssue = getConstructionAvailability(gameState, campfireDefinition.id)

  return (
    <div className="campfire-quick-page">
      <header className="campfire-quick-heading">
        <span className="campfire-quick-icon" aria-hidden="true">🔥</span>
        <div>
          <span className="section-kicker">GÓC BẾP NGOÀI TRỜI</span>
          <h2>Lửa trại</h2>
          <p>Giữ lửa cháy để nấu thức ăn và đun nước.</p>
        </div>
      </header>

      {!campfire && (
        <section className="campfire-quick-section">
          <div className="campfire-quick-section-heading">
            <div>
              <span className="section-kicker">CHUẨN BỊ</span>
              <h3>{campfireUnderConstruction ? 'Đang dựng lửa trại' : 'Chưa có lửa trại'}</h3>
            </div>
            {!campfireUnderConstruction && (
              <button
                className="small-action"
                type="button"
                disabled={Boolean(constructionIssue)}
                onClick={() => startBuilding(campfireDefinition.id)}
              >
                Dựng lửa trại
              </button>
            )}
          </div>
          {constructionIssue && !campfireUnderConstruction && (
            <small className="activity-blocked">{constructionIssue}</small>
          )}
        </section>
      )}

      {campfire && (
        <>
          <section className="campfire-quick-section">
            <div className="campfire-quick-section-heading">
              <div>
                <span className="section-kicker">TRẠNG THÁI</span>
                <h3 className={isLit ? 'is-lit' : 'is-extinguished'}>
                  <span aria-hidden="true">{isLit ? '🔥' : '◌'}</span>
                  {isLit ? `Đang cháy · còn ${Math.ceil(fuelRemaining / 60_000)} phút` : 'Lửa đã tắt'}
                </h3>
              </div>
            </div>
            <div className="campfire-fuel-options" aria-label="Thêm nhiên liệu cho lửa trại">
              {campfireFuelOptions.map(({ itemId, durationMs }) => {
                const quantity = gameState.inventory.slots
                  .filter((slot) => slot.itemId === itemId)
                  .reduce((total, slot) => total + slot.quantity, 0)
                return (
                  <button
                    className="campfire-fuel-button"
                    type="button"
                    key={itemId}
                    disabled={quantity < 1}
                    onClick={() => fuelCampfire(campfire.id, itemId)}
                  >
                    <ItemStack itemId={itemId} quantity={quantity} />
                    <span>+{durationMs / 60_000} phút</span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="campfire-quick-section campfire-warming-section">
            <div className="campfire-quick-section-heading">
              <div>
                <span className="section-kicker">SƯỞI ẤM</span>
                <h3>Thân nhiệt {bodyTemperature.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}°C</h3>
              </div>
              <button
                className="small-action"
                type="button"
                disabled={!isWarming && (!isLit || bodyTemperature >= 37)}
                onClick={() => setCampfireWarming(campfire.id, !isWarming)}
              >
                {isWarming ? 'Dừng sưởi' : 'Sưởi ấm'}
              </button>
            </div>
            <p className="settings-note">
              {isWarming
                ? 'Đang sưởi bên lửa trại · thân nhiệt tăng nhanh hơn đến 37°C.'
                : isLit
                  ? 'Ngồi sưởi bên lửa đang cháy để thân nhiệt tăng nhanh hơn; lửa vẫn làm ấm thụ động khi bạn ở gần.'
                  : 'Cần nhóm lửa trại để sưởi ấm.'}
            </p>
          </section>

          <CampfireClothesDryingControl buildingId={campfire.id} now={now} />

          <section className="campfire-quick-section">
            <div className="campfire-quick-section-heading">
              <div>
                <span className="section-kicker">NẤU ĂN & ĐUN NƯỚC</span>
                <h3>Chế biến bên lửa trại</h3>
              </div>
            </div>
            <div className="campfire-food-list">
              {campfireRecipes.map((recipe) => {
                const selectedFishId = recipe.fishProcessing ? fishItemId : undefined
                const issue = getRecipeAvailability(gameState, recipe.id, now, selectedFishId)
                const outputQuantity = getRecipeOutputQuantity(recipe, selectedFishId)
                return (
                  <article className="campfire-food-row" key={recipe.id}>
                    <div className="campfire-food-copy">
                      <strong>{recipe.name}</strong>
                      {recipe.fishProcessing && (
                        <FishProcessingSelector
                          state={gameState}
                          recipe={recipe}
                          value={selectedFishId}
                          onChange={setFishItemId}
                        />
                      )}
                      <div className="campfire-food-ingredients">
                        {recipe.fishProcessing && selectedFishId && (
                          <ItemStack
                            itemId={selectedFishId}
                            quantity={recipe.fishProcessing.inputQuantity}
                          />
                        )}
                        {recipe.ingredients.map((ingredient) => (
                          <ItemStack
                            key={ingredient.itemId}
                            itemId={ingredient.itemId}
                            quantity={ingredient.quantity}
                          />
                        ))}
                        <span aria-hidden="true">→</span>
                        <ItemStack itemId={recipe.output.itemId} quantity={outputQuantity} />
                      </div>
                      <small>{itemDefinitions[recipe.output.itemId].name} · nhận vào túi đồ</small>
                      {issue && <small className="activity-blocked">{issue}</small>}
                    </div>
                    <button
                      className="small-action"
                      type="button"
                      disabled={Boolean(issue)}
                      onClick={() => queueRecipe(recipe.id, selectedFishId)}
                    >
                      Thực hiện
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
