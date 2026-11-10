import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { gameClock } from '../../../services/clock/gameClock'
import { getRecipeAvailability, recipes } from '../services/craftingService'
import { craftingConceptGroups } from '../data/craftingConceptCatalog'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { characterLevelTitle } from '../../progression/data/progressionDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'

export function CraftingPage() {
  const { gameState, isLoading, error, queueRecipe } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [recipeFilter, setRecipeFilter] = useState<'all' | 'processing' | 'crafting'>('all')
  const [recipeSearch, setRecipeSearch] = useState('')

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
  const visibleRecipes = recipes.filter((recipe) => {
    const matchesKind = recipeFilter === 'all' || recipe.kind === recipeFilter
    const ingredientNames = recipe.ingredients.map((ingredient) => itemDefinitions[ingredient.itemId].name).join(' ')
    const matchesSearch = `${recipe.name} ${recipe.description} ${ingredientNames}`.toLocaleLowerCase('vi')
      .includes(recipeSearch.trim().toLocaleLowerCase('vi'))
    return matchesKind && matchesSearch
  })

  return (
    <div className="crafting-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">SẢN XUẤT · CHẾ TÁC</span>
          <h1>Chế biến & chế tạo</h1>
          <p>Sơ chế nguyên liệu hoặc chế tạo vật dụng tại bàn làm việc.</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.craftingQueue.length} / 3</strong> việc trong hàng đợi</div>
      </div>

      <aside className="crafting-rope-guide">
        <div>
          <strong>Đang tìm Dây bện để làm cần câu?</strong>
          <p>Thu hoạch ở Rừng dừa để nhận Sợi thực vật, cần 3 sợi cho mỗi Dây bện.</p>
        </div>
        <a href="#recipe-rope">Tới công thức</a>
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
            <ItemStack itemId={activeRecipe.output.itemId} quantity={activeRecipe.output.quantity} className="crafting-progress-output" />
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
                  {recipe && <ItemStack itemId={recipe.output.itemId} quantity={recipe.output.quantity} className="queue-output" />}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <div className="section-heading crafting-section-heading">
        <div>
          <span className="section-kicker">QUY TRÌNH KHẢ DỤNG</span>
          <h2>Sơ chế & chế tác</h2>
        </div>
      </div>
      <div className="crafting-toolbar">
        <div className="crafting-filter-group" role="group" aria-label="Lọc công thức">
          {([
            ['all', 'Tất cả'],
            ['processing', 'Sơ chế'],
            ['crafting', 'Chế tạo'],
          ] as const).map(([filter, label]) => (
            <button
              className={recipeFilter === filter ? 'is-selected' : ''}
              type="button"
              key={filter}
              aria-pressed={recipeFilter === filter}
              onClick={() => setRecipeFilter(filter)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="crafting-search">
          <span className="visually-hidden">Tìm công thức</span>
          <input
            type="search"
            value={recipeSearch}
            placeholder="Tìm món cần làm…"
            onChange={(event) => setRecipeSearch(event.currentTarget.value)}
          />
          <span aria-hidden="true">⌕</span>
        </label>
      </div>
      <section className="recipe-grid" aria-label="Danh sách công thức">
        {visibleRecipes.map((recipe) => {
          const issue = getRecipeAvailability(gameState, recipe.id, now)
          const output = itemDefinitions[recipe.output.itemId]
          return (
            <article
              className={`recipe-card${issue ? ' is-unavailable' : ''}`}
              id={recipe.id === 'recipe_rope' ? 'recipe-rope' : undefined}
              key={recipe.id}
            >
              <div className="recipe-summary">
                <img className={`resource-icon ${output.tone}`} src={output.image} alt="" aria-hidden="true" />
                <div className="recipe-card-copy">
                  <span className="recipe-meta">
                    {recipe.kind === 'processing' ? 'Sơ chế' : 'Chế tạo'} · Cấp {recipe.requiredLevel ?? 1} · {recipe.durationSeconds} giây
                    {recipe.requiredLevel && <span className="visually-hidden"> · {characterLevelTitle(recipe.requiredLevel)}</span>}
                  </span>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.description}</p>
                </div>
              </div>
              <div className="recipe-materials">
                <div className="recipe-materials-heading">
                  <strong>Nguyên liệu</strong>
                  <ItemStack itemId={recipe.output.itemId} quantity={recipe.output.quantity} className="recipe-output" />
                </div>
                <div className="activity-requirements">
                  {recipe.ingredients.map((ingredient) => {
                    const available = gameState.inventory.slots
                      .filter((slot) => slot.itemId === ingredient.itemId)
                      .reduce((total, slot) => total + slot.quantity, 0)
                    return (
                      <span key={ingredient.itemId} className={available < ingredient.quantity ? 'activity-blocked' : undefined}>
                        <ItemStack itemId={ingredient.itemId} quantity={ingredient.quantity} /> · Có {available}
                        {available < ingredient.quantity ? ` · Thiếu ${ingredient.quantity - available}` : ''}
                      </span>
                    )
                  })}
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
                onClick={() => queueRecipe(recipe.id)}
              >
                {issue ? 'Chưa thể thực hiện' : recipe.kind === 'processing' ? 'Sơ chế' : 'Chế tạo'}
              </button>
            </article>
          )
        })}
        {visibleRecipes.length === 0 && <p className="crafting-empty-state">Không tìm thấy công thức phù hợp.</p>}
      </section>
      <section className="crafting-concept-section" aria-labelledby="crafting-concepts-title">
        <div className="section-heading crafting-section-heading">
          <div>
            <span className="section-kicker">THƯ VIỆN HÌNH ẢNH</span>
            <h2 id="crafting-concepts-title">Ý tưởng chế tạo và xây dựng</h2>
            <p className="crafting-concept-note">
              Hình minh họa theo các bản vẽ bạn gửi. Những món chưa có công thức hoặc chức năng trong game hiện được trưng bày như nội dung dự kiến.
            </p>
          </div>
        </div>
        <div className="crafting-concept-groups">
          {craftingConceptGroups.map((group) => (
            <details className="crafting-concept-group" key={group.id}>
              <summary>
                <span>{group.name}</span>
                <small>{group.items.length} hình</small>
              </summary>
              <div className="crafting-concept-grid">
                {group.items.map((item) => (
                  <article className="crafting-concept-card" key={item.id}>
                    <img src={item.image} alt="" loading="lazy" />
                    <span>{item.name}</span>
                  </article>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
      <p className="inventory-note">Nguyên liệu được trừ khi đưa vào hàng đợi; chỗ chứa sản phẩm được giữ trước để tránh mất vật phẩm khi hoàn tất.</p>
    </div>
  )
}
