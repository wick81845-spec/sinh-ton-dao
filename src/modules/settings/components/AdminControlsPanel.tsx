import { useEffect, useState } from 'react'
import {
  loadAdminPlayers,
  loadAdminPlayerSurvival,
  loadRemoteWorldSettings,
  queueAdminSurvivalCommand,
  updateGlobalWeather,
} from '../../../services/persistence/remoteAdminControlClient'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type {
  AdminPlayerSummary,
  AdminPlayerSurvivalSummary,
  AdminSurvivalCommand,
} from '../../../shared/types/admin'
import type { ItemId, SurvivalAilmentId } from '../../../shared/types/game'
import { islandDefinitions, getIslandDefinition } from '../../world/data/worldDefinitions'
import { weatherDefinitions } from '../../world/data/weatherDefinitions'

const survivalFields = [
  { key: 'health', label: 'Sức khỏe', min: 0, max: 100, step: 1 },
  { key: 'hunger', label: 'Đói bụng', min: 0, max: 100, step: 1 },
  { key: 'thirst', label: 'Nước', min: 0, max: 100, step: 1 },
  { key: 'stamina', label: 'Sức lực', min: 0, max: 100, step: 1 },
  { key: 'bodyTemperature', label: 'Thân nhiệt (°C)', min: 32, max: 42, step: 0.1 },
  { key: 'wetness', label: 'Độ ướt (%)', min: 0, max: 100, step: 1 },
] as const

type SurvivalField = typeof survivalFields[number]['key']
type SurvivalFieldValues = Record<SurvivalField, string>
type PlayerSurvivalResult = {
  playerId: string
  summary: AdminPlayerSurvivalSummary | null
  failed: boolean
}

const ailmentOptions: { id: SurvivalAilmentId; label: string }[] = [
  { id: 'bleeding', label: 'Chảy máu' },
  { id: 'infection', label: 'Nhiễm trùng' },
  { id: 'heatstroke', label: 'Say nắng' },
  { id: 'hypothermia', label: 'Hạ thân nhiệt' },
  { id: 'poisoning', label: 'Ngộ độc' },
  { id: 'sunburn', label: 'Cháy nắng' },
  { id: 'sprain', label: 'Bong gân' },
  { id: 'fracture', label: 'Gãy xương' },
  { id: 'blisters', label: 'Phồng rộp' },
  { id: 'insectBites', label: 'Côn trùng cắn' },
  { id: 'tropicalFever', label: 'Sốt nhiệt đới' },
  { id: 'diarrhea', label: 'Tiêu chảy' },
  { id: 'allergy', label: 'Dị ứng' },
  { id: 'smoke', label: 'Hít phải khói' },
  { id: 'marineSting', label: 'Sinh vật biển đốt' },
  { id: 'dehydration', label: 'Mất nước' },
  { id: 'burns', label: 'Bỏng' },
  { id: 'frostbite', label: 'Tê cóng' },
  { id: 'animalBite', label: 'Động vật cắn' },
  { id: 'exhaustion', label: 'Kiệt sức' },
]

const weatherGroups = [...new Set(weatherDefinitions.map((weather) => weather.group))]
const itemOptions = (Object.keys(itemDefinitions) as ItemId[])
  .map((id) => ({ id, name: itemDefinitions[id].name }))
  .sort((first, second) => first.name.localeCompare(second.name, 'vi'))

const emptyValues: SurvivalFieldValues = {
  health: '',
  hunger: '',
  thirst: '',
  stamina: '',
  bodyTemperature: '',
  wetness: '',
}

