import { useAuth } from '../../../app/providers/useAuth'
import { useWorldPresence } from '../../../app/providers/useWorldPresence'

export function SocialPage() {
  const { session } = useAuth()
  const { status, players, maxPlayers, error } = useWorldPresence()

  return (
    <div className="social-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">THẾ GIỚI CHUNG</span>
          <h1>Cộng đồng</h1>
          <p>Người chơi đã đăng nhập sẽ cùng xuất hiện trong thế giới chung; mỗi tài khoản có nhân vật, save và đảo nhà riêng.</p>
        </div>
        <div className="stamina-chip">TỐI ĐA 20 NGƯỜI</div>
      </div>

      <section className="social-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">HIỆN DIỆN TRONG THẾ GIỚI</span>
            <h2>Người chơi đang online</h2>
          </div>
          <span className="social-count">{players.length} / {maxPlayers}</span>
        </div>
        {status === 'connecting' && <p className="empty-world-log">Đang kết nối với thế giới chung…</p>}
        {!session && <p className="empty-world-log">Đăng nhập để vào thế giới và xem những người đang online.</p>}
        {status === 'full' && <p className="world-presence-note" role="alert">{error} Bạn vẫn có thể chơi phần lưu cục bộ; chỗ online sẽ mở khi có người rời hoặc hết hạn kết nối.</p>}
        {status === 'unavailable' && <p className="world-presence-note" role="alert">{error}</p>}
        {session && status === 'online' && players.length === 0 && (
          <p className="empty-world-log">Chưa có người chơi nào online.</p>
        )}
        {session && (status === 'online' || status === 'full') && players.length > 0 && (
          <div className="world-player-list">
            {players.map((player) => (
              <article className="world-player-row" key={player.id}>
                <span className="character-avatar social-avatar" aria-hidden="true">{player.displayName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{player.displayName}{player.id === session.user.id && ' (bạn)'}</strong>
                  <small>Đảo nhà riêng · {player.islandName}</small>
                </div>
                <span className="social-presence online"><i />Đang hoạt động</span>
              </article>
            ))}
          </div>
        )}
        <p className="world-presence-note">Hiện tại danh sách online và giới hạn 20 chỗ được đồng bộ qua máy chủ. Hoạt động như thăm đảo, cùng thám hiểm, chiến đấu và giao dịch giữa người chơi chưa được nối multiplayer.</p>
      </section>
    </div>
  )
}
