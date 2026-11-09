import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { ItemArtwork } from '../../../shared/components/ItemArtwork'
import type { ItemId } from '../../../shared/types/game'
import { getMarketListingsAt } from '../data/marketDefinitions'
import { getIslandDefinition } from '../../world/data/worldDefinitions'

function countItem(slots: { itemId: ItemId; quantity: number }[], itemId: ItemId): number {
  return slots.filter((slot) => slot.itemId === itemId).reduce((total, slot) => total + slot.quantity, 0)
}

export function MarketPage() {
  const { gameState, isLoading, error, buyMarketItem, sellMarketItem } = useGame()

  if (isLoading) return <p className="page-state">Đang tải chợ…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu chợ.'}</p>

  const islandId = gameState.character.currentLocationId
  const island = getIslandDefinition(islandId)
  const marketListings = getMarketListingsAt(islandId)

  return (
    <div className="market-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">GIAO DỊCH · {island?.name ?? 'ĐẢO'}</span>
          <h1>Chợ đảo</h1>
          <p>{island ? `Hàng hóa đặc trưng tại ${island.name}.` : 'Mua vật tư cần thiết hoặc bán bớt hàng hóa đang mang.'}</p>
        </div>
        <div className="stamina-chip"><strong>◉ {gameState.character.coins ?? 0}</strong> xu</div>
      </div>
      <section className="recipe-grid" aria-label="Danh sách hàng hóa">
        {marketListings.length === 0
          ? <p className="empty-world-log">{islandId === 'island_001'
            ? 'Chợ chưa mở tại đảo tân thủ. Hãy đến một hòn đảo khác để giao dịch.'
            : 'Đảo này chưa có chợ giao dịch.'}</p>
          : marketListings.map((listing) => {
          const item = itemDefinitions[listing.itemId]
          const quantity = countItem(gameState.inventory.slots, listing.itemId)
          return (
            <article className="recipe-card market-card" key={listing.itemId}>
              <ItemArtwork itemId={listing.itemId} size="large" />
              <div className="recipe-card-copy">
                <span className="section-kicker">MUA {listing.buyPrice} · BÁN {listing.sellPrice} XU</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <small>Trong túi: {quantity}</small>
              </div>
              <div className="activity-requirements market-actions">
                <button className="gather-button" type="button" onClick={() => buyMarketItem(listing.itemId)}>Mua 1</button>
                <button className="small-action" type="button" disabled={quantity < 1} onClick={() => sellMarketItem(listing.itemId, 1)}>Bán 1</button>
              </div>
            </article>
          )
        })}
      </section>
      <p className="inventory-note">Mỗi đảo chỉ thu mua và bày bán hàng đặc trưng tại chỗ. Cá huyền thoại không xuất hiện trong chợ và chỉ dùng để sưu tầm.</p>
    </div>
  )
}
