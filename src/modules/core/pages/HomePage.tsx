import { Link } from 'react-router-dom'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { useGame } from '../../../app/providers/useGame'
import { SurvivalMeter, type SurvivalStatName } from '../../survival/components/SurvivalMeter'
import { BodyExposureMeters } from '../../survival/components/BodyExposureMeters'
import { getBodyStatusEffects } from '../../survival/services/bodyStatusService'
import { getSurvivalMeterStatus } from '../../survival/utils/survivalStates'
import { getIslandDefinition, worldLocations } from '../../world/data/worldDefinitions'
import { getCurrentWeather } from '../../world/services/weatherService'
import { isSurvivorResting } from '../../survival/utils/survivalCalculator'
import { gameClock } from '../../../services/clock/gameClock'
import { getWorldWeatherAtTime } from '../../world/services/worldClock'

const survivalStatNames: { name: SurvivalStatName; label: string }[] = [
  { name: 'hunger', label: 'Đói' },
  { name: 'thirst', label: 'Khát' },
  { name: 'stamina', label: 'Sức lực' },
  { name: 'health', label: 'Sức khỏe' },
]

const quickActions = [
  { to: '/gathering', label: 'Thu thập', icon: '⌁' },
  { to: '/inventory', label: 'Túi đồ', icon: '▤' },
  { to: '/crafting', label: 'Chế tạo', icon: '⚒' },
  { to: '/building', label: 'Xây dựng', icon: '⌂' },
  { to: '/exploration', label: 'Thám hiểm', icon: '⌖' },
  { to: '/island', label: 'Đảo nhà', icon: '◈' },
]

