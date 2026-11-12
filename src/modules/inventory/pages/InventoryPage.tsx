import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { fishCatalog } from '../../../data/items/fishCatalog'
import type { ItemContainer, ItemId } from '../../../shared/types/game'
import { carriedWeightPerSlotKg, getCarriedWeight } from '../services/inventoryService'
import { SurvivalMeter, type SurvivalStatName } from '../../survival/components/SurvivalMeter'
import { BodyExposureMeters } from '../../survival/components/BodyExposureMeters'
import { getSurvivalMeterStatus } from '../../survival/utils/survivalStates'
import type { MessageBottle, MessageBottleReportReason } from '../../social/services/messageBottleService'
import type { SalvageContainerItemId } from '../services/salvageService'

const survivalStats: SurvivalStatName[] = ['hunger', 'thirst', 'stamina', 'health']
const reportReasons: { value: MessageBottleReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'personal_info', label: 'Thông tin cá nhân' },
  { value: 'scam', label: 'Lừa đảo' },
  { value: 'other', label: 'Lý do khác' },
]

function getBottleErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể hoàn tất thao tác chai thông điệp.'
}

function getStatStatus(stat: SurvivalStatName, value: number): string {
  return getSurvivalMeterStatus(stat, value)
}

function ContainerPanel({
  container,
  title,
  kind,
  itemDurability,
  onTransfer,
  onUse,
  onOpenSalvageContainer,
  onBottleAction,
  onDiscard,
  onFilletFish,
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
  onOpenSalvageContainer?(itemId: SalvageContainerItemId): void
  onBottleAction?(itemId: 'item_glass_bottle' | 'item_message_bottle'): void
  onDiscard?(itemId: ItemId, quantity: number): void
  onFilletFish?(itemId: ItemId): void
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
            <strong>{totalWeight.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} / {weightLimit.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</strong>
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
              <small className="inventory-slot-meta">{(item.weight * slot.quantity).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</small>
              {item.maxDurability && (
                <small className="inventory-slot-meta">Độ bền {itemDurability?.[slot.itemId] ?? item.maxDurability}/{item.maxDurability}</small>
              )}
              {slot.expiresAt !== undefined && (
                <small className="inventory-slot-meta">
                  Hạn dùng {new Date(slot.expiresAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </small>
              )}
              <div className="inventory-slot-actions">
                {kind === 'bag' && onOpenSalvageContainer
                  && (slot.itemId === 'item_sunken_crate' || slot.itemId === 'item_metal_box' || slot.itemId === 'item_small_chest') && (
                    <button
                      className="inventory-slot-primary"
                      type="button"
                      aria-label={`Mở ${item.name}`}
                      onClick={() => onOpenSalvageContainer(slot.itemId as SalvageContainerItemId)}
                    >
                      Mở
                    </button>
                )}
                {kind === 'bag' && onBottleAction
                  && (slot.itemId === 'item_glass_bottle' || slot.itemId === 'item_message_bottle') && (
                    <button
                      className="inventory-slot-primary"
                      type="button"
                      aria-label={`${slot.itemId === 'item_glass_bottle' ? 'Viết thông điệp bằng' : 'Đọc'} ${item.name}`}
                      onClick={() => onBottleAction(slot.itemId as 'item_glass_bottle' | 'item_message_bottle')}
                    >
                      {slot.itemId === 'item_glass_bottle' ? 'Viết tin' : 'Đọc tin'}
                    </button>
                )}
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
                    {kind === 'bag' && item.category === 'tool' && slot.itemId !== 'item_backpack' && onEquipWeapon && (
                      <button className="small-action" type="button" onClick={() => onEquipWeapon(slot.itemId)}>Đưa vào ô vũ khí / dụng cụ</button>
                    )}
                    {kind === 'bag' && item.maxDurability && onRepair
                      && (itemDurability?.[slot.itemId] ?? item.maxDurability) < item.maxDurability && (
                        <button className="small-action" type="button" onClick={() => onRepair(slot.itemId)}>Sửa tại bàn</button>
                      )}
                    {kind === 'bag' && onDiscard && (
                      <button className="small-action" type="button" onClick={() => onDiscard(slot.itemId, slot.quantity)}>Vứt tất cả</button>
                    )}
                    {kind === 'bag' && (slot.itemId === 'item_fresh_fish' || fishCatalog.some((f) => f.itemId === slot.itemId)) && onFilletFish && (
                      <button className="small-action" type="button" onClick={() => onFilletFish(slot.itemId)}>
                        🔪 Xẻ thịt / Phi lê cá
                      </button>
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
        <span>Khối lượng {totalWeight.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</span>
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
    filletFish,
    discardItems,
    equipBackpack,
    unequipBackpack,
    equipWeapon,
    unequipWeapon,
    repairItem,
    openSalvageContainer,
    sendMessageBottle,
    readMessageBottle,
    reportMessageBottle,
  } = useGame()
  const [bottleDialogMode, setBottleDialogMode] = useState<'send' | 'read' | null>(null)
  const [bottleMessage, setBottleMessage] = useState('')
  const [activeBottle, setActiveBottle] = useState<MessageBottle | null>(null)
  const [bottleError, setBottleError] = useState<string | null>(null)
  const [bottleReportMessage, setBottleReportMessage] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState<MessageBottleReportReason>('inappropriate')
  const [isBottleBusy, setIsBottleBusy] = useState(false)

  if (isLoading) return <p className="page-state">Đang tải túi đồ…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu túi đồ.'}</p>

  const { inventory, storage, survival } = gameState

  async function handleBottleAction(itemId: 'item_glass_bottle' | 'item_message_bottle') {
    setBottleDialogMode(itemId === 'item_glass_bottle' ? 'send' : 'read')
    setBottleMessage('')
    setActiveBottle(null)
    setBottleError(null)
    setBottleReportMessage(null)
    if (itemId !== 'item_message_bottle') return

    setIsBottleBusy(true)
    try {
      const result = await readMessageBottle()
      if (!result.ok) {
        setBottleError(result.message)
        return
      }
      setActiveBottle(result.bottle)
    } catch (readError: unknown) {
      setBottleError(getBottleErrorMessage(readError))
    } finally {
      setIsBottleBusy(false)
    }
  }

  async function handleSendBottle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isBottleBusy) return
    setIsBottleBusy(true)
    setBottleError(null)
    try {
      const result = await sendMessageBottle(bottleMessage)
      if (!result.ok) {
        setBottleError(result.message)
        return
      }
      setBottleDialogMode(null)
      setBottleMessage('')
    } catch (sendError: unknown) {
      setBottleError(getBottleErrorMessage(sendError))
    } finally {
      setIsBottleBusy(false)
    }
  }

  async function handleReportBottle() {
    if (!activeBottle || isBottleBusy || bottleReportMessage) return
    setIsBottleBusy(true)
    setBottleError(null)
    try {
      const result = await reportMessageBottle(activeBottle.message_id, reportReason)
      if (!result.ok) {
        setBottleError(result.message)
        return
      }
      setBottleReportMessage(result.message)
    } catch (reportError: unknown) {
      setBottleError(getBottleErrorMessage(reportError))
    } finally {
      setIsBottleBusy(false)
    }
  }

  const isAtHome = gameState.character.currentLocationId === gameState.character.homeIslandId
  const hasStorageOnCurrentIsland = isAtHome || gameState.buildings.some(
    (b) => b.definitionId === 'building_storage' && b.islandId === gameState.character.currentLocationId && b.status === 'completed',
  )

  return (
    <div className="inventory-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">VẬT PHẨM · LƯU TRỮ</span>
          <h1>Túi đồ &amp; kho chứa</h1>
          <p>
            {hasStorageOnCurrentIsland
              ? (isAtHome ? 'Bạn đang ở đảo nhà · rương đồ kết nối đầy đủ.' : 'Đảo này có Rương chứa đồ · bạn có thể cất và lấy đồ tự do.')
              : 'Đảo này chưa có rương. Hãy xây Rương chứa đồ (building_storage) trong Xưởng chế tác để cất đồ tại đây!'}
          </p>
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
      <section className="container-panel equipped-weapon-panel" aria-label="Vũ khí hoặc dụng cụ đang trang bị">
        <div className="container-heading">
          <div>
            <span className="section-kicker">Ô TRANG BỊ</span>
            <h2>Vũ khí / dụng cụ</h2>
          </div>
          {gameState.equippedWeaponId
            ? <button className="small-action" type="button" onClick={unequipWeapon}>Cất vào túi</button>
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
                <small>
                  {weapon.maxDurability
                    ? `Độ bền ${gameState.itemDurability?.[weaponId] ?? weapon.maxDurability}/${weapon.maxDurability}`
                    : 'Không có độ bền'}
                  {' · '}
                  {weapon.weaponDamageBonus === undefined
                    ? 'Dùng làm dụng cụ · không tăng sát thương chiến đấu'
                    : `+${weapon.weaponDamageBonus} sát thương chiến đấu`}
                </small>
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
          onFilletFish={(itemId) => filletFish(itemId)}
          onOpenSalvageContainer={openSalvageContainer}
          onBottleAction={(itemId) => void handleBottleAction(itemId)}
          onDiscard={(itemId, quantity) => discardItems(itemId, quantity)}
          onEquipBackpack={equipBackpack}
          onEquipWeapon={equipWeapon}
          onRepair={repairItem}
        />
        <ContainerPanel
          container={storage}
          title={hasStorageOnCurrentIsland ? (isAtHome ? 'Rương gỗ · Đảo nhà' : 'Rương gỗ · Đảo hiện tại') : 'Rương gỗ (Chưa có rương trên đảo)'}
          kind="storage"
          itemDurability={gameState.itemDurability}
          onTransfer={(itemId, quantity) => transferToInventory(itemId, quantity)}
        />
      </div>
      <p className="inventory-note">Chọn số lượng rồi bấm “Lấy số lượng” để chuyển đồ từ rương vào túi; “Lấy tất cả” chuyển toàn bộ chồng. Nếu kho đích không đủ chỗ, vật phẩm sẽ ở nguyên vị trí cũ.</p>
      {bottleDialogMode && (
        <div className="message-bottle-backdrop">
          <section className="message-bottle-dialog" role="dialog" aria-modal="true" aria-labelledby="message-bottle-title">
            <header>
              <div>
                <span className="section-kicker">THÔNG ĐIỆP TRÔI DẠT</span>
                <h2 id="message-bottle-title">{bottleDialogMode === 'send' ? 'Viết lời nhắn' : 'Mở chai thông điệp'}</h2>
              </div>
              <button type="button" className="message-bottle-close" aria-label="Đóng" onClick={() => setBottleDialogMode(null)}>×</button>
            </header>
            {bottleDialogMode === 'send' ? (
              <form onSubmit={(event) => void handleSendBottle(event)}>
                <label htmlFor="message-bottle-text">Thông điệp (tối đa 280 ký tự)</label>
                <textarea
                  id="message-bottle-text"
                  rows={5}
                  maxLength={280}
                  value={bottleMessage}
                  onChange={(event) => setBottleMessage(event.currentTarget.value)}
                  disabled={isBottleBusy}
                  required
                />
                <p className="message-bottle-guidance">Mỗi ngày gửi được một lần. Không gửi liên kết, số điện thoại, thông tin cá nhân hoặc nội dung xấu.</p>
                <div className="message-bottle-dialog-actions">
                  <span>{bottleMessage.length}/280</span>
                  <button type="submit" className="small-action" disabled={isBottleBusy || !bottleMessage.trim()}>
                    {isBottleBusy ? 'Đang gửi…' : 'Thả chai'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {isBottleBusy && <p role="status">Đang tìm thông điệp trôi đến đảo…</p>}
                {activeBottle && (
                  <article className="message-bottle-reading">
                    <p className="message-bottle-sender">Người gửi: <strong>{activeBottle.sender_display_name}</strong> · Đảo {activeBottle.sender_island_id}</p>
                    <blockquote>{activeBottle.message}</blockquote>
                    <time dateTime={activeBottle.created_at}>
                      Gửi lúc {new Date(activeBottle.created_at).toLocaleString('vi-VN')}
                    </time>
                    <p className="message-bottle-guidance">Thông điệp này có thể được đọc bởi nhiều người chơi ở các đảo khác nhau.</p>
                    {bottleReportMessage ? (
                      <p role="status">{bottleReportMessage}</p>
                    ) : (
                      <div className="message-bottle-report">
                        <label htmlFor="message-bottle-report-reason">Báo cáo thông điệp</label>
                        <select
                          id="message-bottle-report-reason"
                          value={reportReason}
                          onChange={(event) => setReportReason(event.currentTarget.value as MessageBottleReportReason)}
                          disabled={isBottleBusy}
                        >
                          {reportReasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                        </select>
                        <button type="button" className="small-action" onClick={() => void handleReportBottle()} disabled={isBottleBusy}>
                          Báo cáo
                        </button>
                      </div>
                    )}
                  </article>
                )}
              </>
            )}
            {bottleError && <p className="message-bottle-error" role="alert">{bottleError}</p>}
          </section>
        </div>
      )}
    </div>
  )
}
