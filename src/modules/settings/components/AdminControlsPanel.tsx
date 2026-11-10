import { useEffect, useState } from 'react'
import {
  loadAdminPlayers,
  loadAdminPlayerSurvival,
  loadRemoteWorldSettings,
  queueAdminSurvivalCommand,
  updateGlobalWeather,
} from '../../../services/persistence/remoteAdminControlClient'
import type {
  AdminPlayerSummary,
  AdminPlayerSurvivalSummary,
  AdminSurvivalCommand,
} from '../../../shared/types/admin'
import type { SurvivalAilmentId } from '../../../shared/types/game'
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

  return (
    <section className="settings-card admin-controls-card">
      <div className="settings-section-heading">
        <span className="settings-section-icon" aria-hidden="true">⌘</span>
        <div>
          <h2>Điều khiển sinh tồn · Quản trị viên</h2>
          <p>Chỉnh một người chơi hoặc đặt thời tiết chung cho toàn bộ save.</p>
        </div>
      </div>
      {loading ? <p className="account-state">Đang tải dữ liệu quản trị…</p> : (
        <>
          <div className="admin-weather-control">
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
            <button className="small-action" type="button" disabled={savingWeather} onClick={() => void saveWeather()}>
              {savingWeather ? 'Đang lưu…' : 'Áp dụng toàn save'}
            </button>
            <p className="settings-note">Thiết lập này được lưu trên máy chủ và đồng bộ tới người chơi online trong khoảng 30 giây.</p>
          </div>

          <div className="admin-player-control">
            <label>
              <span>Người chơi</span>
              <select
                value={playerId}
                onChange={(event) => {
                  setPlayerId(event.target.value)
                  setValues(emptyValues)
                  setReplaceAilments(false)
                  setAilments([])
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
                {playerSurvival && (
                  <span className={playerSurvival.status === 'alive' ? 'is-alive' : 'is-dead'}>
                    {playerSurvival.status === 'alive' ? 'Đang sống' : 'Đã mất'}
                  </span>
                )}
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
                    </>
                  )
                  : <p className="settings-note">
                    {playerSurvivalResult?.playerId === playerId && playerSurvivalResult.failed
                      ? 'Không thể tải chỉ số người chơi.'
                      : 'Người chơi chưa có save để đọc chỉ số.'}
                  </p>}
            </section>
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
