import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { survivalConfig } from '../data/survivalConfig'
import { SurvivalMeter, type SurvivalStatName } from '../components/SurvivalMeter'
import { BodyStatusPanel } from '../components/BodyStatusPanel'
import { getCurrentWeather } from '../../world/services/weatherService'
import { isSurvivorResting } from '../utils/survivalCalculator'
import { gameClock } from '../../../services/clock/gameClock'
import { getWorldWeatherAtTime } from '../../world/services/worldClock'

function getStatStatus(stat: SurvivalStatName, value: number): string {
  if (stat === 'hunger') {
    if (value === 0) return 'Đói lả'
    if (value <= 10) return 'Suy dinh dưỡng'
    if (value <= 25) return 'Đói'
  }
  if (stat === 'thirst') {
    if (value === 0) return 'Mất nước nghiêm trọng'
    if (value <= 10) return 'Mất nước'
    if (value <= 25) return 'Khát'
  }
  if (stat === 'stamina') {
    if (value <= 10) return 'Kiệt sức'
    if (value <= 40) return 'Mệt mỏi'
  }
  if (stat === 'health' && value <= 25) return 'Nguy cấp'
  return 'Ổn định'
}

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
  const weather = getWorldWeatherAtTime(getCurrentWeather(gameState), gameClock.now())

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
            status={getStatStatus(name, value)}
          />
        ))}
      </section>

      <section className={`survival-rest-control${isResting ? ' is-resting' : ''}`} aria-live="polite">
        <div>
          <strong>{isResting ? 'Đang nghỉ ngơi' : 'Sức lực chỉ hồi khi nghỉ'}</strong>
          <p>
            {isResting
              ? `Đang hồi tối đa ${survivalConfig.stamina.recoveryPerMinute} điểm thể lực mỗi phút.`
              : gameState.character.status !== 'alive'
                ? 'Bạn cần hồi sinh trước khi nghỉ ngơi.'
              : isBusy
                ? 'Hãy hoàn thành hoạt động hiện tại trước khi nghỉ ngơi.'
                : 'Chủ động nghỉ ngơi để hồi thể lực. Bạn có thể dừng bất cứ lúc nào.'}
          </p>
        </div>
        <button
          className="survival-rest-button"
          type="button"
          disabled={!isResting && (
            gameState.character.status !== 'alive'
            || isBusy
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
      />

      <p className="survival-rule-note">
        Đói giảm {survivalConfig.hunger.decayPerHour} điểm/giờ, khát giảm {survivalConfig.thirst.decayPerHour} điểm/giờ
        {weather && weather.temperatureDelta >= 5
          ? ` (tăng ${Math.round((survivalConfig.hotWeatherThirstMultiplier - 1) * 100)}% khi trời nóng)`
          : ''}.
        Sức lực chỉ hồi khi nghỉ ngơi (không có hoạt động, chế tạo, xây dựng hoặc di chuyển), tối đa {survivalConfig.stamina.recoveryPerMinute} điểm/phút; đói, khát hoặc sức khỏe thấp làm chậm hồi phục.
        Khi đói hoặc khát ≤ {survivalConfig.criticalNeedThreshold}, sức khỏe giảm lần lượt {survivalConfig.health.malnutritionDamagePerHour} và {survivalConfig.health.severeDehydrationDamagePerHour} điểm/giờ;
        khi cạn, mất lần lượt {survivalConfig.health.starvationDamagePerHour} và {survivalConfig.health.dehydrationDamagePerHour} điểm/giờ.
      </p>
    </div>
  )
}
