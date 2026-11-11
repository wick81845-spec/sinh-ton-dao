import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { isAccessoryItem, itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ItemId } from '../../../shared/types/game'
import { characterLevelTitle } from '../../progression/data/progressionDefinitions'
import { BodyStatusPanel } from '../../survival/components/BodyStatusPanel'
import { getCurrentWeather } from '../../world/services/weatherService'

type EquipmentPicker = 'tool' | 'backpack' | 'accessory'

function groupInventoryItems(slots: { itemId: ItemId; quantity: number }[]) {
  const quantities = new Map<ItemId, number>()
  slots.forEach(({ itemId, quantity }) => {
    quantities.set(itemId, (quantities.get(itemId) ?? 0) + quantity)
  })
  return [...quantities].map(([itemId, quantity]) => ({ itemId, quantity }))
}

export function CharacterPage() {
  const {
    gameState,
    isLoading,
    error,
    equipAccessory,
    equipBackpack,
    equipWeapon,
    unequipAccessory,
    unequipBackpack,
    unequipWeapon,
  } = useGame()
  const [openPicker, setOpenPicker] = useState<EquipmentPicker | null>(null)

  if (isLoading) return <p className="page-state">Đang tải hồ sơ nhân vật…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu nhân vật.'}</p>

  const { character } = gameState
  const shelter = gameState.buildings.find((building) => (
    building.definitionId === 'building_shelter'
    && building.status === 'completed'
    && building.islandId === character.currentLocationId
  ))
  const toolItems = groupInventoryItems(gameState.inventory.slots.filter(({ itemId }) => (
    itemId !== 'item_backpack' && itemDefinitions[itemId].category === 'tool'
  )))
  const accessoryItems = groupInventoryItems(gameState.inventory.slots.filter(({ itemId }) => isAccessoryItem(itemId)))
  const equipmentSlots: {
    id: string
    label: string
    itemId?: ItemId
    emptyLabel: string
    picker?: EquipmentPicker
  }[] = [
    { id: 'head', label: 'Đầu', emptyLabel: 'Sắp mở' },
    { id: 'body', label: 'Thân', emptyLabel: 'Sắp mở' },
    {
      id: 'accessory',
      label: 'Phụ kiện',
      itemId: gameState.equippedAccessoryId,
      emptyLabel: 'Chọn đồ ăn / uống',
      picker: 'accessory',
    },
    {
      id: 'tool',
      label: 'Vũ khí / dụng cụ',
      itemId: gameState.equippedWeaponId,
      emptyLabel: 'Chọn dụng cụ',
      picker: 'tool',
    },
    { id: 'hands', label: 'Tay', emptyLabel: 'Sắp mở' },
    { id: 'legs', label: 'Chân', emptyLabel: 'Sắp mở' },
    { id: 'feet', label: 'Giày', emptyLabel: 'Sắp mở' },
    {
      id: 'backpack',
      label: 'Ba lô',
      itemId: gameState.backpackEquipped ? 'item_backpack' : undefined,
      emptyLabel: 'Chọn ba lô',
      picker: 'backpack',
    },
  ]

  const handleEquipTool = (itemId: ItemId) => {
    if (equipWeapon(itemId).ok) setOpenPicker(null)
  }
  const handleEquipAccessory = (itemId: ItemId) => {
    if (equipAccessory(itemId).ok) setOpenPicker(null)
  }
  const handleBackpack = () => {
    const result = gameState.backpackEquipped ? unequipBackpack() : equipBackpack()
    if (result.ok) setOpenPicker(null)
  }

  return (
    <div className="character-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">HỒ SƠ NGƯỜI SỐNG SÓT</span>
          <h1>Nhân vật</h1>
          <p>Trang bị và tình trạng cơ thể của người sống sót.</p>
        </div>
      </div>

      <section className="character-sheet" aria-label="Hồ sơ nhân vật">
        <section className="character-equipment" aria-label="Trang bị nhân vật">
          <div className="character-equipment-heading">
            <div>
              <span className="section-kicker">TRANG BỊ</span>
              <h3>Ô trang bị</h3>
            </div>
            <Link to="/inventory">Mở hành trang <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="character-equipment-grid">
            {equipmentSlots.map((slot) => {
              const item = slot.itemId ? itemDefinitions[slot.itemId] : undefined
              const durability = slot.itemId ? gameState.itemDurability?.[slot.itemId] : undefined
              const isOpen = openPicker === slot.picker
              const content = (
                <>
                  <span className="character-equipment-slot-label">{slot.label}</span>
                  <span className="character-equipment-art">
                    {item
                      ? <img src={item.image} alt="" aria-hidden="true" />
                      : <span aria-hidden="true">{slot.id === 'head' ? '◇' : slot.id === 'body' ? '♧' : '＋'}</span>}
                  </span>
                  <strong>{item?.name ?? slot.emptyLabel}</strong>
                  {item?.maxDurability && (
                    <small>Độ bền {durability ?? item.maxDurability}/{item.maxDurability}</small>
                  )}
                  {slot.picker && <small className="character-equipment-prompt">Bấm để chọn</small>}
                </>
              )
              const className = [
                'character-equipment-slot',
                item ? 'is-equipped' : 'is-empty',
                slot.picker ? 'is-available' : '',
                isOpen ? 'is-open' : '',
              ].filter(Boolean).join(' ')

              return slot.picker ? (
                <button
                  type="button"
                  className={className}
                  key={slot.id}
                  aria-label={`${slot.label}: ${item?.name ?? slot.emptyLabel}`}
                  aria-expanded={isOpen}
                  aria-controls={`equipment-picker-${slot.picker}`}
                  onClick={() => setOpenPicker(isOpen ? null : slot.picker ?? null)}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={className}
                  key={slot.id}
                  aria-label={`${slot.label}: ${item?.name ?? slot.emptyLabel}`}
                >
                  {content}
                </div>
              )
            })}
          </div>
          <p className="character-equipment-note">Vật phẩm phụ kiện đã chọn vẫn nằm trong hành trang.</p>

          {openPicker && (
            <section
              className="equipment-picker"
              id={`equipment-picker-${openPicker}`}
              aria-label={`Chọn ${openPicker === 'tool' ? 'vũ khí hoặc dụng cụ' : openPicker === 'backpack' ? 'ba lô' : 'đồ ăn hoặc thức uống'}`}
            >
              <div className="equipment-picker-heading">
                <h4>{openPicker === 'tool' ? 'Vũ khí / dụng cụ đang có' : openPicker === 'backpack' ? 'Ba lô' : 'Đồ ăn và thức uống'}</h4>
                <button type="button" aria-label="Đóng danh sách trang bị" onClick={() => setOpenPicker(null)}>×</button>
              </div>

              {openPicker === 'tool' && (
                <>
                  {toolItems.length > 0 ? (
                    <div className="equipment-picker-list">
                      {toolItems.map(({ itemId, quantity }) => {
                        const option = itemDefinitions[itemId]
                        return (
                          <button
                            type="button"
                            className="equipment-picker-option"
                            key={itemId}
                            onClick={() => handleEquipTool(itemId)}
                          >
                            <img src={option.image} alt="" aria-hidden="true" />
                            <span><strong>{option.name}</strong><small>Trong túi: {quantity}</small></span>
                          </button>
                        )
                      })}
                    </div>
                  ) : <p className="equipment-picker-empty">Chưa có vũ khí hoặc dụng cụ trong hành trang.</p>}
                  {gameState.equippedWeaponId && (
                    <button type="button" className="equipment-picker-remove" onClick={() => {
                      if (unequipWeapon().ok) setOpenPicker(null)
                    }}>
                      Bỏ {itemDefinitions[gameState.equippedWeaponId].name}
                    </button>
                  )}
                </>
              )}

              {openPicker === 'backpack' && (
                <div className="equipment-picker-list">
                  {gameState.backpackEquipped ? (
                    <button type="button" className="equipment-picker-option" onClick={handleBackpack}>
                      <img src={itemDefinitions.item_backpack.image} alt="" aria-hidden="true" />
                      <span><strong>Tháo ba lô</strong><small>Đưa ba lô về hành trang</small></span>
                    </button>
                  ) : gameState.inventory.slots.some(({ itemId }) => itemId === 'item_backpack') ? (
                    <button type="button" className="equipment-picker-option" onClick={handleBackpack}>
                      <img src={itemDefinitions.item_backpack.image} alt="" aria-hidden="true" />
                      <span><strong>Đeo ba lô</strong><small>Tăng sức chứa hành trang</small></span>
                    </button>
                  ) : <p className="equipment-picker-empty">Chưa có ba lô trong hành trang.</p>}
                </div>
              )}

              {openPicker === 'accessory' && (
                <>
                  {accessoryItems.length > 0 ? (
                    <div className="equipment-picker-list">
                      {accessoryItems.map(({ itemId, quantity }) => {
                        const option = itemDefinitions[itemId]
                        const isSelected = gameState.equippedAccessoryId === itemId
                        return (
                          <button
                            type="button"
                            className={`equipment-picker-option${isSelected ? ' is-selected' : ''}`}
                            key={itemId}
                            aria-pressed={isSelected}
                            onClick={() => handleEquipAccessory(itemId)}
                          >
                            <img src={option.image} alt="" aria-hidden="true" />
                            <span><strong>{option.name}</strong><small>Trong túi: {quantity}{isSelected ? ' · Đã chọn' : ''}</small></span>
                          </button>
                        )
                      })}
                    </div>
                  ) : <p className="equipment-picker-empty">Chưa có đồ ăn, nước uống hoặc vật phẩm hồi phục.</p>}
                  {gameState.equippedAccessoryId && (
                    <button type="button" className="equipment-picker-remove" onClick={() => {
                      if (unequipAccessory().ok) setOpenPicker(null)
                    }}>
                      Bỏ {itemDefinitions[gameState.equippedAccessoryId].name}
                    </button>
                  )}
                </>
              )}
            </section>
          )}
        </section>

        <BodyStatusPanel
          stats={gameState.survival}
          characterName={character.name}
          appearance={character.appearance ?? 'male'}
          weather={getCurrentWeather(gameState)}
          shelterLevel={shelter?.level ?? 0}
          ailments={gameState.ailments}
        />

        <section className="character-dossier" aria-label="Thông tin nhân vật">
          <div className="character-dossier-overview">
            <div className="character-dossier-profile">
              <div className="character-dossier-name">
                <span className="section-kicker">CẤP {String(character.level).padStart(2, '0')} · {characterLevelTitle(character.level)}</span>
                <h2>{character.name}</h2>
                <p className={character.status === 'alive' ? 'is-alive' : 'is-down'}>
                  <span aria-hidden="true">{character.status === 'alive' ? '●' : '◆'}</span>
                  {character.status === 'alive' ? 'Đang sống' : 'Đã ngã xuống'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
