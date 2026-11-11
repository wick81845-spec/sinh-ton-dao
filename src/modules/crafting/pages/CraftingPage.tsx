import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import type { ItemId } from '../../../shared/types/game'
import { buildingDefinitions, constructionQueueLimit } from '../../building/data/buildingDefinitions'
import { getConstructionAvailability } from '../../building/services/buildingService'
import { characterLevelTitle } from '../../progression/data/progressionDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { FishProcessingSelector } from '../components/FishProcessingSelector'
import { getItemSourceInfo } from '../services/itemSourceService'
import {
  getRecipeAvailability,
  getCraftingPageRecipes,
  getRecipeOutputQuantity,
  recipes,
  type FishProcessingItemId,
} from '../services/craftingService'

type CraftingCategory = 'tools' | 'buildings' | 'items'

function getInventoryQuantity(gameState: ReturnType<typeof useGame>['gameState'], itemId: ItemId): number {
  return gameState?.inventory.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((total, slot) => total + slot.quantity, 0) ?? 0
}

function MaterialRequirement({ itemId, required, available }: {
  itemId: ItemId
  required: number
  available: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const missing = Math.max(0, required - available)

  if (missing === 0) {
    return (
      <span className="crafting-material-requirement">
        <ItemStack itemId={itemId} quantity={required} />
      </span>
    )
  }

  const sources = getItemSourceInfo(itemId)
  return (
    <div className="crafting-material-requirement is-missing">
      <button
        className="crafting-material-find"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <ItemStack itemId={itemId} quantity={required} />
        <small>· Thiếu {missing}</small>
        <strong>{isExpanded ? 'Ẩn nơi tìm' : 'Tìm ở đâu?'}</strong>
      </button>
      {isExpanded && (
        <div className="crafting-material-sources" role="status">
          <strong>Nguồn tìm {itemDefinitions[itemId].name}</strong>
          <ul>
            {sources.map((source) => (
              <li key={`${source.kind}-${source.label}`}>{source.label}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function CraftingPage() {
  const { gameState, isLoading, error, queueRecipe, startBuilding } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [activeCategory, setActiveCategory] = useState<CraftingCategory>('tools')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [fishSelections, setFishSelections] = useState<Partial<Record<string, FishProcessingItemId>>>({})

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang tải công thức…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const activeJob = gameState.craftingQueue[0]
  const activeRecipe = activeJob && recipes.find((recipe) => recipe.id === activeJob.recipeId)
  const isActive = activeJob !== undefined && activeJob.startedAt !== null && activeJob.completesAt !== null
  const progress = isActive
    ? Math.max(0, Math.min(100, ((now - activeJob.startedAt!) / (activeJob.completesAt! - activeJob.startedAt!)) * 100))
    : 0
  const secondsRemaining = isActive
    ? Math.max(0, Math.ceil((activeJob.completesAt! - now) / 1000))
    : 0
  const pageRecipes = getCraftingPageRecipes()
  const normalizedSearch = recipeSearch.trim().toLocaleLowerCase('vi')
  const visibleRecipes = pageRecipes.filter((recipe) => {
    const isTool = itemDefinitions[recipe.output.itemId].category === 'tool'
    const matchesCategory = activeCategory === 'tools' ? isTool : activeCategory === 'items' && !isTool
    const ingredientNames = recipe.ingredients.map((ingredient) => itemDefinitions[ingredient.itemId].name).join(' ')
    const outputName = itemDefinitions[recipe.output.itemId].name
    const matchesSearch = `${recipe.name} ${outputName} ${recipe.description} ${ingredientNames}`.toLocaleLowerCase('vi')
      .includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
  const visibleBuildings = buildingDefinitions.filter((building) => {
    const ingredientNames = building.constructionCost.map((ingredient) => itemDefinitions[ingredient.itemId].name).join(' ')
    return `${building.name} ${building.description} ${ingredientNames}`.toLocaleLowerCase('vi')
      .includes(normalizedSearch)
  })
  const categoryTabs: { id: CraftingCategory; label: string; icon: string; count: number }[] = [
    { id: 'tools', label: 'Dụng cụ', icon: '⚒', count: pageRecipes.filter((recipe) => itemDefinitions[recipe.output.itemId].category === 'tool').length },
    { id: 'buildings', label: 'Công trình', icon: '⌂', count: buildingDefinitions.length },
    { id: 'items', label: 'Vật phẩm', icon: '▤', count: pageRecipes.filter((recipe) => itemDefinitions[recipe.output.itemId].category !== 'tool').length },
  ]

  return (
    <div className="crafting-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">SẢN XUẤT · CHẾ TÁC</span>
          <h1>Xưởng chế tác</h1>
          <p>Tìm dụng cụ, công trình và vật phẩm theo từng nhóm riêng.</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.craftingQueue.length} / 3</strong> việc trong hàng đợi</div>
      </div>

      <aside className="crafting-material-guide">
        <span aria-hidden="true">⌕</span>
        <p>Thiếu nguyên liệu? Bấm vào vật liệu đang thiếu để xem nơi thu thập hoặc công thức tạo ra nó.</p>
      </aside>

      {activeJob && activeRecipe && isActive && (
        <section className="gathering-progress" aria-live="polite">
          <div className="progress-heading">
            <div>
              <span className="section-kicker">ĐANG {activeRecipe.kind === 'processing' ? 'SƠ CHẾ' : 'CHẾ TẠO'}</span>
              <h2>{activeRecipe.name}</h2>
            </div>
            <span className="crafting-time">{secondsRemaining > 0 ? `Còn ${secondsRemaining} giây` : 'Đang hoàn tất…'}</span>
          </div>
          <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ chế tạo" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-footer">
            <ItemStack
              itemId={activeRecipe.output.itemId}
              quantity={activeJob.outputQuantity ?? activeRecipe.output.quantity}
              className="crafting-progress-output"
            />
            <span>{Math.floor(progress)}%</span>
          </div>
        </section>
      )}

      {gameState.craftingQueue.length > 0 && (
        <section className="production-queue" aria-label="Hàng đợi sản xuất">
          <div className="section-heading">
            <div>
              <span className="section-kicker">ĐANG CHỜ</span>
              <h2>Hàng đợi sản xuất</h2>
            </div>
          </div>
          <ol className="queue-list">
            {gameState.craftingQueue.map((job, index) => {
              const recipe = recipes.find((entry) => entry.id === job.recipeId)
              return (
                <li className="queue-row" key={job.id}>
                  <span className="queue-index">{index + 1}</span>
                  <span className="queue-copy">
                    <strong>{recipe?.name ?? 'Công thức không xác định'}</strong>
                    <small>{index === 0 && isActive ? 'Đang thực hiện' : 'Chờ đến lượt'}</small>
                  </span>
                  {recipe && (
                    <ItemStack
                      itemId={recipe.output.itemId}
                      quantity={job.outputQuantity ?? recipe.output.quantity}
                      className="queue-output"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <div className="crafting-toolbar">
        <div className="crafting-category-tabs" role="tablist" aria-label="Nhóm chế tác">
          {categoryTabs.map((tab) => (
            <button
              className={activeCategory === tab.id ? 'is-selected' : ''}
              type="button"
              key={tab.id}
              role="tab"
              id={`crafting-tab-${tab.id}`}
              aria-selected={activeCategory === tab.id}
              aria-controls="crafting-tabpanel"
              onClick={() => setActiveCategory(tab.id)}
            >
              <span className="crafting-category-icon" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              <small>{tab.count}</small>
            </button>
          ))}
        </div>
        <label className="crafting-search">
          <span className="visually-hidden">Tìm công thức hoặc công trình</span>
          <input
            type="search"
            value={recipeSearch}
            placeholder="Tìm món cần làm…"
            onChange={(event) => setRecipeSearch(event.currentTarget.value)}
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      <section
        className="crafting-category-panel"
        id="crafting-tabpanel"
        role="tabpanel"
        aria-labelledby={`crafting-tab-${activeCategory}`}
        aria-label={categoryTabs.find((tab) => tab.id === activeCategory)?.label}
      >
        {activeCategory === 'buildings'
          ? (
            <>
              <div className="crafting-category-heading">
                <div>
                  <span className="section-kicker">ĐẢO HIỆN TẠI · XÂY DỰNG</span>
                  <h2>Công trình có thể dựng</h2>
                </div>
                <span className="crafting-queue-capacity">
                  {gameState.constructionQueue.length} / {constructionQueueLimit} đang thi công
                </span>
              </div>
              {visibleBuildings.length > 0
                ? (
                  <section className="building-grid crafting-building-grid" aria-label="Danh sách công trình">
                    {visibleBuildings.map((building) => {
                      const issue = getConstructionAvailability(gameState, building.id)
                      return (
                        <article className={`building-card crafting-building-card${issue ? ' is-unavailable' : ''}`} key={building.id}>
                          <span className="building-emblem" aria-hidden="true">⌂</span>
                          <span className="section-kicker">
                            {building.requiredLevel ? `TỐI THIỂU CẤP ${building.requiredLevel}` : 'CĂN CỨ'}
                          </span>
                          <h3>{building.name}</h3>
                          <p>{building.description}</p>
                          <div className="building-spec crafting-building-cost">
                            <span>Chi phí</span>
                            <div>
                              {building.constructionCost.map((ingredient) => (
                                <MaterialRequirement
                                  key={ingredient.itemId}
                                  itemId={ingredient.itemId}
                                  required={ingredient.quantity}
                                  available={getInventoryQuantity(gameState, ingredient.itemId)}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="building-spec">
                            <span>Thời gian</span>
                            <strong>{building.constructionDurationSeconds} giây</strong>
                          </div>
                          {issue && <small className="activity-blocked">{issue}</small>}
                          <button
                            className="gather-button building-action"
                            type="button"
                            disabled={Boolean(issue)}
                            onClick={() => startBuilding(building.id)}
                          >
                            {issue ? 'Chưa thể xây' : 'Xây công trình'}
                          </button>
                        </article>
                      )
                    })}
                  </section>
                )
                : <p className="crafting-empty-state">Không tìm thấy công trình phù hợp.</p>}
            </>
          )
          : (
            <>
              <div className="crafting-category-heading">
                <div>
                  <span className="section-kicker">{activeCategory === 'tools' ? 'CÔNG CỤ VÀ TRANG BỊ' : 'VẬT LIỆU, THỰC PHẨM VÀ CHẾ BIẾN'}</span>
                  <h2>{activeCategory === 'tools' ? 'Dụng cụ' : 'Vật phẩm'}</h2>
                </div>
                <span className="crafting-queue-capacity">{visibleRecipes.length} công thức</span>
              </div>
              <section className="recipe-grid" aria-label="Danh sách công thức">
                {visibleRecipes.map((recipe) => {
                  const fishItemId = fishSelections[recipe.id]
                  const issue = getRecipeAvailability(gameState, recipe.id, now, fishItemId)
                  const output = itemDefinitions[recipe.output.itemId]
                  const outputQuantity = getRecipeOutputQuantity(recipe, fishItemId)
                  return (
                    <article
                      className={`recipe-card${issue ? ' is-unavailable' : ''}`}
                      key={recipe.id}
                    >
                      <div className="recipe-summary">
                        <img className={`resource-icon ${output.tone}`} src={output.image} alt="" aria-hidden="true" />
                        <div className="recipe-card-copy">
                          <span className="recipe-meta">
                            {recipe.requiredLevel && recipe.requiredLevel > 1 && `Cấp ${recipe.requiredLevel} · `}
                            {recipe.durationSeconds} giây
                            {recipe.requiredLevel && recipe.requiredLevel > 1 && (
                              <span className="visually-hidden"> · {characterLevelTitle(recipe.requiredLevel)}</span>
                            )}
                          </span>
                          <h3>
                            {recipe.name}
                            <span
                              className="recipe-output-count"
                              aria-label={`Số lượng thành phẩm: ${outputQuantity}`}
                            >
                              ×{outputQuantity}
                            </span>
                          </h3>
                        </div>
                      </div>
                      <div className="recipe-materials">
                        <div className="recipe-materials-heading">
                          <strong>Nguyên liệu</strong>
                        </div>
                        {recipe.fishProcessing && (
                          <FishProcessingSelector
                            state={gameState}
                            recipe={recipe}
                            value={fishItemId}
                            onChange={(itemId) => setFishSelections((current) => ({
                              ...current,
                              [recipe.id]: itemId,
                            }))}
                          />
                        )}
                        <div className="activity-requirements">
                          {recipe.fishProcessing && fishItemId && (
                            <MaterialRequirement
                              itemId={fishItemId}
                              required={recipe.fishProcessing.inputQuantity}
                              available={getInventoryQuantity(gameState, fishItemId)}
                            />
                          )}
                          {recipe.ingredients.map((ingredient) => (
                            <MaterialRequirement
                              key={ingredient.itemId}
                              itemId={ingredient.itemId}
                              required={ingredient.quantity}
                              available={getInventoryQuantity(gameState, ingredient.itemId)}
                            />
                          ))}
                          {recipe.requiredDiscoveryId && (
                            <span>Khám phá: {getIslandDefinition(recipe.requiredDiscoveryId)?.name ?? 'đảo mới'}</span>
                          )}
                          {recipe.stationId && (
                            <span>{buildingDefinitions.find((building) => building.id === recipe.stationId)?.name ?? 'Trạm sản xuất'}</span>
                          )}
                        </div>
                        {issue && <small className="activity-blocked">{issue}</small>}
                      </div>
                      <button
                        className="gather-button recipe-action"
                        type="button"
                        disabled={Boolean(issue)}
                        onClick={() => queueRecipe(recipe.id, fishItemId)}
                      >
                        {issue ? 'Chưa thể thực hiện' : recipe.kind === 'processing' ? 'Sơ chế' : 'Chế tạo'}
                      </button>
                    </article>
                  )
                })}
                {visibleRecipes.length === 0 && <p className="crafting-empty-state">Không tìm thấy công thức phù hợp.</p>}
              </section>
            </>
          )}
      </section>
      <p className="inventory-note">Nguyên liệu được trừ khi đưa vào hàng đợi; chỗ chứa sản phẩm được giữ trước để tránh mất vật phẩm khi hoàn tất.</p>
    </div>
  )
}
