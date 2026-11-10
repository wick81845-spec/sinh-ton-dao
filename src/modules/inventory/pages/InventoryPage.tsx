import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ItemContainer, ItemId } from '../../../shared/types/game'
import { carriedWeightPerSlotKg, getCarriedWeight } from '../services/inventoryService'
import { survivalConfig } from '../../survival/data/survivalConfig'
import { SurvivalMeter, type SurvivalStatName } from '../../survival/components/SurvivalMeter'
import { BodyExposureMeters } from '../../survival/components/BodyExposureMeters'

const survivalStats: SurvivalStatName[] = ['hunger', 'thirst', 'stamina', 'health']

function getStatStatus(stat: SurvivalStatName, value: number): string {
  if (stat === 'hunger') {
    if (value === 0) return 'Đói lả'
    if (value <= survivalConfig.criticalNeedThreshold) return 'Suy dinh dưỡng'
    if (value < survivalConfig.needWarningThreshold) return 'Đói'
  }
  if (stat === 'thirst') {
    if (value === 0) return 'Mất nước'
    if (value <= survivalConfig.criticalNeedThreshold) return 'Mất nước'
    if (value < survivalConfig.needWarningThreshold) return 'Khát'
  }
  if (stat === 'stamina') {
    if (value <= 10) return 'Kiệt sức'
    if (value <= 40) return 'Mệt mỏi'
  }
  if (stat === 'health' && value <= 25) return 'Nguy cấp'
  return 'Ổn định'
}

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
  const capacity = Math.max(1, container.maxSlots)
  const totalWeight = getCarriedWeight(container)
  const weightLimit = capacity * carriedWeightPerSlotKg
  const weightRatio = totalWeight / weightLimit
  const isOverloaded = kind === 'bag' && weightRatio >= 1
  const isEncumbered = kind === 'bag' && weightRatio >= 0.75
  const slots = Array.from({ length: container.maxSlots }, (_, index) => container.slots[index])

  return (
    <section className={`container-panel inventory-container-panel${kind === 'storage' ? ' storage-container-panel' : ' backpack-container-panel'}`}>
      <div className="container-heading">
        <div>
          <span className="section-kicker">{kind === 'bag' ? 'VẬT PHẨM ĐANG MANG' : 'RƯƠNG TRÊN ĐẢO'}</span>
          <h2>{title}</h2>
        </div>
        <span className="container-slots">{occupiedSlots} / {container.maxSlots} ô</span>
      </div>
      <div className="container-capacity-copy">
        <span>{kind === 'bag' ? 'Sức chứa hành trang' : 'Dung lượng rương'}</span>
        <strong>{occupiedSlots} / {container.maxSlots}</strong>
      </div>
      <div className="container-capacity inventory-capacity-bar">
        <span><i style={{ width: `${Math.min(100, occupiedSlots / capacity * 100)}%` }} /></span>
      </div>
      {kind === 'bag' && (
        <>
          <div className="container-capacity-copy inventory-weight-copy">
            <span>Tải trọng</span>
            <strong>{totalWeight.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} / {weightLimit.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg</strong>
            <em className={isOverloaded ? 'is-overloaded' : isEncumbered ? 'is-encumbered' : ''}>
              {isOverloaded ? 'Quá tải · không thể làm việc' : isEncumbered ? 'Nặng người' : 'Ổn định'}
            </em>
          </div>
          <div
            className={`container-capacity inventory-weight-bar${isOverloaded ? ' is-overloaded' : isEncumbered ? ' is-encumbered' : ''}`}
            role="progressbar"
            aria-label="Khối lượng hành trang"
            aria-valuemin={0}
            aria-valuemax={weightLimit}
            aria-valuenow={Math.min(totalWeight, weightLimit)}
          >
            <span><i style={{ width: `${Math.min(100, weightRatio * 100)}%` }} /></span>
          </div>
        </>
      )}
      <div className={`inventory-slot-grid${kind === 'storage' ? ' inventory-storage-grid' : ''}`} aria-label={title}>
        {slots.map((slot, index) => {
          if (!slot) {
            return (
              <div className="inventory-slot inventory-slot-empty" key={`empty-${index}`} aria-label={`Ô trống ${index + 1}`}>
                <span className="inventory-slot-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="inventory-empty-mark" aria-hidden="true">＋</span>
                <span className="inventory-empty-label">Ô trống</span>
              </div>
            )
          }

          const item = itemDefinitions[slot.itemId]
          const transferAmount = Math.min(slot.quantity, transferAmounts[slot.itemId] ?? 1)
          return (
            <article
              className={`inventory-slot${kind === 'storage' ? ' inventory-storage-slot' : ''}`}
              key={`${slot.itemId}-${slot.expiresAt ?? 'stable'}-${index}`}
            >
              <span className="inventory-slot-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="inventory-slot-count">×{slot.quantity}</span>
              {kind === 'bag' && onDiscard && (
                <button
                  className="inventory-slot-discard"
                  type="button"
                  aria-label={`Vứt ${item.name}`}
                  title={`Vứt tất cả ${item.name}`}
                  onClick={() => onDiscard(slot.itemId, slot.quantity)}
                >
                  <span aria-hidden="true">🗑</span>
                </button>
              )}
              <div className="inventory-slot-art">
                <img className={`resource-icon ${item.tone}`} src={item.image} alt="" aria-hidden="true" />
              </div>
              <strong className="inventory-slot-name">{item.name}</strong>
              <small className="inventory-slot-meta">{(item.weight * slot.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} kg</small>
              {item.maxDurability && (
                <small className="inventory-slot-meta">Độ bền {itemDurability?.[slot.itemId] ?? item.maxDurability}/{item.maxDurability}</small>
              )}
              {slot.expiresAt !== undefined && (
                <small className="inventory-slot-meta">
                  Hạn dùng {new Date(slot.expiresAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </small>
              )}
              <div className="inventory-slot-actions">
                {kind === 'bag' && item.usable && onUse && (
                  <button
                    className="inventory-slot-primary"
                    type="button"
                    aria-label={`Dùng ${item.name}`}
                    title={`Dùng 1 ${item.name}`}
                    onClick={() => onUse(slot.itemId)}
                  >
                    Dùng
                  </button>
                )}
                <button
                  className={kind === 'bag' && item.usable && onUse ? 'inventory-slot-secondary' : 'inventory-slot-primary'}
                  type="button"
                  aria-label={`${kind === 'bag' ? 'Cất tất cả' : 'Lấy tất cả'} ${item.name}`}
                  title={`${kind === 'bag' ? 'Cất tất cả' : 'Lấy tất cả'} ${item.name}`}
                  onClick={() => onTransfer(slot.itemId, slot.quantity)}
                >
                  {kind === 'bag' ? 'Cất' : 'Lấy'}
                </button>
                <details className="inventory-slot-more">
                  <summary aria-label="Thao tác khác" title="Thao tác khác">Khác</summary>
                  <div className="inventory-slot-more-panel">
                    {kind === 'bag' && slot.itemId === 'item_backpack' && onEquipBackpack && (
                      <button className="small-action" type="button" onClick={onEquipBackpack}>Trang bị ba lô</button>
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
                    {slot.quantity > 1 && (
                      <div className="inventory-slot-transfer">
                        <label>
                          <span>{kind === 'bag' ? 'Số lượng cất' : 'Số lượng lấy'}</span>
                          <input
                            aria-label={`${kind === 'bag' ? 'Số lượng cất' : 'Số lượng lấy'} ${item.name}`}
                            type="number"
                            min={1}
                            max={slot.quantity}
                            value={transferAmount}
                            onChange={(event) => {
                              const amount = Number(event.target.value)
                              setTransferAmounts((current) => ({
                                ...current,
                                [slot.itemId]: Number.isFinite(amount) ? Math.max(1, Math.min(slot.quantity, amount)) : 1,
                              }))
                            }}
                          />
                        </label>
                        <button
                          className="small-action"
                          type="button"
                          onClick={() => onTransfer(slot.itemId, transferAmount)}
                        >
                          {kind === 'bag' ? 'Cất số này' : 'Lấy số này'}
                        </button>
                      </div>
                    )}
                  </div>
                </details>
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

  const { inventory, storage, survival } = gameState

  return (
    <div className="inventory-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">VẬT PHẨM · LƯU TRỮ</span>
          <h1>Túi đồ &amp; kho chứa</h1>
          <p>Hành trang cơ bản có 12 ô. Trang bị ba lô để mở rộng lên 24 ô.</p>
        </div>
        <div className={`inventory-pack-status${gameState.backpackEquipped ? ' is-equipped' : ''}`}>
          <span className="inventory-pack-illustration" aria-hidden="true">🎒</span>
          <span>
            <strong>{gameState.backpackEquipped ? 'Ba lô đã trang bị' : 'Hành trang cơ bản'}</strong>
            <small>{inventory.maxSlots} ô chứa · {Math.max(0, inventory.maxSlots - inventory.slots.length)} ô còn trống</small>
          </span>
          {gameState.backpackEquipped && <button className="small-action" type="button" onClick={unequipBackpack}>Tháo ba lô</button>}
        </div>
      </div>
      <section className="inventory-survival-panel" aria-label="Thanh trạng thái sinh tồn">
        <div className="inventory-survival-heading">
          <div>
            <span className="section-kicker">TÌNH TRẠNG HIỆN TẠI</span>
            <h2>Chỉ số sinh tồn</h2>
          </div>
          <Link className="text-link" to="/survival">Xem chi tiết <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="inventory-survival-grid">
          {survivalStats.map((stat) => (
            <SurvivalMeter
              key={stat}
              stat={stat}
              value={survival[stat]}
              status={getStatStatus(stat, survival[stat])}
            />
          ))}
        </div>
        <BodyExposureMeters stats={survival} />
      </section>
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
          container={inventory}
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
          container={storage}
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
