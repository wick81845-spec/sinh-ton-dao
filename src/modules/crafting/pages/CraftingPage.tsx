import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import type { ItemId } from '../../../shared/types/game'
import { buildingDefinitions, constructionQueueLimit } from '../../building/data/buildingDefinitions'
import { getConstructionAvailability } from '../../building/services/buildingService'
import { characterLevelTitle } from '../../progression/data/progressionDefinitions'
import { FishProcessingSelector } from '../components/FishProcessingSelector'
import { getItemSourceInfo } from '../services/itemSourceService'
import {
  getRecipeAvailability,
  getCraftingPageRecipes,
  getRecipeOutputQuantity,
  recipes,
  type FishProcessingItemId,
} from '../services/craftingService'
import type { RecipeDefinition } from '../data/recipes'
import '../../../styles/craftingMinecraft.css'

type CraftingTab = 'all' | 'tools' | 'materials' | 'food' | 'survival' | 'buildings'

function getRecipeCategory(recipe: RecipeDefinition): 'tools' | 'materials' | 'food' | 'survival' {
  const item = itemDefinitions[recipe.output.itemId]
  if (
    recipe.output.itemId === 'item_wooden_shield'
    || recipe.output.itemId === 'item_torch'
    || recipe.output.itemId === 'item_waterskin'
    || recipe.output.itemId === 'item_bandage'
    || recipe.output.itemId === 'item_backpack'
    || item.clothingSlot !== undefined
  ) {
    return 'survival'
  }
  if (item.category === 'tool' || item.equipmentSlot === 'weapon') return 'tools'
  if (item.category === 'food' || recipe.fishProcessing !== undefined) return 'food'
  return 'materials'
}

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

function generateGrid3x3(recipe: RecipeDefinition): (ItemId | null)[][] {
  if (recipe.pattern && recipe.pattern.length === 3) {
    return recipe.pattern
  }
  const grid: (ItemId | null)[][] = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]
  let slotIndex = 0
  for (const ing of recipe.ingredients) {
    const count = Math.min(ing.quantity, 9 - slotIndex)
    for (let i = 0; i < count; i++) {
      const r = Math.floor(slotIndex / 3)
      const c = slotIndex % 3
      if (r < 3) {
        grid[r][c] = ing.itemId
        slotIndex++
      }
    }
  }
  return grid
}

