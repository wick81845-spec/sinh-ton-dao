import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { isAccessoryItem, itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ClothingSlot, ItemId } from '../../../shared/types/game'
import { characterLevelTitle } from '../../progression/data/progressionDefinitions'
import { BodyStatusPanel } from '../../survival/components/BodyStatusPanel'
import { getCurrentWeather } from '../../world/services/weatherService'

type EquipmentPicker = 'tool' | 'backpack' | 'accessory' | `clothing-${ClothingSlot}`

const clothingSlotLabels: Record<ClothingSlot, string> = {
  head: 'Đầu',
  body: 'Thân',
  hands: 'Tay',
  legs: 'Chân',
  feet: 'Giày',
}

function getClothingEffectLabel(itemId: ItemId): string {
  const item = itemDefinitions[itemId]
  const effects = [
    item.coldProtection ? `Giữ ấm ${Math.round(item.coldProtection * 100)}%` : '',
    item.rainProtection ? `Chống mưa ${Math.round(item.rainProtection * 100)}%` : '',
    item.damageReduction ? `Giảm sát thương ${Math.round(item.damageReduction * 100)}%` : '',
  ].filter(Boolean)
  return effects.join(' · ')
}

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
    consumeItem,
    equipAccessory,
    equipBackpack,
    equipClothing,
    equipWeapon,
    unequipAccessory,
    unequipBackpack,
    unequipClothing,
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
  const openClothingSlot = (['head', 'body', 'hands', 'legs', 'feet'] as const)
    .find((slot) => openPicker === `clothing-${slot}`)
  const equipmentSlots: {
    id: string
    label: string
    itemId?: ItemId
    emptyLabel: string
    picker?: EquipmentPicker
    clothingSlot?: ClothingSlot
  }[] = [
    {
      id: 'head',
      label: clothingSlotLabels.head,
      itemId: gameState.equippedClothing?.head,
      emptyLabel: 'Chọn mũ',
      picker: 'clothing-head',
      clothingSlot: 'head',
    },
    {
      id: 'body',
      label: clothingSlotLabels.body,
      itemId: gameState.equippedClothing?.body,
      emptyLabel: 'Chọn áo',
      picker: 'clothing-body',
      clothingSlot: 'body',
    },
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
    {
      id: 'hands',
      label: clothingSlotLabels.hands,
      itemId: gameState.equippedClothing?.hands,
      emptyLabel: 'Chọn găng tay',
      picker: 'clothing-hands',
      clothingSlot: 'hands',
    },
    {
      id: 'legs',
      label: clothingSlotLabels.legs,
      itemId: gameState.equippedClothing?.legs,
      emptyLabel: 'Chọn quần',
      picker: 'clothing-legs',
      clothingSlot: 'legs',
    },
    {
      id: 'feet',
      label: clothingSlotLabels.feet,
      itemId: gameState.equippedClothing?.feet,
      emptyLabel: 'Chọn giày',
      picker: 'clothing-feet',
      clothingSlot: 'feet',
    },
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
  const handleEquipClothing = (slot: ClothingSlot, itemId: ItemId) => {
    if (equipClothing(slot, itemId).ok) setOpenPicker(null)
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
                  {slot.clothingSlot && slot.itemId && (
                    <small className="character-equipment-effect">{getClothingEffectLabel(slot.itemId)}</small>
                  )}
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
          <p className="character-equipment-note">Quần áo rời hành trang khi mặc; giữ ấm, chống mưa và giáp được áp dụng tự động. Vật phẩm ở ô phụ kiện vẫn nằm trong túi.</p>

          {openPicker && (
            <section
              className="equipment-picker"
              id={`equipment-picker-${openPicker}`}
              aria-label={`Chọn ${openClothingSlot ? clothingSlotLabels[openClothingSlot].toLocaleLowerCase('vi-VN') : openPicker === 'tool' ? 'vũ khí hoặc dụng cụ' : openPicker === 'backpack' ? 'ba lô' : 'đồ ăn hoặc thức uống'}`}
            >
              <div className="equipment-picker-heading">
                <h4>{openClothingSlot
                  ? `Quần áo ${clothingSlotLabels[openClothingSlot].toLocaleLowerCase('vi-VN')} đang có`
                  : openPicker === 'tool' ? 'Vũ khí / dụng cụ đang có' : openPicker === 'backpack' ? 'Ba lô' : 'Đồ ăn và thức uống'}</h4>
                <button type="button" aria-label="Đóng danh sách trang bị" onClick={() => setOpenPicker(null)}>×</button>
              </div>

              {openClothingSlot && (() => {
                const clothingItems = groupInventoryItems(gameState.inventory.slots.filter(
                  ({ itemId }) => itemDefinitions[itemId].clothingSlot === openClothingSlot,
                ))
                const equippedItemId = gameState.equippedClothing?.[openClothingSlot]
                return (
                  <>
                    {clothingItems.length > 0 ? (
                      <div className="equipment-picker-list">
                        {clothingItems.map(({ itemId, quantity }) => {
                          const option = itemDefinitions[itemId]
                          const isSelected = equippedItemId === itemId
                          return (
                            <button
                              type="button"
                              className={`equipment-picker-option${isSelected ? ' is-selected' : ''}`}
                              key={itemId}
                              aria-pressed={isSelected}
                              onClick={() => handleEquipClothing(openClothingSlot, itemId)}
                            >
                              <img src={option.image} alt="" aria-hidden="true" />
                              <span>
                                <strong>{option.name}</strong>
                                <small>{getClothingEffectLabel(itemId)}{isSelected ? ' · Đang mặc' : ` · Trong túi: ${quantity}`}</small>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    ) : <p className="equipment-picker-empty">Chưa có quần áo phù hợp trong hành trang. Hãy chế tạo tại bàn dệt hoặc bàn chế tạo.</p>}
                    {equippedItemId && (
                      <button
                        type="button"
                        className="equipment-picker-remove"
                        onClick={() => {
                          if (unequipClothing(openClothingSlot).ok) setOpenPicker(null)
                        }}
                      >
                        Tháo {itemDefinitions[equippedItemId].name}
                      </button>
                    )}
                  </>
                )
              })()}

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
                    <div className="equipment-picker-actions">
                      <button
                        type="button"
                        className="small-action"
                        onClick={() => {
                          if (gameState.equippedAccessoryId) {
                            consumeItem(gameState.equippedAccessoryId)
                          }
                        }}
                      >
                        Dùng {itemDefinitions[gameState.equippedAccessoryId].name}
                      </button>
                      <button
                        type="button"
                        className="equipment-picker-remove"
                        onClick={() => {
                          if (unequipAccessory().ok) setOpenPicker(null)
                        }}
                      >
                        Bỏ khỏi ô
                      </button>
                    </div>
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
