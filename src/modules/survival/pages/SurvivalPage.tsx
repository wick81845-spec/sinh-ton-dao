import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { survivalConfig } from '../data/survivalConfig'
import { SurvivalMeter, type SurvivalStatName } from '../components/SurvivalMeter'
import { BodyExposureMeters } from '../components/BodyExposureMeters'
import { BodyStatusPanel } from '../components/BodyStatusPanel'
import { getCurrentWeather } from '../../world/services/weatherService'
import { isSurvivorResting } from '../utils/survivalCalculator'
import { gameClock } from '../../../services/clock/gameClock'
import { getWorldClock, getWorldSeason, getWorldWeatherAtTime } from '../../world/services/worldClock'
import { buildingDefinitions } from '../../building/data/buildingDefinitions'
import { getSurvivalMeterStatus } from '../utils/survivalStates'

export function SurvivalPage() {
  const { gameState, isLoading, error, startResting, stopResting } = useGame()

  if (isLoading) return <p className="page-state">Đang tải trạng thái sinh tồn…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu nhân vật.'}</p>

  const stats: { name: SurvivalStatName; value: number }[] = [
    { name: 'hunger', value: gameState.survival.hunger },
    { name: 'thirst', value: gameState.survival.thirst },
    { name: 'stamina', value: gameState.survival.stamina },
    { name: 'health', value: gameState.survival.health },
  ]
  const isResting = isSurvivorResting(gameState)
  const isBusy = Boolean(gameState.activeGathering
    || gameState.activeExploration
    || gameState.activeCombat
    || gameState.craftingQueue.length > 0
    || gameState.constructionQueue.length > 0
    || gameState.voyages.some((voyage) => voyage.status === 'departed' || voyage.status === 'traveling'))
  const now = gameClock.now()
  const worldClock = getWorldClock(now)
  const weather = getWorldWeatherAtTime(getCurrentWeather(gameState), now)
  const season = getWorldSeason(now)
  const nightRecoveryMultiplier = worldClock.lightLevel === 'night'
    ? survivalConfig.stamina.nightRestRecoveryMultiplier
    : 1
  const shelter = gameState.buildings.find((building) => (
    building.definitionId === 'building_shelter'
    && building.status === 'completed'
    && building.islandId === gameState.character.currentLocationId
  ))
  const shelterName = buildingDefinitions.find((building) => building.id === shelter?.definitionId)?.name
  const shelterLabel = shelter
    ? `${shelterName ?? 'Lều'} · Cấp ${shelter.level}`
    : 'lều nghỉ ngơi'

  return (
    <div className="survival-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">NHÂN VẬT · CHẨN ĐOÁN HIỆN TẠI</span>
          <h1>Tình trạng cơ thể</h1>
          <p>Xem từng vấn đề đang gặp, nguyên nhân và ảnh hưởng đến hành trình.</p>
        </div>
        <Link className="text-link" to="/character">Hồ sơ nhân vật <span aria-hidden="true">↗</span></Link>
      </div>

      <section className="survival-detail-grid" aria-label="Chỉ số sinh tồn">
        {stats.map(({ name, value }) => (
          <SurvivalMeter
            key={name}
            stat={name}
            value={value}
            status={getSurvivalMeterStatus(name, value)}
          />
        ))}
      </section>
      <BodyExposureMeters stats={gameState.survival} />

      <section className={`survival-rest-control${isResting ? ' is-resting' : ''}`} aria-live="polite">
        <div>
          <strong>{isResting ? `Đang nghỉ tại ${shelterLabel}` : `Nghỉ ngơi tại ${shelterLabel}`}</strong>
          <p>
            {isResting
              ? `Đang hồi tối đa ${survivalConfig.stamina.recoveryPerMinute * nightRecoveryMultiplier} điểm thể lực mỗi phút${nightRecoveryMultiplier > 1 ? ' · thưởng nghỉ ban đêm' : ''} · hiệu quả nghỉ tăng ${shelter?.level === 1 ? 25 : 25 + Math.max(0, (shelter?.level ?? 1) - 1) * 15}%.`
              : gameState.character.status !== 'alive'
                ? 'Bạn cần hồi sinh trước khi nghỉ ngơi.'
              : isBusy
                ? 'Hãy hoàn thành hoạt động hiện tại trước khi nghỉ ngơi.'
                : shelter
                  ? 'Nghỉ trong lều để hồi phục. Khi thực hiện hoạt động khác, bạn sẽ rời lều và mất hiệu ứng nghỉ.'
                  : 'Bạn chưa có lều hoàn thành trên đảo này. Hãy dựng lều trước khi nghỉ ngơi.'}
          </p>
          {!shelter && <Link className="text-link survival-build-shelter-link" to="/building">Đến xây lều <span aria-hidden="true">↗</span></Link>}
        </div>
        <button
          className="survival-rest-button"
          type="button"
          disabled={!isResting && (
            gameState.character.status !== 'alive'
            || isBusy
            || !shelter
            || gameState.survival.stamina >= survivalConfig.stamina.max
          )}
          onClick={() => (isResting ? stopResting() : startResting())}
        >
          {isResting ? 'Dừng nghỉ' : 'Nghỉ ngơi'}
        </button>
      </section>

      <BodyStatusPanel
        stats={gameState.survival}
        characterName={gameState.character.name}
        appearance={gameState.character.appearance ?? 'male'}
        weather={weather}
        isResting={isResting}
        shelterLevel={shelter?.level ?? 0}
        ailments={gameState.ailments}
      />

      <p className="survival-rule-note">
        Một ngày game dài 1 giờ ngoài đời. Đói giảm {survivalConfig.hunger.decayPerDay} điểm/ngày game ({(survivalConfig.hunger.decayPerDay / 24).toFixed(2)} điểm/giờ game), khát giảm {survivalConfig.thirst.decayPerDay} điểm/ngày game ({(survivalConfig.thirst.decayPerDay / 24).toFixed(2)} điểm/giờ game);
        khi làm hoạt động nặng, hai nhu cầu tụt nhanh hơn {Math.round((survivalConfig.activityNeedMultiplier - 1) * 100)}%
        {weather && weather.temperatureDelta >= 5
          ? ` (tăng ${Math.round((survivalConfig.hotWeatherThirstMultiplier - 1) * 100)}% khi trời nóng)`
          : ''}.
        <span>
          {' '}{season.name} ngày {season.day}/7:{' '}
          {season.thirstMultiplier !== 1
            ? `nhu cầu nước ${season.thirstMultiplier > 1 ? 'tăng' : 'giảm'} ${Math.round(Math.abs(season.thirstMultiplier - 1) * 100)}%, `
            : ''}
          nhiệt độ theo mùa {season.temperatureDelta > 0 ? '+' : ''}{season.temperatureDelta}°C.
        </span>
        Mùa đổi sau mỗi 7 ngày game.
        Sức lực chỉ hồi khi nghỉ ngơi (không có hoạt động, chế tạo, xây dựng hoặc di chuyển), tối đa {survivalConfig.stamina.recoveryPerMinute} điểm/phút ban ngày và {survivalConfig.stamina.recoveryPerMinute * survivalConfig.stamina.nightRestRecoveryMultiplier} điểm/phút ban đêm; đói, khát hoặc sức khỏe thấp làm chậm hồi phục.
        Lều lá cấp 1 tăng hồi phục 25%, nâng cấp cấp 2 tăng 40% và che chắn tác động khát do nắng nóng.
        Mưa làm tích lũy độ ướt; độ ướt chỉ làm cơ thể mất nhiệt nhanh hơn khi môi trường lạnh hoặc gió mạnh, nên mưa nhiệt đới không tự gây hạ thân nhiệt.
        Đói và khát làm chậm hồi phục theo từng giai đoạn; chạm 0 không trực tiếp trừ sức khỏe. Hậu quả tích lũy và tốc độ cân bằng sẽ được hoàn thiện ở bước bảng tiêu hao.
      </p>
    </div>
  )
}
