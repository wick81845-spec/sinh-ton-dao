import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { CampfireClothesDryingControl } from '../components/CampfireClothesDryingControl'
import { recipes } from '../../crafting/data/recipes'
import { getRecipeAvailability } from '../../crafting/services/craftingService'
import { buildingDefinitions } from '../data/buildingDefinitions'
import {
  campfireFuelOptions,
  getCampfireRemainingMs,
  isCampfireLitAt,
} from '../services/campfireService'
import { getConstructionAvailability } from '../services/buildingService'

const campfireFoodRecipeIds = ['recipe_roast_fish', 'recipe_roast_crab', 'recipe_roast_shrimp']

export function CampfirePage() {
  const { gameState, isLoading, error, startBuilding, fuelCampfire, queueRecipe } = useGame()
  const [now, setNow] = useState(gameClock.now())

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
  const isHomeIsland = gameState.character.currentLocationId === gameState.character.homeIslandId
  const fuelRemaining = campfire ? getCampfireRemainingMs(gameState, campfire.id, now) : 0
  const isLit = campfire ? isCampfireLitAt(gameState, campfire.id, now) : false
  const foodRecipes = recipes.filter((recipe) => campfireFoodRecipeIds.includes(recipe.id))
  const constructionIssue = getConstructionAvailability(gameState, campfireDefinition.id)

  return (
    <div className="campfire-quick-page">
      <header className="campfire-quick-heading">
        <span className="campfire-quick-icon" aria-hidden="true">🔥</span>
        <div>
          <span className="section-kicker">GÓC BẾP NGOÀI TRỜI</span>
          <h2>Lửa trại</h2>
          <p>Giữ lửa cháy để nướng thức ăn.</p>
        </div>
      </header>

      {!isHomeIsland && (
        <p className="activity-blocked" role="status">Lửa trại và nhiên liệu chỉ dùng được tại đảo nhà.</p>
      )}

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
                disabled={!isHomeIsland || Boolean(constructionIssue)}
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
                    disabled={!isHomeIsland || quantity < 1}
                    onClick={() => fuelCampfire(campfire.id, itemId)}
                  >
                    <ItemStack itemId={itemId} quantity={quantity} />
                    <span>+{durationMs / 60_000} phút</span>
                  </button>
                )
              })}
            </div>
          </section>

          <CampfireClothesDryingControl buildingId={campfire.id} now={now} />

          <section className="campfire-quick-section">
            <div className="campfire-quick-section-heading">
              <div>
                <span className="section-kicker">MÓN NƯỚNG</span>
                <h3>Nướng để ăn</h3>
              </div>
            </div>
            <div className="campfire-food-list">
              {foodRecipes.map((recipe) => {
                const issue = getRecipeAvailability(gameState, recipe.id, now)
                return (
                  <article className="campfire-food-row" key={recipe.id}>
                    <div className="campfire-food-copy">
                      <strong>{recipe.name}</strong>
                      <div className="campfire-food-ingredients">
                        {recipe.ingredients.map((ingredient) => (
                          <ItemStack
                            key={ingredient.itemId}
                            itemId={ingredient.itemId}
                            quantity={ingredient.quantity}
                          />
                        ))}
                        <span aria-hidden="true">→</span>
                        <ItemStack itemId={recipe.output.itemId} quantity={recipe.output.quantity} />
                      </div>
                      <small>{itemDefinitions[recipe.output.itemId].name} · ăn trong túi đồ</small>
                      {issue && <small className="activity-blocked">{issue}</small>}
                    </div>
                    <button
                      className="small-action"
                      type="button"
                      disabled={Boolean(issue)}
                      onClick={() => queueRecipe(recipe.id)}
                    >
                      Nướng
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
