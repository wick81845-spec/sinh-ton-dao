import { survivalConfig } from '../data/survivalConfig'

export type SurvivalStatName = 'health' | 'hunger' | 'thirst' | 'stamina'

const statLabels: Record<SurvivalStatName, string> = {
  health: 'Sức khỏe',
  hunger: 'Đói',
  thirst: 'Khát',
  stamina: 'Sức lực',
}

const statIcons: Record<SurvivalStatName, string> = {
  health: '✚',
  hunger: '◒',
  thirst: '⌁',
  stamina: 'ϟ',
}

const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

interface SurvivalMeterProps {
  stat: SurvivalStatName
  value: number
  status: string
}

export function SurvivalMeter({ stat, value, status }: SurvivalMeterProps) {
  const percentage = Math.max(0, Math.min(100, value))
  const tone = status === 'Ổn định' ? '' : ' warning'

  return (
    <article className="stat-card">
      <div className={`stat-icon ${stat}`} aria-hidden="true">{statIcons[stat]}</div>
      <div className="stat-info">
        <div className="stat-label">{statLabels[stat]}</div>
        <div className="stat-value">{numberFormatter.format(value)}<span> / {survivalConfig[stat].max}</span></div>
        <div
          className="stat-meter"
          role="progressbar"
          aria-label={statLabels[stat]}
          aria-valuemin={0}
          aria-valuemax={survivalConfig[stat].max}
          aria-valuenow={percentage}
        >
          <span className={stat} style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <span className={`stat-condition${tone}`}>{status}</span>
    </article>
  )
}
