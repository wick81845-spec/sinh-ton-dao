import { useGame } from '../../../app/providers/useGame'
import { BodyStatusPanel } from '../../survival/components/BodyStatusPanel'
import { getCurrentWeather } from '../../world/services/weatherService'
import { getIslandDefinition } from '../../world/data/worldDefinitions'

export function CharacterPage() {
  const { gameState, isLoading, error } = useGame()

  if (isLoading) return <p className="page-state">Đang tải hồ sơ nhân vật…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu nhân vật.'}</p>

  const { character } = gameState
  const homeIsland = getIslandDefinition(character.homeIslandId)
  const currentIsland = getIslandDefinition(character.currentLocationId)

  return (
    <div className="character-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">HỒ SƠ NGƯỜI SỐNG SÓT</span>
          <h1>Nhân vật</h1>
          <p>Thông tin cơ bản và nơi bắt đầu hành trình của bạn.</p>
        </div>
      </div>

      <section className="character-card">
        <div className="character-avatar">{character.name.slice(0, 1).toLocaleUpperCase('vi-VN')}</div>
        <div className="character-identity">
          <span className="section-kicker">CẤP {String(character.level).padStart(2, '0')} · TÂN THỦ</span>
          <h2>{character.name}</h2>
          <p>{character.status === 'alive' ? 'Đang sống' : 'Đã ngã xuống'}</p>
        </div>
        <div className="character-experience">
          <span className="section-kicker">KINH NGHIỆM</span>
          <strong>{character.experience} XP</strong>
          <span className="experience-track"><i style={{ width: `${Math.min(character.experience, 100)}%` }} /></span>
        </div>
      </section>

      <BodyStatusPanel
        stats={gameState.survival}
        characterName={character.name}
        appearance={character.appearance ?? 'male'}
        weather={getCurrentWeather(gameState)}
      />

      <section className="character-details">
        <article className="detail-card">
          <span className="section-kicker">ĐẢO NHÀ</span>
          <h2>{character.homeIslandName ?? homeIsland?.name ?? character.homeIslandId}</h2>
          <p>Mã đảo: {character.homeIslandId}</p>
        </article>
        <article className="detail-card">
          <span className="section-kicker">VỊ TRÍ HIỆN TẠI</span>
          <h2>{character.currentLocationId === character.homeIslandId
            ? character.homeIslandName ?? homeIsland?.name ?? character.currentLocationId
            : currentIsland?.name ?? character.currentLocationId}</h2>
          <p>Mã địa điểm: {character.currentLocationId}</p>
        </article>
        <article className="detail-card">
          <span className="section-kicker">THAM GIA HÀNH TRÌNH</span>
          <h2>{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(character.createdAt))}</h2>
          <p>Hồ sơ được quản lý riêng với chỉ số sinh tồn.</p>
        </article>
      </section>
    </div>
  )
}
