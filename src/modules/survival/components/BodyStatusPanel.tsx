import type { SurvivalAilment, SurvivalStats } from '../../../shared/types/game'
import { getBodyStatusEffects } from '../services/bodyStatusService'
import type { WeatherDefinition } from '../../world/data/weatherDefinitions'

const severityLabels = {
  mild: 'Nhẹ',
  moderate: 'Vừa',
  severe: 'Nặng',
  positive: 'Tốt',
} as const

export function BodyStatusPanel({ stats, characterName, appearance, weather, isResting = true, shelterLevel = 0, ailments = [] }: {
  stats: SurvivalStats
  characterName: string
  appearance: 'male' | 'female'
  weather?: WeatherDefinition
  isResting?: boolean
  shelterLevel?: number
  ailments?: SurvivalAilment[]
}) {
  const effects = getBodyStatusEffects(stats, weather, isResting, shelterLevel, ailments)
  const weatherEffectIds = ['overheated', 'cold-weather', 'rain-wet']
  const prioritizedEffects = [...effects].sort((left, right) => {
    const leftWeather = weatherEffectIds.includes(left.id) ? 0 : 1
    const rightWeather = weatherEffectIds.includes(right.id) ? 0 : 1
    if (leftWeather !== rightWeather) return leftWeather - rightWeather
    if (left.severity === 'positive' && right.severity !== 'positive') return 1
    if (left.severity !== 'positive' && right.severity === 'positive') return -1
    return 0
  })
  const visualEffect = prioritizedEffects.find((effect) => weatherEffectIds.includes(effect.id))
    ?? prioritizedEffects.find((effect) => effect.severity === 'severe')
    ?? prioritizedEffects.find((effect) => effect.severity === 'moderate')
    ?? prioritizedEffects[0]
  const visibleEffects = prioritizedEffects.slice(0, 4)

  return (
    <section className="body-status-panel" aria-label="Hiệu ứng trạng thái cơ thể">
      <div className="body-status-heading">
        <div>
          <span className="section-kicker">QUAN SÁT NHÂN VẬT</span>
          <h2>Trạng thái cơ thể</h2>
        </div>
        <span className="body-status-count">{effects.length} hiệu ứng</span>
      </div>
      <div className="body-status-layout">
        <div
          className={`body-status-portrait${visualEffect ? ` body-state-${visualEffect.id}` : ''}${stats.health === 0 ? ' body-state-dead' : ''}`}
          role="img"
          aria-label={`${characterName}: ${visualEffect?.appearance ?? 'Thể trạng ổn định'}`}
        >
          <span className="body-status-halo" />
          {visibleEffects.slice(0, 3).map((effect, index) => (
            <span
              className={`body-effect-bubble body-effect-${effect.severity}`}
              key={effect.id}
              style={{ top: `${12 + index * 29}px` }}
              aria-hidden="true"
            >
              {effect.icon}
            </span>
          ))}
          <img
            className={`body-status-figure body-status-character-${appearance}`}
            src={`/assets/characters/survivor-${appearance}.png`}
            alt=""
            aria-hidden="true"
          />
        </div>
        <div className="body-status-effects">
          {effects.length === 0
            ? <p className="body-status-empty">Chưa có hiệu ứng nổi bật. Nhân vật đang trong trạng thái ổn định.</p>
            : prioritizedEffects.map((effect) => (
              <article className={`body-effect-card body-effect-card-${effect.severity}`} key={effect.id}>
                <span className="body-effect-icon" aria-hidden="true">{effect.icon}</span>
                <div className="body-effect-copy">
                  <div className="body-effect-title">
                    <strong>{effect.name}</strong>
                    <span>{severityLabels[effect.severity]}</span>
                  </div>
                  <small><strong>Nguyên nhân:</strong> {effect.cause}</small>
                  <small><strong>Ảnh hưởng:</strong> {effect.impact}</small>
                  <small className="body-effect-resolution"><strong>Cách xử lý:</strong> {effect.resolution}</small>
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  )
}