export function AdminControlsPanel({ accessToken }: { accessToken: string }) {
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([])
  const [playerId, setPlayerId] = useState('')
  const [playerSurvivalResult, setPlayerSurvivalResult] = useState<PlayerSurvivalResult | null>(null)
  const [itemId, setItemId] = useState<ItemId>('item_wood')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemAction, setItemAction] = useState<'give' | 'take'>('give')
  const [itemContainer, setItemContainer] = useState<'inventory' | 'storage'>('inventory')
  const [destinationIslandId, setDestinationIslandId] = useState('')
  const [weatherId, setWeatherId] = useState('')
  const [values, setValues] = useState<SurvivalFieldValues>(emptyValues)
  const [replaceAilments, setReplaceAilments] = useState(false)
  const [ailments, setAilments] = useState<SurvivalAilmentId[]>([])
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('moderate')
  const [loading, setLoading] = useState(true)
  const [savingWeather, setSavingWeather] = useState(false)
  const [savingSurvival, setSavingSurvival] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const playerSurvival = playerSurvivalResult?.playerId === playerId
    ? playerSurvivalResult.summary
    : null
  const loadingPlayerSurvival = Boolean(playerId && playerSurvivalResult?.playerId !== playerId)

  useEffect(() => {
    let active = true
    void Promise.all([
      loadAdminPlayers(accessToken),
      loadRemoteWorldSettings(accessToken),
    ]).then(([playerList, settings]) => {
      if (!active) return
      setPlayers(playerList)
      setPlayerId(playerList[0]?.id ?? '')
      setWeatherId(settings.weatherId ?? '')
    }).catch((loadError: unknown) => {
      if (!active) return
      console.error('Không thể tải công cụ quản trị.', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải công cụ quản trị.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [accessToken])

  useEffect(() => {
    if (!playerId) return
    let active = true
    void loadAdminPlayerSurvival(accessToken, playerId).then((summary) => {
      if (active) setPlayerSurvivalResult({ playerId, summary, failed: false })
    }).catch((loadError: unknown) => {
      if (!active) return
      console.error('Không thể tải chỉ số người chơi.', loadError)
      setPlayerSurvivalResult({ playerId, summary: null, failed: true })
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải chỉ số người chơi.')
    })
    return () => { active = false }
  }, [accessToken, playerId])

  async function saveWeather(): Promise<void> {
    setSavingWeather(true)
    setError(null)
    setNotice(null)
    try {
      const settings = await updateGlobalWeather(accessToken, weatherId || null)
      setWeatherId(settings.weatherId ?? '')
      setNotice(settings.weatherId
        ? `Đã áp dụng ${weatherDefinitions.find((weather) => weather.id === settings.weatherId)?.name ?? 'thời tiết đã chọn'} cho toàn bộ save.`
        : 'Đã tắt thời tiết cưỡng chế; các save trở về chu kỳ thời tiết tự nhiên.')
    } catch (saveError: unknown) {
      console.error('Không thể cập nhật thời tiết toàn cục.', saveError)
      setError(saveError instanceof Error ? saveError.message : 'Không thể cập nhật thời tiết toàn cục.')
    } finally {
      setSavingWeather(false)
    }
  }

  async function applySurvivalCommand(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const command: AdminSurvivalCommand = {}
      for (const field of survivalFields) {
        const rawValue = values[field.key].trim()
        if (!rawValue) continue
        const value = Number(rawValue)
        if (!Number.isFinite(value) || value < field.min || value > field.max) {
          throw new Error(`${field.label} phải nằm trong khoảng ${field.min}–${field.max}.`)
        }
        command[field.key] = value
      }
      if (replaceAilments) {
        command.ailments = ailments.map((id) => ({ id, elapsedMs: 0, severity }))
      }
      if (Object.keys(command).length === 0) {
        throw new Error('Hãy nhập ít nhất một chỉ số hoặc chọn thay danh sách trạng thái.')
      }
      const target = players.find((player) => player.id === playerId)
      if (!target) throw new Error('Hãy chọn người chơi cần cập nhật.')
      await queueAdminSurvivalCommand(accessToken, playerId, command)
      setValues(emptyValues)
      setReplaceAilments(false)
      setAilments([])
      setNotice(`Đã xếp cập nhật cho ${target.displayName}. Lệnh sẽ áp dụng khi người chơi kết nối, tối đa sau 15 giây.`)
    } catch (saveError: unknown) {
      console.error('Không thể xếp lệnh sinh tồn.', saveError)
      setError(saveError instanceof Error ? saveError.message : 'Không thể xếp lệnh sinh tồn.')
    } finally {
      setSavingSurvival(false)
    }
  }

  async function revivePlayer(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const target = players.find((player) => player.id === playerId)
      if (!target || playerSurvival?.status !== 'dead') {
        throw new Error('Chỉ có thể hồi sinh người chơi đang ở trạng thái đã chết.')
      }
      await queueAdminSurvivalCommand(accessToken, playerId, { revive: true })
      setNotice(`Đã xếp lệnh hồi sinh cho ${target.displayName}. Nhân vật sẽ hồi sinh tại đảo nhà khi nhận lệnh quản trị.`)
    } catch (reviveError: unknown) {
      console.error('Không thể xếp lệnh hồi sinh.', reviveError)
      setError(reviveError instanceof Error ? reviveError.message : 'Không thể xếp lệnh hồi sinh.')
    } finally {
      setSavingSurvival(false)
    }
  }

  async function clearPlayerAilments(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const target = players.find((player) => player.id === playerId)
      if (!target || !playerSurvival || playerSurvival.ailments.length === 0) {
        throw new Error('Người chơi đã chọn không có bệnh hoặc chấn thương cần xóa.')
      }
      await queueAdminSurvivalCommand(accessToken, playerId, { ailments: [] })
      setNotice(`Đã xếp lệnh xóa toàn bộ hiệu ứng xấu cho ${target.displayName}. Lệnh sẽ áp dụng khi người chơi kết nối, tối đa sau 15 giây.`)
    } catch (clearError: unknown) {
      console.error('Không thể xếp lệnh xóa hiệu ứng xấu.', clearError)
      setError(clearError instanceof Error ? clearError.message : 'Không thể xếp lệnh xóa hiệu ứng xấu.')
    } finally {
      setSavingSurvival(false)
    }
  }

  async function transferPlayerItem(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const target = players.find((player) => player.id === playerId)
      const quantity = Number(itemQuantity)
      if (!target || !playerSurvival) throw new Error('Hãy chọn người chơi đã có save.')
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
        throw new Error('Số lượng vật phẩm phải là số nguyên từ 1 đến 9.999.')
      }
      if (itemAction === 'take') {
        const available = playerSurvival[itemContainer]
          .filter((slot) => slot.itemId === itemId)
          .reduce((total, slot) => total + slot.quantity, 0)
        if (available < quantity) throw new Error(`Người chơi hiện chỉ có ${available} ${itemDefinitions[itemId].name}.`)
      }
      await queueAdminSurvivalCommand(accessToken, playerId, {
        itemTransfers: [{ action: itemAction, container: itemContainer, itemId, quantity }],
      })
      setNotice(`Đã xếp lệnh ${itemAction === 'give' ? 'trao' : 'thu hồi'} ${quantity} ${itemDefinitions[itemId].name} ${itemAction === 'give' ? 'cho' : 'từ'} ${target.displayName}.`)
    } catch (transferError: unknown) {
      console.error('Không thể xếp lệnh điều chỉnh vật phẩm.', transferError)
      setError(transferError instanceof Error ? transferError.message : 'Không thể xếp lệnh điều chỉnh vật phẩm.')
    } finally {
      setSavingSurvival(false)
    }
  }

  async function teleportPlayer(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const target = players.find((player) => player.id === playerId)
      const destination = islandDefinitions.find((island) => island.id === destinationIslandId)
      if (!target || !playerSurvival || !destination) throw new Error('Hãy chọn người chơi và hòn đảo đích hợp lệ.')
      if (destination.id === playerSurvival.currentLocationId) throw new Error('Người chơi hiện đã ở hòn đảo này.')
      await queueAdminSurvivalCommand(accessToken, playerId, { teleportToIslandId: destination.id })
      setNotice(`Đã xếp lệnh chuyển ${target.displayName} đến ${destination.name}.`)
    } catch (teleportError: unknown) {
      console.error('Không thể xếp lệnh dịch chuyển.', teleportError)
      setError(teleportError instanceof Error ? teleportError.message : 'Không thể xếp lệnh dịch chuyển.')
    } finally {
      setSavingSurvival(false)
    }
  }

  async function restorePlayer(): Promise<void> {
    setSavingSurvival(true)
    setError(null)
    setNotice(null)
    try {
      const target = players.find((player) => player.id === playerId)
      if (!target || !playerSurvival) throw new Error('Hãy chọn người chơi đã có save.')
      await queueAdminSurvivalCommand(accessToken, playerId, { restoreAll: true })
      setNotice(`Đã xếp lệnh hồi phục toàn diện cho ${target.displayName}.`)
    } catch (restoreError: unknown) {
      console.error('Không thể xếp lệnh hồi phục toàn diện.', restoreError)
      setError(restoreError instanceof Error ? restoreError.message : 'Không thể xếp lệnh hồi phục toàn diện.')
    } finally {
      setSavingSurvival(false)
    }
  }

  return (
    <section className="settings-card admin-controls-card">
      <div className="admin-console-heading">
        <span className="admin-console-icon" aria-hidden="true">✦</span>
        <div>
          <span className="section-kicker">HẢI GIỚI · QUYỀN ĐIỀU HÀNH</span>
          <h2>Bảng điều khiển quản trị</h2>
          <p>Quản lý người chơi, vật phẩm, vị trí và điều kiện của thế giới.</p>
        </div>
        <span className="admin-console-badge"><span aria-hidden="true">●</span> QUYỀN ĐÃ XÁC MINH</span>
      </div>
      <div className="admin-console-overview" aria-label="Phạm vi quyền quản trị">
        <div><span>Người chơi</span><strong>{loading ? '…' : players.length}</strong></div>
        <div><span>Thao tác</span><strong>Đa dạng</strong></div>
        <div><span>Đồng bộ lệnh</span><strong>Trong 15 giây</strong></div>
      </div>
      {loading ? <p className="account-state">Đang tải dữ liệu quản trị…</p> : (
        <>
          <div className="admin-weather-control admin-console-world">
            <div className="admin-panel-heading">
              <span aria-hidden="true">☁</span>
              <div><h3>Điều khiển thế giới</h3><p>Thời tiết áp dụng đồng bộ cho tất cả người chơi.</p></div>
            </div>
            <label>
              <span>Thời tiết toàn thế giới</span>
              <select value={weatherId} onChange={(event) => setWeatherId(event.target.value)}>
                <option value="">Chu kỳ tự nhiên</option>
                {weatherGroups.map((group) => (
                  <optgroup key={group} label={group}>
                    {weatherDefinitions.filter((weather) => weather.group === group).map((weather) => (
                      <option key={weather.id} value={weather.id}>{weather.icon} {weather.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button className="small-action admin-primary-action" type="button" disabled={savingWeather} onClick={() => void saveWeather()}>
              {savingWeather ? 'Đang lưu…' : 'Áp dụng toàn save'}
            </button>
            <p className="settings-note">Thiết lập này được lưu trên máy chủ và đồng bộ tới người chơi online trong khoảng 30 giây.</p>
          </div>

          <div className="admin-player-control">
            <div className="admin-panel-heading">
              <span aria-hidden="true">♟</span>
              <div><h3>Điều khiển người chơi</h3><p>Chọn hồ sơ để xem tình trạng và gửi lệnh quản trị.</p></div>
            </div>
            <label>
              <span>Người chơi</span>
              <select
                value={playerId}
                onChange={(event) => {
                  setPlayerId(event.target.value)
                  setValues(emptyValues)
                  setReplaceAilments(false)
                  setAilments([])
                  setDestinationIslandId('')
                  setError(null)
                  setNotice(null)
                }}
              >
                {players.length === 0 && <option value="">Không có người chơi</option>}
                {players.map((player) => (
                  <option key={player.id} value={player.id}>{player.displayName} · @{player.username}</option>
                ))}
              </select>
            </label>
            <section className="admin-player-current-stats" aria-live="polite" aria-label="Chỉ số hiện tại của người chơi">
              <div className="admin-player-current-heading">
                <strong>Chỉ số hiện tại</strong>
                {playerSurvival && <span className={playerSurvival.status === 'alive' ? 'is-alive' : 'is-dead'}>
                  {playerSurvival.status === 'alive' ? '● Đang sống' : '● Đã chết'}
                </span>}
              </div>
              {loadingPlayerSurvival
                ? <p className="account-state">Đang tải chỉ số người chơi…</p>
                : playerSurvival
                  ? (
                    <>
                      <div className="admin-player-current-grid">
                        {survivalFields.map((field) => {
                          const currentValue = playerSurvival.survival[field.key]
                          return (
                            <div key={field.key}>
                              <span>{field.label}</span>
                              <strong>{currentValue === undefined
                                ? '—'
                                : `${Number(currentValue).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}${field.key === 'bodyTemperature' ? '°C' : '%'}`}</strong>
                            </div>
                          )
                        })}
                      </div>
                      <p className="settings-note">
                        Trạng thái: {playerSurvival.ailments.length
                          ? playerSurvival.ailments.map((ailment) => (
                            ailmentOptions.find((option) => option.id === ailment.id)?.label ?? ailment.id
                          )).join(' · ')
                          : 'Không có bệnh hoặc chấn thương'}
                      </p>
                      <p className="admin-player-location">
                        <span aria-hidden="true">⌖</span>
                        Đang ở <strong>{getIslandDefinition(playerSurvival.currentLocationId)?.name ?? playerSurvival.currentLocationId}</strong>
                      </p>
                      <div className="admin-item-stores">
                        {([
                          ['inventory', 'Hành trang'],
                          ['storage', 'Kho đảo nhà'],
                        ] as const).map(([container, label]) => (
                          <div className="admin-item-store" key={container}>
                            <strong>{label}<span>{playerSurvival[container].length} ô</span></strong>
                            {playerSurvival[container].length
                              ? <ul>{playerSurvival[container].map((slot, index) => (
                                <li key={`${slot.itemId}-${slot.expiresAt ?? 'stable'}-${index}`}>
                                  <span>{itemDefinitions[slot.itemId].name}</span><b>×{slot.quantity}</b>
                                </li>
                              ))}</ul>
                              : <small>Đang trống</small>}
                          </div>
                        ))}
                      </div>
                      <div className="admin-power-actions">
                        <button
                          className="small-action admin-power-button"
                          type="button"
                          disabled={savingSurvival}
                          onClick={() => void restorePlayer()}
                        >
                          {savingSurvival ? 'Đang xếp lệnh…' : '✦ Hồi phục toàn diện'}
                        </button>
                        <small>Đưa sức khỏe, nhu cầu và thể lực về tối đa, xóa bệnh/chấn thương; hồi sinh nếu đã gục.</small>
                      </div>
                      <button
                        className="small-action admin-survival-submit"
                        type="button"
                        disabled={savingSurvival || playerSurvival.ailments.length === 0}
                        onClick={() => void clearPlayerAilments()}
                      >
                        {savingSurvival ? 'Đang xếp lệnh…' : 'Xóa toàn bộ hiệu ứng xấu'}
                      </button>
                      <p className="settings-note">Thao tác này xóa bệnh và chấn thương đang ghi nhận, không thay đổi các chỉ số sinh tồn.</p>
                      {playerSurvival.status === 'dead' && (
                        <button
                          className="small-action admin-survival-submit"
                          type="button"
                          disabled={savingSurvival}
                          onClick={() => void revivePlayer()}
                        >
                          {savingSurvival ? 'Đang xếp lệnh…' : 'Hồi sinh tại đảo nhà'}
                        </button>
                      )}
                    </>
                  )
                  : <p className="settings-note">
                    {playerSurvivalResult?.playerId === playerId && playerSurvivalResult.failed
                      ? 'Không thể tải chỉ số người chơi.'
                      : 'Người chơi chưa có save để đọc chỉ số.'}
                  </p>}
            </section>
            <div className="admin-action-grid">
              <section className="admin-action-card">
                <div className="admin-panel-heading">
                  <span aria-hidden="true">⇄</span>
                  <div><h3>Vật phẩm</h3><p>Trao đồ hoặc thu hồi từ hành trang/kho.</p></div>
                </div>
                <label>
                  <span>Chọn vật phẩm</span>
                  <select value={itemId} onChange={(event) => setItemId(event.target.value as ItemId)}>
                    {itemOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <div className="admin-inline-fields">
                  <label>
                    <span>Thao tác</span>
                    <select value={itemAction} onChange={(event) => setItemAction(event.target.value as typeof itemAction)}>
                      <option value="give">Trao vật phẩm</option>
                      <option value="take">Thu hồi vật phẩm</option>
                    </select>
                  </label>
                  <label>
                    <span>Số lượng</span>
                    <input type="number" min="1" max="9999" step="1" value={itemQuantity} onChange={(event) => setItemQuantity(event.target.value)} />
                  </label>
                </div>
                <label>
                  <span>Vật chứa</span>
                  <select value={itemContainer} onChange={(event) => setItemContainer(event.target.value as typeof itemContainer)}>
                    <option value="inventory">Hành trang người chơi</option>
                    <option value="storage">Kho đảo nhà</option>
                  </select>
                </label>
                {playerSurvival && (
                  <small className="admin-item-availability">
                    Đang có: {playerSurvival[itemContainer]
                      .filter((slot) => slot.itemId === itemId)
                      .reduce((total, slot) => total + slot.quantity, 0)} {itemDefinitions[itemId].name}
                  </small>
                )}
                <button className="small-action admin-primary-action" type="button" disabled={savingSurvival || !playerSurvival} onClick={() => void transferPlayerItem()}>
                  {savingSurvival ? 'Đang xếp lệnh…' : itemAction === 'give' ? 'Trao vật phẩm' : 'Thu hồi vật phẩm'}
                </button>
              </section>
              <section className="admin-action-card">
                <div className="admin-panel-heading">
                  <span aria-hidden="true">⌖</span>
                  <div><h3>Dịch chuyển</h3><p>Chuyển người chơi đến một hòn đảo đã chọn.</p></div>
                </div>
                <label>
                  <span>Điểm đến</span>
                  <select value={destinationIslandId} onChange={(event) => setDestinationIslandId(event.target.value)}>
                    <option value="">Chọn hòn đảo…</option>
                    {islandDefinitions.map((island) => (
                      <option key={island.id} value={island.id}>{island.name}</option>
                    ))}
                  </select>
                </label>
                <button className="small-action admin-primary-action" type="button" disabled={savingSurvival || !playerSurvival || !destinationIslandId} onClick={() => void teleportPlayer()}>
                  {savingSurvival ? 'Đang xếp lệnh…' : 'Gửi lệnh dịch chuyển'}
                </button>
                <small className="settings-note">Có thể gửi lệnh cho người chơi đang offline; lệnh được áp dụng khi họ kết nối.</small>
              </section>
            </div>
            <div className="admin-panel-heading admin-advanced-heading">
              <span aria-hidden="true">⚙</span>
              <div><h3>Chỉnh sinh tồn nâng cao</h3><p>Để trống chỉ số nếu muốn giữ nguyên giá trị hiện tại.</p></div>
            </div>
            <div className="admin-survival-fields">
              {survivalFields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={values[field.key]}
                    placeholder={playerSurvival
                      ? `Hiện tại ${playerSurvival.survival[field.key] ?? '—'}`
                      : 'Không đổi'}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            <label className="admin-ailment-toggle">
              <input
                type="checkbox"
                checked={replaceAilments}
                onChange={(event) => setReplaceAilments(event.target.checked)}
              />
              <span>Thay toàn bộ trạng thái bệnh/chấn thương</span>
            </label>
            {replaceAilments && (
              <>
                <div className="admin-ailment-list">
                  {ailmentOptions.map((ailment) => (
                    <label key={ailment.id}>
                      <input
                        type="checkbox"
                        checked={ailments.includes(ailment.id)}
                        onChange={(event) => setAilments((current) => (
                          event.target.checked
                            ? [...current, ailment.id]
                            : current.filter((id) => id !== ailment.id)
                        ))}
                      />
                      <span>{ailment.label}</span>
                    </label>
                  ))}
                </div>
                <label className="admin-severity-control">
                  <span>Mức độ các trạng thái đã chọn</span>
                  <select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
                    <option value="mild">Nhẹ</option>
                    <option value="moderate">Vừa</option>
                    <option value="severe">Nặng</option>
                  </select>
                </label>
              </>
            )}
            <button
              className="small-action admin-survival-submit"
              type="button"
              disabled={savingSurvival || !playerId}
              onClick={() => void applySurvivalCommand()}
            >
              {savingSurvival ? 'Đang xếp lệnh…' : 'Gửi cập nhật cho người chơi'}
            </button>
            <p className="settings-note">Chỉ trường có giá trị mới bị đổi. Trạng thái mới sẽ được lưu vào save của người chơi khi họ kết nối.</p>
          </div>
        </>
      )}
      {error && <p className="account-error" role="alert">{error}</p>}
      {notice && <p className="account-success" role="status">{notice}</p>}
    </section>
  )
}