export function HomePage() {
  const { gameState, isLoading, error, consumeItem } = useGame()

  if (isLoading) return <p className="page-state">Đang tải hành trình…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const { character, survival, inventory } = gameState
  const appearance = character.appearance ?? 'male'
  const homeIslandName = character.homeIslandName ?? 'Mầm Xanh'
  const currentIsland = getIslandDefinition(character.currentLocationId)
  const currentLocation = worldLocations.find((location) => location.islandId === character.currentLocationId)
  const locationName = character.currentLocationId === character.homeIslandId
    ? homeIslandName
    : currentIsland?.name ?? character.currentLocationId
  const weather = getCurrentWeather(gameState)
  const ambientWeather = getWorldWeatherAtTime(weather, gameClock.now())
  const isResting = isSurvivorResting(gameState)
  const bodyEffects = getBodyStatusEffects(survival, ambientWeather, isResting)
  const previewItems = inventory.slots.slice(0, 6)
  const carriedCount = inventory.slots.reduce((total, item) => total + item.quantity, 0)
  const bodyAlerts = bodyEffects.filter((effect) => effect.severity !== 'positive')
  const availableFood = inventory.slots
    .map((slot) => ({ slot, item: itemDefinitions[slot.itemId] }))
    .filter(({ item }) => item.usable && item.hungerRestore)
    .sort((left, right) => (right.item.hungerRestore ?? 0) - (left.item.hungerRestore ?? 0))[0]
  const weatherAlert = weather && (weather.severity === 'adverse' || weather.severity === 'dangerous')
    ? weather
    : undefined
  const alertSummaryNames = [
    ...bodyAlerts.map((effect) => effect.name),
    ...(weatherAlert ? [weatherAlert.name] : []),
  ]
  const alertSummarySeverity = character.status !== 'alive'
    || bodyAlerts.some((effect) => effect.severity === 'severe')
    || weatherAlert?.severity === 'dangerous'
    ? 'severe'
    : bodyAlerts.some((effect) => effect.severity === 'moderate') || weatherAlert
      ? 'moderate'
      : 'mild'
  const hasFoodNeed = bodyAlerts.some((effect) => [
    'hunger-rising',
    'hungry',
    'malnutrition',
    'hunger-critical',
    'starving',
  ].includes(effect.id))
  const ongoingActivities = [
    ...(gameState.activeCombat ? [{ label: 'Đang chiến đấu', to: '/combat', icon: '⚔' }] : []),
    ...(gameState.activeGathering ? [{ label: 'Đang thu thập', to: '/gathering', icon: '⌁' }] : []),
    ...(gameState.activeExploration ? [{ label: 'Đang thám hiểm', to: '/exploration', icon: '⌖' }] : []),
    ...(gameState.craftingQueue.length > 0 ? [{ label: `${gameState.craftingQueue.length} món đang chế tạo`, to: '/crafting', icon: '⚒' }] : []),
    ...(gameState.constructionQueue.length > 0 ? [{ label: `${gameState.constructionQueue.length} công trình đang xây`, to: '/building', icon: '⌂' }] : []),
    ...(gameState.voyages.some((voyage) => voyage.status === 'traveling' || voyage.status === 'departed')
      ? [{ label: 'Thuyền đang ngoài khơi', to: '/voyage', icon: '≈' }]
      : []),
  ]
  const survivalStats = survivalStatNames.map(({ name, label }) => {
    const value = survival[name]
    const status = getSurvivalMeterStatus(name, value)
    return { name, label, value, status }
  })

  return (
    <div className="dashboard overview-dashboard">
      <section className={`overview-hero overview-hero-${appearance}`} aria-label="Hồ sơ sinh tồn">
        <div className="overview-portrait-stage">
          <div className="overview-portrait-glow" />
          <img
            className="overview-character-art"
            src={`/assets/characters/survivor-${appearance}.png`}
            alt={`Nhân vật ${appearance === 'female' ? 'nữ' : 'nam'}, ${character.name}`}
          />
          <span className="overview-level">CẤP {String(character.level).padStart(2, '0')}</span>
        </div>

        <div className="overview-identity">
          <span className="section-kicker">HỒ SƠ SINH TỒN · CẤP {character.level}</span>
          <h1>{character.name}</h1>
          <p className="overview-subtitle">
            {character.status === 'alive' ? 'Đang sinh tồn giữa Hải Giới' : 'Đang cần được hồi sinh'}
          </p>

          <div className="overview-home">
            <img
              className="overview-home-art"
              src={currentIsland?.artwork ?? '/assets/world/tropical-island.jpg'}
              alt={`Ảnh ${locationName}`}
            />
            <div>
              <span className="section-kicker">{character.currentLocationId === character.homeIslandId ? 'ĐANG Ở ĐẢO NHÀ' : 'VỊ TRÍ HIỆN TẠI'}</span>
              <strong>{locationName}</strong>
              <small>{currentLocation?.name ?? currentIsland?.description ?? 'Vị trí hiện tại'}</small>
            </div>
            <Link to="/world" aria-label="Xem thế giới">↗</Link>
          </div>

          <div className="overview-body">
            <span className="section-kicker">TÌNH TRẠNG CƠ THỂ</span>
            <div className="overview-effect-list">
              {bodyEffects.length === 0
                ? <span className="overview-effect overview-effect-good"><i>✓</i> Thể trạng ổn định</span>
                : bodyEffects.slice(0, 3).map((effect) => (
                  <span className={`overview-effect overview-effect-${effect.severity}`} key={effect.id}>
                    <i aria-hidden="true">{effect.icon}</i>{effect.name}
                  </span>
                ))}
            </div>
            <Link className="overview-detail-link" to="/survival">Kiểm tra tình trạng chi tiết <span aria-hidden="true">↗</span></Link>
          </div>
        </div>

        <div className="overview-stat-panel">
          <div className="overview-stat-heading">
            <div>
              <span className="section-kicker">THÔNG SỐ</span>
              <h2>Sinh tồn</h2>
            </div>
            <Link to="/survival" aria-label="Xem chi tiết sinh tồn">↗</Link>
          </div>
          <div className="overview-stat-grid">
            {survivalStats.map((stat) => (
              <SurvivalMeter key={stat.label} stat={stat.name} value={stat.value} status={stat.status} />
            ))}
          </div>
          <BodyExposureMeters stats={survival} />
          <div className="overview-weather">
            <span aria-hidden="true">{weather?.icon ?? '☀'}</span>
            <strong>{weather?.name ?? 'Thời tiết ổn định'}</strong>
            <small>{weather ? 'Thời tiết hiện tại' : 'Ổn định'}</small>
          </div>
        </div>
      </section>

      <div className="overview-monitor-grid">
        <section className="overview-monitor-panel" aria-labelledby="overview-monitor-title">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">THEO DÕI HIỆN TẠI</span>
              <h2 id="overview-monitor-title">Tình trạng của bạn</h2>
            </div>
            <span className={`overview-status-badge${bodyAlerts.length || weatherAlert || character.status !== 'alive' ? ' needs-attention' : ''}`}>
              {character.status !== 'alive' ? 'Cần hồi sinh' : bodyAlerts.length || weatherAlert ? 'Cần chú ý' : 'Ổn định'}
            </span>
          </div>
          <div
            className={`overview-alert-summary overview-alert-summary-${alertSummarySeverity}`}
            aria-live="polite"
            role={alertSummarySeverity === 'severe' ? 'alert' : undefined}
          >
            <span className="overview-alert-summary-icon" aria-hidden="true">
              {character.status !== 'alive' ? '!' : alertSummaryNames.length ? weatherAlert?.icon ?? bodyAlerts[0]?.icon : '✓'}
            </span>
            <div className="overview-alert-summary-copy">
              <strong>
                {character.status !== 'alive'
                  ? 'Nhân vật đã gục ngã'
                  : alertSummaryNames.length
                    ? `${alertSummaryNames.length} mục cần chú ý`
                    : 'Mọi thứ ổn định'}
              </strong>
              <p>
                {character.status !== 'alive'
                  ? 'Cần hồi sinh để tiếp tục hành trình.'
                  : alertSummaryNames.length
                    ? alertSummaryNames.join(' · ')
                    : 'Chưa có vấn đề cần xử lý.'}
              </p>
            </div>
            <div className="overview-alert-summary-actions">
              {character.status !== 'alive' ? (
                <Link className="overview-alert-action" to="/combat">Hồi sinh</Link>
              ) : (
                <>
                  {hasFoodNeed && availableFood && (
                    <button className="overview-alert-action" type="button" onClick={() => consumeItem(availableFood.slot.itemId)}>
                      Ăn {availableFood.item.name}
                    </button>
                  )}
                  {hasFoodNeed && !availableFood && (
                    <Link className="overview-alert-action" to="/gathering">Tìm thức ăn</Link>
                  )}
                  {(bodyAlerts.length > 0 || !weatherAlert) && (
                    <Link className="overview-alert-action" to="/survival">Chi tiết</Link>
                  )}
                  {weatherAlert && (
                    <Link className="overview-alert-action" to="/voyage">Hàng hải</Link>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="overview-activity-status">
            <span className="section-kicker">ĐANG DIỄN RA</span>
            {ongoingActivities.length > 0 ? ongoingActivities.map((activity) => (
              <Link to={activity.to} key={activity.to}>
                <span aria-hidden="true">{activity.icon}</span>{activity.label}<span aria-hidden="true">↗</span>
              </Link>
            )) : <small>Hiện không có hoạt động nào đang chạy.</small>}
          </div>
        </section>

      </div>

      <div className="dashboard-lower overview-lower">
        <section className="resource-panel overview-inventory">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">VẬT PHẨM ĐANG MANG</span>
              <h2>Túi đồ <small>{carriedCount} món</small></h2>
            </div>
            <Link className="text-link" to="/inventory">Mở túi đồ <span aria-hidden="true">↗</span></Link>
          </div>
          {previewItems.length > 0 ? (
            <div className="overview-inventory-grid">
              {previewItems.map((slot) => {
                const item = itemDefinitions[slot.itemId]
                return (
                  <div className="overview-item" key={slot.itemId}>
                    <img src={item.image} alt="" aria-hidden="true" />
                    <span>{item.name}</span>
                    <strong>×{slot.quantity}</strong>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="overview-empty-inventory">Túi đồ đang trống.</p>
          )}
          <div className="inventory-capacity">
            <span>{inventory.slots.length} / {inventory.maxSlots} ô</span>
            <span className="capacity-track">
              <i style={{ width: `${inventory.slots.length / inventory.maxSlots * 100}%` }} />
            </span>
          </div>
        </section>

        <section className="activity-panel overview-activity">
          <div className="section-heading compact-heading">
            <div>
              <span className="section-kicker">TRUY CẬP NHANH</span>
              <h2>Chức năng thường dùng</h2>
            </div>
            <span className="activity-mark" aria-hidden="true">✦</span>
          </div>
          <div className="overview-action-grid">
            {quickActions.map((action) => (
              <Link to={action.to} key={action.to}>
                <span aria-hidden="true">{action.icon}</span>{action.label}<span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <div className="activity-note"><span className="note-dot" /> Tiến trình được lưu trên thiết bị này</div>
        </section>
      </div>
    </div>
  )
}
