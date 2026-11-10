import type { SurvivalStats } from '../../../shared/types/game'

export function BodyExposureMeters({ stats }: { stats: SurvivalStats }) {
  const bodyTemperature = stats.bodyTemperature ?? 37
  const wetness = stats.wetness ?? 0
  const temperatureStatus = bodyTemperature >= 39
    ? 'Quá nóng'
    : bodyTemperature < 35
      ? 'Quá lạnh'
      : 'Ổn định'
  const wetnessStatus = wetness >= 70
    ? 'Ướt đẫm'
    : wetness > 0
      ? 'Đang ẩm'
      : 'Khô ráo'

  return (
    <section className="body-exposure-meters" aria-label="Thân nhiệt và độ ướt">
      <article className={`body-exposure-meter${bodyTemperature >= 39 || bodyTemperature < 35 ? ' is-warning' : ''}`}>
        <div className="body-exposure-heading">
          <span>Thân nhiệt</span>
          <strong>{bodyTemperature.toFixed(1)}°C</strong>
        </div>
        <div className="body-exposure-track" role="meter" aria-label="Thân nhiệt" aria-valuemin={32} aria-valuemax={42} aria-valuenow={bodyTemperature}>
          <span className="body-exposure-temperature-fill" style={{ width: `${Math.min(100, Math.max(0, (bodyTemperature - 32) * 10))}%` }} />
        </div>
        <small>{temperatureStatus} · bình thường khoảng 36–38°C</small>
      </article>
      <article className={`body-exposure-meter${wetness >= 50 ? ' is-warning' : ''}`}>
        <div className="body-exposure-heading">
          <span>Quần áo ướt</span>
          <strong>{Math.round(wetness)}%</strong>
        </div>
        <div className="body-exposure-track" role="meter" aria-label="Độ ướt quần áo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={wetness}>
          <span className="body-exposure-wetness-fill" style={{ width: `${wetness}%` }} />
        </div>
        <small>{wetnessStatus} · mưa lạnh làm cơ thể mất nhiệt nhanh hơn</small>
      </article>
    </section>
  )
}
