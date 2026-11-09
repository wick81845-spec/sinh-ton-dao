import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ItemContainer, ItemId } from '../../../shared/types/game'

function ContainerPanel({
  container,
  title,
  kind,
  onTransfer,
  onUse,
}: {
  container: ItemContainer
  title: string
  kind: 'bag' | 'storage'
  onTransfer(itemId: ItemId, quantity: number): void
  onUse?(itemId: ItemId): void
}) {
  const occupiedSlots = container.slots.length
  const totalWeight = container.slots.reduce(
    (total, slot) => total + itemDefinitions[slot.itemId].weight * slot.quantity,
    0,
  )

  return (
    <section className="container-panel">
      <div className="container-heading">
        <div>
          <span className="section-kicker">{kind === 'bag' ? 'VẬT PHẨM ĐANG MANG' : 'RƯƠNG TRÊN ĐẢO'}</span>
          <h2>{title}</h2>
        </div>
        <span className="container-slots">{occupiedSlots} / {container.maxSlots} ô</span>
      </div>
      <div className="container-capacity">
        <span><i style={{ width: `${occupiedSlots / container.maxSlots * 100}%` }} /></span>
      </div>
      <div className="container-list">
        {container.slots.length === 0
          ? <p className="empty-container">Chưa có vật phẩm nào trong đây.</p>
          : container.slots.map((slot) => {
            const item = itemDefinitions[slot.itemId]
            return (
              <article className="item-row" key={slot.itemId}>
                <img className={`resource-icon ${item.tone}`} src={item.image} alt="" aria-hidden="true" />
                <div className="item-row-details">
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </div>
                <span className="item-quantity">× {slot.quantity}</span>
                <div className="item-actions">
                  {kind === 'bag' && item.usable && onUse && (
                    <button className="small-action" type="button" onClick={() => onUse(slot.itemId)}>Dùng 1</button>
                  )}
                  <button
                    className="small-action"
                    type="button"
                    onClick={() => onTransfer(slot.itemId, slot.quantity)}
                  >
                    {kind === 'bag' ? 'Cất tất cả' : 'Lấy tất cả'}
                  </button>
                </div>
              </article>
            )
          })}
      </div>
      <div className="container-footer">
        <span>{occupiedSlots} ô đang sử dụng</span>
        <span>Khối lượng {totalWeight.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg</span>
      </div>
    </section>
  )
}

export function InventoryPage() {
  const { gameState, isLoading, error, transferToStorage, transferToInventory, consumeItem } = useGame()

  if (isLoading) return <p className="page-state">Đang tải túi đồ…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu túi đồ.'}</p>

  return (
    <div className="inventory-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">VẬT PHẨM · LƯU TRỮ</span>
          <h1>Túi đồ &amp; kho chứa</h1>
          <p>Chuyển vật phẩm giữa hành trang và rương trên đảo.</p>
        </div>
      </div>
      <div className="inventory-containers">
        <ContainerPanel
          container={gameState.inventory}
          title="Hành trang"
          kind="bag"
          onTransfer={(itemId, quantity) => transferToStorage(itemId, quantity)}
          onUse={(itemId) => consumeItem(itemId)}
        />
        <ContainerPanel
          container={gameState.storage}
          title="Rương gỗ"
          kind="storage"
          onTransfer={(itemId, quantity) => transferToInventory(itemId, quantity)}
        />
      </div>
      <p className="inventory-note">Thao tác chuyển đồ được xử lý nguyên tử: nếu kho đích không đủ chỗ, vật phẩm sẽ ở nguyên vị trí cũ.</p>
    </div>
  )
}
