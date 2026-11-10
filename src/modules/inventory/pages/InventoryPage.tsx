import { useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ItemContainer, ItemId } from '../../../shared/types/game'

function ContainerPanel({
  container,
  title,
  kind,
  itemDurability,
  onTransfer,
  onUse,
  onDiscard,
  onEquipBackpack,
  onEquipWeapon,
  onRepair,
}: {
  container: ItemContainer
  title: string
  kind: 'bag' | 'storage'
  itemDurability?: Partial<Record<ItemId, number>>
  onTransfer(itemId: ItemId, quantity: number): void
  onUse?(itemId: ItemId): void
  onDiscard?(itemId: ItemId, quantity: number): void
  onEquipBackpack?(): void
  onEquipWeapon?(itemId: ItemId): void
  onRepair?(itemId: ItemId): void
}) {
  const [transferAmounts, setTransferAmounts] = useState<Record<string, number>>({})
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
          : container.slots.map((slot, index) => {
            const item = itemDefinitions[slot.itemId]
            return (
              <article className="item-row" key={`${slot.itemId}-${slot.expiresAt ?? 'stable'}-${index}`}>
                <img className={`resource-icon ${item.tone}`} src={item.image} alt="" aria-hidden="true" />
                <div className="item-row-details">
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                  {item.maxDurability && (
                    <small>Độ bền {itemDurability?.[slot.itemId] ?? item.maxDurability}/{item.maxDurability}</small>
                  )}
                  {slot.expiresAt !== undefined && (
                    <small>Hạn dùng {new Date(slot.expiresAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small>
                  )}
                </div>
                <span className="item-quantity">× {slot.quantity}</span>
                <div className="item-actions">
                  {kind === 'bag' && item.usable && onUse && (
                    <button className="small-action" type="button" onClick={() => onUse(slot.itemId)}>Dùng 1</button>
                  )}
                  {kind === 'bag' && slot.itemId === 'item_backpack' && onEquipBackpack && (
                    <button className="small-action" type="button" onClick={onEquipBackpack}>Trang bị</button>
                  )}
                  {kind === 'bag' && item.equipmentSlot === 'weapon' && onEquipWeapon && (
                    <button className="small-action" type="button" onClick={() => onEquipWeapon(slot.itemId)}>Trang bị vũ khí</button>
                  )}
                  {kind === 'bag' && item.maxDurability && onRepair
                    && (itemDurability?.[slot.itemId] ?? item.maxDurability) < item.maxDurability && (
                      <button className="small-action" type="button" onClick={() => onRepair(slot.itemId)}>Sửa tại bàn</button>
                    )}
                  {kind === 'bag' && onDiscard && (
                    <button className="small-action" type="button" onClick={() => onDiscard(slot.itemId, slot.quantity)}>Vứt tất cả</button>
                  )}
                  <button
                    className="small-action"
                    type="button"
                    onClick={() => onTransfer(slot.itemId, Math.min(slot.quantity, transferAmounts[slot.itemId] ?? 1))}
                  >
                    {kind === 'bag' ? 'Cất số lượng' : 'Lấy số lượng'}
                  </button>
                  <label className="transfer-quantity">
                    <span>{kind === 'bag' ? 'Số lượng cất' : 'Số lượng lấy'}</span>
                    <input
                      aria-label={`${kind === 'bag' ? 'Số lượng cất' : 'Số lượng lấy'} ${item.name}`}
                      type="number"
                      min={1}
                      max={slot.quantity}
                      value={Math.min(slot.quantity, transferAmounts[slot.itemId] ?? 1)}
                      onChange={(event) => {
                        const amount = Number(event.target.value)
                        setTransferAmounts((current) => ({
                          ...current,
                          [slot.itemId]: Number.isFinite(amount) ? Math.max(1, Math.min(slot.quantity, amount)) : 1,
                        }))
                      }}
                    />
                  </label>
                  {slot.quantity > 1 && (
                    <button className="small-action" type="button" onClick={() => onTransfer(slot.itemId, slot.quantity)}>
                      {kind === 'bag' ? 'Cất tất cả' : 'Lấy tất cả'}
                    </button>
                  )}
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
  const {
    gameState,
    isLoading,
    error,
    transferToStorage,
    transferToInventory,
    consumeItem,
    discardItems,
    equipBackpack,
    unequipBackpack,
    equipWeapon,
    unequipWeapon,
    repairItem,
  } = useGame()

  if (isLoading) return <p className="page-state">Đang tải túi đồ…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu túi đồ.'}</p>

  return (
    <div className="inventory-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">VẬT PHẨM · LƯU TRỮ</span>
          <h1>Túi đồ &amp; kho chứa</h1>
          <p>Hành trang cơ bản có 12 ô. Trang bị ba lô để mở rộng lên 24 ô.</p>
        </div>
        <div className="stamina-chip">
          <strong>{gameState.backpackEquipped ? 'Đã trang bị ba lô' : 'Chưa có ba lô'}</strong>
          {gameState.backpackEquipped && <button className="small-action" type="button" onClick={unequipBackpack}>Tháo ba lô</button>}
        </div>
      </div>
      <section className="container-panel equipped-weapon-panel" aria-label="Vũ khí đang trang bị">
        <div className="container-heading">
          <div>
            <span className="section-kicker">TRANG BỊ RIÊNG</span>
            <h2>Vũ khí</h2>
          </div>
          {gameState.equippedWeaponId
            ? <button className="small-action" type="button" onClick={unequipWeapon}>Cất vũ khí</button>
            : <span className="container-slots">Chưa trang bị</span>}
        </div>
        {gameState.equippedWeaponId && (() => {
          const weaponId = gameState.equippedWeaponId
          const weapon = itemDefinitions[weaponId]
          return (
            <div className="item-row">
              <img className={`resource-icon ${weapon.tone}`} src={weapon.image} alt="" aria-hidden="true" />
              <div className="item-row-details">
                <strong>{weapon.name}</strong>
                <small>{weapon.description}</small>
                <small>Độ bền {gameState.itemDurability?.[weaponId] ?? weapon.maxDurability}/{weapon.maxDurability} · +{weapon.weaponDamageBonus ?? 0} sát thương</small>
              </div>
              {weapon.maxDurability
                && (gameState.itemDurability?.[weaponId] ?? weapon.maxDurability) < weapon.maxDurability
                && <button className="small-action" type="button" onClick={() => repairItem(weaponId)}>Sửa tại bàn</button>}
            </div>
          )
        })()}
      </section>
      <div className="inventory-containers">
        <ContainerPanel
          container={gameState.inventory}
          title="Hành trang"
          kind="bag"
          itemDurability={gameState.itemDurability}
          onTransfer={(itemId, quantity) => transferToStorage(itemId, quantity)}
          onUse={(itemId) => consumeItem(itemId)}
          onDiscard={(itemId, quantity) => discardItems(itemId, quantity)}
          onEquipBackpack={equipBackpack}
          onEquipWeapon={equipWeapon}
          onRepair={repairItem}
        />
        <ContainerPanel
          container={gameState.storage}
          title="Rương gỗ · lấy vật phẩm ra"
          kind="storage"
          itemDurability={gameState.itemDurability}
          onTransfer={(itemId, quantity) => transferToInventory(itemId, quantity)}
        />
      </div>
      <p className="inventory-note">Chọn số lượng rồi bấm “Lấy số lượng” để chuyển đồ từ rương vào túi; “Lấy tất cả” chuyển toàn bộ chồng. Nếu kho đích không đủ chỗ, vật phẩm sẽ ở nguyên vị trí cũ.</p>
    </div>
  )
}
