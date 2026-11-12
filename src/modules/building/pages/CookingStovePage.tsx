import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { getRecipeAvailability, getRecipesForStation } from '../../crafting/services/craftingService'
import { buildingDefinitions } from '../data/buildingDefinitions'
import { getConstructionAvailability } from '../services/buildingService'

export function CookingStovePage() {
  const { gameState, isLoading, error, queueRecipe, startBuilding } = useGame()
  const [now, setNow] = useState(gameClock.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang kiểm tra bếp nấu…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const stoveDefinition = buildingDefinitions.find((building) => building.id === 'building_cooking_stove')
  if (!stoveDefinition) throw new Error('Cooking stove building definition is missing.')

  const stove = gameState.buildings.find((building) => (
    building.definitionId === stoveDefinition.id
    && building.islandId === gameState.character.currentLocationId
    && building.status === 'completed'
  ))
  const stoveUnderConstruction = gameState.buildings.some((building) => (
    building.definitionId === stoveDefinition.id
    && building.islandId === gameState.character.currentLocationId
    && building.status !== 'completed'
  ))
  const constructionIssue = getConstructionAvailability(gameState, stoveDefinition.id)
  const stoveRecipes = getRecipesForStation(stoveDefinition.id)

  return (
    <div className="campfire-quick-page">
      <header className="campfire-quick-heading">
        <span className="campfire-quick-icon" aria-hidden="true">♨</span>
        <div>
          <span className="section-kicker">GÓC BẾP</span>
          <h2>Bếp nấu</h2>
          <p>Nấu các món ăn cần bếp tại đảo hiện tại.</p>
        </div>
      </header>

      {!stove && (
        <section className="campfire-quick-section">
          <div className="campfire-quick-section-heading">
            <div>
              <span className="section-kicker">CHUẨN BỊ</span>
              <h3>{stoveUnderConstruction ? 'Đang xây bếp nấu' : 'Chưa có bếp nấu'}</h3>
            </div>
            {!stoveUnderConstruction && (
              <button
                className="small-action"
                type="button"
                disabled={Boolean(constructionIssue)}
                onClick={() => startBuilding(stoveDefinition.id)}
              >
                Xây bếp nấu
              </button>
            )}
          </div>
          {constructionIssue && !stoveUnderConstruction && (
            <small className="activity-blocked">{constructionIssue}</small>
          )}
          <div className="campfire-food-ingredients" style={{ marginTop: '10px' }}>
            <span>Chi phí xây: </span>
            {stoveDefinition.constructionCost.map((cost) => (
              <ItemStack key={cost.itemId} itemId={cost.itemId} quantity={cost.quantity} />
            ))}
          </div>
        </section>
      )}

      {stove && (
        <section className="campfire-quick-section">
          <div className="campfire-quick-section-heading">
            <div>
              <span className="section-kicker">MÓN NẤU</span>
              <h3>Chế biến tại bếp</h3>
            </div>
          </div>
          <div className="campfire-food-list">
            {stoveRecipes.map((recipe) => {
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
                    <small>{itemDefinitions[recipe.output.itemId].name} · nhận vào túi đồ</small>
                    {issue && <small className="activity-blocked">{issue}</small>}
                  </div>
                  <button
                    className="small-action"
                    type="button"
                    disabled={Boolean(issue)}
                    onClick={() => queueRecipe(recipe.id)}
                  >
                    Nấu
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
