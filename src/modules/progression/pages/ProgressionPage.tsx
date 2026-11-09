import { useGame } from '../../../app/providers/useGame'
import {
  currentLevelProgress,
  skillDefinitions,
  skillLevelForExperience,
  technologyDefinitions,
} from '../data/progressionDefinitions'
import { getTechnologyResearchAvailability } from '../services/technologyService'
import { ItemStack } from '../../../shared/components/ItemArtwork'

export function ProgressionPage() {
  const { gameState, isLoading, error, researchTechnology } = useGame()

  if (isLoading) return <p className="page-state">Đang tải tiến trình…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu tiến trình.'}</p>

  const { character } = gameState
  const progress = currentLevelProgress(character.experience)
  const progressPercent = Math.min(100, progress.current / progress.required * 100)

  return (
    <div className="progression-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">PHÁT TRIỂN NHÂN VẬT</span>
          <h1>Tiến trình & công nghệ</h1>
          <p>Kinh nghiệm từ hoạt động giúp nâng cấp cấp độ và chuyên môn.</p>
        </div>
        <div className="stamina-chip"><strong>Cấp {character.level}</strong> · {character.experience} XP</div>
      </div>

      <section className="detail-card progression-level-card">
        <div>
          <span className="section-kicker">CẤP ĐỘ NHÂN VẬT</span>
          <h2>Cấp {character.level}</h2>
          <p>{progress.current} / {progress.required} XP tới cấp tiếp theo</p>
        </div>
        <div className="gathering-progress-track" role="progressbar" aria-label="Kinh nghiệm cấp độ" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <section className="world-region">
        <div className="section-heading">
          <div><span className="section-kicker">CHUYÊN MÔN</span><h2>Kỹ năng</h2></div>
        </div>
        <div className="recipe-grid progression-skill-grid">
          {skillDefinitions.map((skill) => {
            const experience = character.skillExperience?.[skill.id] ?? 0
            const level = skillLevelForExperience(experience)
            const progressToNext = experience - ((level - 1) * level / 2) * 50
            const required = level * 50
            return (
              <article className="recipe-card progression-skill-card" key={skill.id}>
                <span className="placeholder-symbol" aria-hidden="true">{skill.icon}</span>
                <div className="recipe-card-copy">
                  <span className="section-kicker">KỸ NĂNG CẤP {level} · {experience} XP</span>
                  <h3>{skill.name}</h3>
                  <p>{skill.description}</p>
                  <div className="gathering-progress-track" role="progressbar" aria-label={`Tiến độ kỹ năng ${skill.name}`} aria-valuenow={progressToNext / required * 100} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${Math.min(100, progressToNext / required * 100)}%` }} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="world-region">
        <div className="section-heading">
          <div><span className="section-kicker">CÂY CÔNG NGHỆ</span><h2>Nghiên cứu công nghệ</h2></div>
        </div>
        <div className="world-event-list">
          {technologyDefinitions.map((technology) => {
            const researched = (character.researchedTechnologyIds ?? []).includes(technology.id)
            const issue = getTechnologyResearchAvailability(gameState, technology.id)
            const prerequisites = technology.prerequisites
              .map((id) => technologyDefinitions.find((entry) => entry.id === id)?.name)
              .filter((name) => name !== undefined)
            return (
              <article className={`world-event-row technology-row${researched ? ' researched' : ''}`} key={technology.id}>
                <span className="queue-index" aria-hidden="true">{researched ? '✓' : '◇'}</span>
                <div className="technology-copy">
                  <strong>{technology.name}</strong>
                  <p>{technology.description}</p>
                  <div className="technology-cost">
                    <span>Chi phí nghiên cứu</span>
                    {technology.researchCost.map((cost) => (
                      <ItemStack key={cost.itemId} itemId={cost.itemId} quantity={cost.quantity} />
                    ))}
                  </div>
                  {prerequisites.length > 0 && <small className="technology-prerequisite">Tiên quyết: {prerequisites.join(' · ')}</small>}
                </div>
                <div className="technology-action">
                  <small>{researched ? 'Đã nghiên cứu' : issue ?? 'Sẵn sàng nghiên cứu'}</small>
                  {!researched && (
                    <button
                      className="gather-button"
                      type="button"
                      disabled={Boolean(issue)}
                      onClick={() => researchTechnology(technology.id)}
                    >
                      Nghiên cứu
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
        <p className="inventory-note">Khi ở đảo nhà, nghiên cứu dùng vật liệu trong hành trang và rương; cần đạt cấp độ và hoàn tất công nghệ tiên quyết. Công thức và đóng bè sẽ yêu cầu tri thức tương ứng.</p>
      </section>
    </div>
  )
}