export function CraftingPage() {
  const { gameState, isLoading, error, queueRecipe, startBuilding } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [activeTab, setActiveTab] = useState<CraftingTab>('all')
  const [recipeSearch, setRecipeSearch] = useState('')
  const [onlyCraftable, setOnlyCraftable] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('recipe_wooden_shield')
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

  const filteredRecipes = pageRecipes.filter((recipe) => {
    const category = getRecipeCategory(recipe)
    const matchesTab = activeTab === 'all' || activeTab === category

    const ingredientNames = recipe.ingredients.map((ingredient) => itemDefinitions[ingredient.itemId].name).join(' ')
    const requiredToolNames = (recipe.requiredToolAlternatives ?? [])
      .map((itemId) => itemDefinitions[itemId].name).join(' ')
    const outputName = itemDefinitions[recipe.output.itemId].name
    const matchesSearch = `${recipe.name} ${outputName} ${recipe.description} ${ingredientNames} ${requiredToolNames}`.toLocaleLowerCase('vi')
      .includes(normalizedSearch)

    if (!matchesTab || !matchesSearch) return false

    if (onlyCraftable) {
      const hasAllIngredients = recipe.ingredients.every(
        (ing) => getInventoryQuantity(gameState, ing.itemId) >= ing.quantity,
      )
      const hasRequiredTool = !recipe.requiredToolAlternatives?.length
        || recipe.requiredToolAlternatives.some((itemId) => getInventoryQuantity(gameState, itemId) > 0)
      if (!hasAllIngredients || !hasRequiredTool) return false
    }

    return true
  })

  const selectedRecipe = pageRecipes.find((r) => r.id === selectedRecipeId) ?? filteredRecipes[0] ?? pageRecipes[0]
  const selectedFishItemId = selectedRecipe ? fishSelections[selectedRecipe.id] : undefined
  const selectedIssue = selectedRecipe
    ? getRecipeAvailability(gameState, selectedRecipe.id, now, selectedFishItemId)
    : 'Chưa chọn công thức.'
  const selectedOutput = selectedRecipe ? itemDefinitions[selectedRecipe.output.itemId] : null
  const selectedOutputQuantity = selectedRecipe
    ? getRecipeOutputQuantity(selectedRecipe, selectedFishItemId)
    : 1
  const selectedGrid = selectedRecipe ? generateGrid3x3(selectedRecipe) : [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]

  // Filter out buildings already completed or under construction on current island!
  const visibleBuildings = buildingDefinitions.filter((building) => {
    const isCompletedOnCurrentIsland = gameState.buildings.some(
      (b) => b.definitionId === building.id && b.islandId === gameState.character.currentLocationId && b.status === 'completed',
    )
    if (isCompletedOnCurrentIsland) return false

    const isInQueue = gameState.constructionQueue.some((q) => q.buildingId.startsWith(building.id))
    if (isInQueue) return false

    const ingredientNames = building.constructionCost.map((ingredient) => itemDefinitions[ingredient.itemId].name).join(' ')
    return `${building.name} ${building.description} ${ingredientNames}`.toLocaleLowerCase('vi')
      .includes(normalizedSearch)
  })

  const buildingCount = buildingDefinitions.filter((building) => {
    const isCompleted = gameState.buildings.some(
      (b) => b.definitionId === building.id && b.islandId === gameState.character.currentLocationId && b.status === 'completed',
    )
    return !isCompleted
  }).length

  const tabs: { id: CraftingTab; label: string; icon: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', icon: '🧭', count: pageRecipes.length },
    { id: 'tools', label: 'Dụng cụ & Vũ khí', icon: '⚒', count: pageRecipes.filter((r) => getRecipeCategory(r) === 'tools').length },
    { id: 'materials', label: 'Vật liệu', icon: '🧱', count: pageRecipes.filter((r) => getRecipeCategory(r) === 'materials').length },
    { id: 'food', label: 'Thực phẩm', icon: '🍎', count: pageRecipes.filter((r) => getRecipeCategory(r) === 'food').length },
    { id: 'survival', label: 'Sinh tồn & Cơ chế', icon: '🔴', count: pageRecipes.filter((r) => getRecipeCategory(r) === 'survival').length },
    { id: 'buildings', label: 'Công trình', icon: '⌂', count: buildingCount },
  ]

  return (
    <div className="crafting-page mc-crafting-wrapper">
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

      {activeTab === 'buildings' ? (
        <section className="crafting-category-panel" role="region" aria-label="Công trình có thể dựng">
          <div className="crafting-toolbar">
            <div className="crafting-category-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? 'is-selected' : ''}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="crafting-category-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <small>{tab.count}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="crafting-category-heading">
            <div>
              <span className="section-kicker">ĐẢO HIỆN TẠI · XÂY DỰNG</span>
              <h2>Công trình có thể dựng (Đã ẩn các công trình đã hoàn thành)</h2>
            </div>
            <span className="crafting-queue-capacity">
              {gameState.constructionQueue.length} / {constructionQueueLimit} đang thi công
            </span>
          </div>
          {visibleBuildings.length > 0 ? (
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
          ) : (
            <p className="crafting-empty-state">Tất cả công trình khả dụng trên đảo này đều đã được xây dựng xong!</p>
          )}
        </section>
      ) : (
        <div className="mc-crafting-layout">
          {/* Left: Recipe Book */}
          <div className="mc-recipe-book-panel">
            <div className="mc-tabs-vertical" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`mc-tab-button${activeTab === tab.id ? ' is-active' : ''}`}
                  title={`${tab.label} (${tab.count})`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span aria-hidden="true">{tab.icon}</span>
                </button>
              ))}
            </div>

            <div className="mc-recipe-book-content">
              <div className="mc-search-bar-row">
                <div className="mc-search-input-wrap">
                  <span className="mc-search-icon" aria-hidden="true">🔍</span>
                  <input
                    type="text"
                    className="mc-search-input"
                    placeholder="Tìm kiếm công thức..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className={`mc-filter-btn${onlyCraftable ? ' is-active' : ''}`}
                  title="Chỉ hiện công thức có đủ nguyên liệu"
                  onClick={() => setOnlyCraftable((v) => !v)}
                >
                  {onlyCraftable ? 'Đủ đồ' : 'Tất cả'}
                </button>
              </div>

              <div className="mc-recipe-grid-scroll">
                {filteredRecipes.map((recipe) => {
                  const outDef = itemDefinitions[recipe.output.itemId]
                  const hasAll = recipe.ingredients.every(
                    (ing) => getInventoryQuantity(gameState, ing.itemId) >= ing.quantity,
                  )
                  const hasRequiredTool = !recipe.requiredToolAlternatives?.length
                    || recipe.requiredToolAlternatives.some((itemId) => getInventoryQuantity(gameState, itemId) > 0)
                  const isSelected = selectedRecipe?.id === recipe.id
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      className={`mc-recipe-slot${isSelected ? ' is-selected' : ''}${!hasAll || !hasRequiredTool ? ' is-unusable' : ''}`}
                      title={`${recipe.name} (${hasAll && hasRequiredTool ? 'Đủ nguyên liệu và dụng cụ' : 'Thiếu nguyên liệu hoặc dụng cụ'})`}
                      onClick={() => setSelectedRecipeId(recipe.id)}
                    >
                      <img src={outDef.image} alt={recipe.name} />
                      {recipe.output.quantity > 1 && (
                        <span className="mc-slot-count">{recipe.output.quantity}</span>
                      )}
                    </button>
                  )
                })}
                {filteredRecipes.length === 0 && (
                  <p style={{ color: '#fff', fontSize: '0.85rem', padding: '1rem', textAlign: 'center', gridColumn: '1 / -1' }}>
                    Không có công thức phù hợp.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Crafting Table 3x3 + Inventory */}
          <div className="mc-crafting-table-panel">
            <h2 className="mc-section-title">Crafting (Bàn chế tác 3×3)</h2>

            <div className="mc-crafting-area">
              <button
                type="button"
                className="mc-recipe-book-btn"
                title="Sách công thức sinh tồn"
                onClick={() => setOnlyCraftable((c) => !c)}
              >
                📗
              </button>

              {/* 3x3 Grid */}
              <div className="mc-grid-3x3" aria-label="Lưới chế tạo 3x3">
                {selectedGrid.map((row, rIdx) =>
                  row.map((slotItemId, cIdx) => {
                    const slotDef = slotItemId ? itemDefinitions[slotItemId] : null
                    const hasIng = slotItemId ? getInventoryQuantity(gameState, slotItemId) > 0 : true
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        className={`mc-grid-slot${slotItemId ? ' is-filled' : ''}${!hasIng ? ' is-missing' : ''}`}
                        title={slotDef ? `${slotDef.name} (Có sẵn: ${getInventoryQuantity(gameState, slotItemId!)})` : 'Ô trống'}
                      >
                        {slotDef && <img src={slotDef.image} alt={slotDef.name} />}
                      </div>
                    )
                  }),
                )}
              </div>

              <div className="mc-crafting-arrow" aria-hidden="true">➔</div>

              {/* Output slot */}
              <div className="mc-output-slot-wrap">
                <div
                  className="mc-output-slot"
                  title={selectedOutput ? `${selectedOutput.name} × ${selectedOutputQuantity}` : 'Chưa có sản phẩm'}
                >
                  {selectedOutput && (
                    <>
                      <img src={selectedOutput.image} alt={selectedOutput.name} />
                      {selectedOutputQuantity > 1 && (
                        <span className="mc-slot-count">{selectedOutputQuantity}</span>
                      )}
                    </>
                  )}
                </div>
                {selectedRecipe && (
                  <button
                    type="button"
                    className="mc-craft-action-btn"
                    disabled={Boolean(selectedIssue)}
                    onClick={() => queueRecipe(selectedRecipe.id, selectedFishItemId)}
                  >
                    {selectedIssue ? 'Chưa thể chế tạo' : 'Chế tạo'}
                  </button>
                )}
              </div>
            </div>

            {/* Selected Recipe Details */}
            {selectedRecipe && (
              <div className="mc-recipe-info-card">
                <h3>{selectedRecipe.name}</h3>
                <p>{selectedRecipe.description}</p>
                <div className="mc-recipe-meta-row">
                  <span>Thời gian: {selectedRecipe.durationSeconds} giây</span>
                  {selectedRecipe.requiredLevel && selectedRecipe.requiredLevel > 1 && (
                    <span>Yêu cầu cấp: {selectedRecipe.requiredLevel} ({characterLevelTitle(selectedRecipe.requiredLevel)})</span>
                  )}
                  {selectedRecipe.stationId && (
                    <span>Trạm: {buildingDefinitions.find((b) => b.id === selectedRecipe.stationId)?.name ?? 'Căn cứ'}</span>
                  )}
                </div>

                {selectedRecipe.fishProcessing && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <FishProcessingSelector
                      state={gameState}
                      recipe={selectedRecipe}
                      value={selectedFishItemId}
                      onChange={(itemId) => setFishSelections((cur) => ({ ...cur, [selectedRecipe.id]: itemId }))}
                    />
                  </div>
                )}

                <div className="activity-requirements" style={{ marginTop: '0.5rem' }}>
                  {selectedRecipe.ingredients.map((ing) => (
                    <MaterialRequirement
                      key={ing.itemId}
                      itemId={ing.itemId}
                      required={ing.quantity}
                      available={getInventoryQuantity(gameState, ing.itemId)}
                    />
                  ))}
                </div>
                {selectedRecipe.requiredToolAlternatives && selectedRecipe.requiredToolAlternatives.length > 0 && (
                  <p className="mc-recipe-tool-requirement">
                    Dụng cụ cần có (không tiêu hao): {selectedRecipe.requiredToolAlternatives
                      .map((itemId) => itemDefinitions[itemId].name).join(' hoặc ')}
                  </p>
                )}

                {selectedIssue && <span className="mc-issue-warning">{selectedIssue}</span>}
              </div>
            )}

            {/* Inventory Area */}
            <div className="mc-inventory-area">
              <h3 className="mc-section-title">Inventory (Túi đồ người chơi)</h3>
              <div className="mc-inventory-grid" aria-label="Lưới túi đồ">
                {Array.from({ length: Math.max(18, gameState.inventory.maxSlots) }, (_, idx) => {
                  const slot = gameState.inventory.slots[idx]
                  const item = slot ? itemDefinitions[slot.itemId] : null
                  return (
                    <div
                      key={idx}
                      className="mc-inventory-slot"
                      title={item ? `${item.name} (${slot.quantity})` : 'Ô trống'}
                    >
                      {item && (
                        <>
                          <img src={item.image} alt={item.name} />
                          {slot.quantity > 1 && <span className="mc-slot-count">{slot.quantity}</span>}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Queue List */}
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
    </div>
  )
}
