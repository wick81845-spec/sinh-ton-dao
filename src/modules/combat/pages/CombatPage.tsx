import { useGame } from '../../../app/providers/useGame'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { getIslandDefinition } from '../../world/data/worldDefinitions'
import { combatEncounters } from '../data/combatConfig'
import { getCombatAvailability } from '../services/combatService'

function getEncounterTypeLabel(type: 'pirate' | 'raid' | 'duel') {
  if (type === 'pirate') return 'GẶP CƯỚP BIỂN'
  if (type === 'raid') return 'ĐỘT KÍCH MÔ PHỎNG'
  return 'ĐẤU TẬP GIẢ LẬP'
}

function getOutcomeLabel(outcome: 'victory' | 'defeat' | 'retreated') {
  if (outcome === 'victory') return 'Chiến thắng'
  if (outcome === 'defeat') return 'Thất bại'
  return 'Đã rút lui'
}

export function CombatPage() {
  const {
    gameState,
    isLoading,
    error,
    startCombat,
    attackCombat,
    retreatCombat,
    respawnCharacter,
  } = useGame()

  if (isLoading) return <p className="page-state">Đang tải chiến trường…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const active = gameState.activeCombat
  const encounter = active && combatEncounters.find((entry) => entry.id === active.encounterId)
  const equippedItemId = gameState.equippedWeaponId
  const weaponId = (equippedItemId && itemDefinitions[equippedItemId].equipmentSlot === 'weapon'
    ? equippedItemId
    : undefined)
    ?? (gameState.inventory.slots.some((slot) => slot.itemId === 'item_wooden_axe') ? 'item_wooden_axe' : undefined)

  return (
    <div className="combat-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">ĐỐI ĐẦU · PHÒNG THỦ · NHẬT KÝ</span>
          <h1>Chiến đấu</h1>
          <p>Sát thương, chiến lợi phẩm và hồi sinh được xử lý bằng luật game mô phỏng.</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.survival.health}</strong> / 100 máu</div>
      </div>

      {gameState.character.status === 'dead' ? (
        <section className="death-panel" role="status">
          <span className="death-emblem" aria-hidden="true">✦</span>
          <span className="section-kicker">NHÂN VẬT ĐÃ GỤC NGÃ</span>
          <h2>Hành trình chưa kết thúc</h2>
          <p>Vật phẩm trong túi đã rơi tại trận chiến. Kho chứa ở đảo nhà vẫn an toàn.</p>
          {gameState.combatLog.at(-1)?.droppedItems.length ? (
            <div className="dropped-loot-list">
              {gameState.combatLog.at(-1)?.droppedItems.map((item) => (
                <ItemStack key={item.itemId} itemId={item.itemId} quantity={item.quantity} />
              ))}
            </div>
          ) : null}
          <button className="gather-button" type="button" onClick={respawnCharacter}>Hồi sinh tại đảo nhà</button>
        </section>
      ) : active && encounter ? (
        <section className="active-combat-panel" aria-live="polite">
          <div className="combatant-panel player-combatant">
            <span className="combatant-avatar">{gameState.character.name.slice(0, 1)}</span>
            <span className="section-kicker">BẠN</span>
            <h2>{gameState.character.name}</h2>
            <div className="combat-health-track" role="progressbar" aria-label="Máu của bạn" aria-valuenow={gameState.survival.health} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${gameState.survival.health}%` }} />
            </div>
            <strong>{gameState.survival.health} / 100 máu</strong>
          </div>
          <span className="combat-versus">VS</span>
          <div className="combatant-panel opponent-combatant">
            <span className="combatant-avatar">⚔</span>
            <span className="section-kicker">{getEncounterTypeLabel(encounter.type)}</span>
            <h2>{encounter.name}</h2>
            <div className="combat-health-track opponent-health-track" role="progressbar" aria-label="Máu đối thủ" aria-valuenow={active.opponentHealth} aria-valuemin={0} aria-valuemax={encounter.opponentHealth}>
              <span style={{ width: `${active.opponentHealth / encounter.opponentHealth * 100}%` }} />
            </div>
            <strong>{active.opponentHealth} / {encounter.opponentHealth} máu</strong>
          </div>
          <div className="combat-round-info">Lượt {active.rounds + 1} · Mỗi lượt đối thủ sẽ phản công nếu còn đứng vững.</div>
          <div className="combat-controls">
            <button className="gather-button" type="button" onClick={attackCombat}>Tấn công</button>
            <button className="small-action decline-action" type="button" onClick={retreatCombat}>Rút lui</button>
          </div>
        </section>
      ) : (
        <section className="combat-preparation">
          <div className="combat-preparation-heading">
            <span className="section-kicker">TRẠNG THÁI NHÂN VẬT</span>
            <p>{gameState.character.status === 'alive' ? 'Sẵn sàng chiến đấu' : 'Cần hồi sinh'}</p>
            <div className="activity-requirements">
              <span>Máu {gameState.survival.health} / 100</span>
              <span>
                Vũ khí: {weaponId
                  ? `${itemDefinitions[weaponId].name} (+${itemDefinitions[weaponId].weaponDamageBonus ?? 0} sát thương, độ bền ${gameState.itemDurability?.[weaponId] ?? itemDefinitions[weaponId].maxDurability})`
                  : 'Không trang bị (+12 sát thương)'}
              </span>
              {equippedItemId && itemDefinitions[equippedItemId].equipmentSlot !== 'weapon' && (
                <span>Dụng cụ đang ở ô trang bị: {itemDefinitions[equippedItemId].name} · không tăng sát thương</span>
              )}
              <span>Vị trí: {getIslandDefinition(gameState.character.currentLocationId)?.name ?? gameState.character.currentLocationId}</span>
            </div>
          </div>
          <div className="section-heading combat-section-heading">
            <div>
              <span className="section-kicker">ĐỐI THỦ TẠI ĐỊA ĐIỂM HIỆN TẠI</span>
              <h2>Chạm trán</h2>
            </div>
          </div>
          <div className="combat-encounter-grid">
            {combatEncounters.map((entry) => {
              const issue = getCombatAvailability(gameState, entry.id)
              return (
                <article className="combat-encounter-card" key={entry.id}>
                  <span className="building-emblem" aria-hidden="true">⚔</span>
                  <span className="section-kicker">{getEncounterTypeLabel(entry.type)}</span>
                  <h3>{entry.name}</h3>
                  <p>{entry.description}</p>
                  <div className="activity-requirements">
                    <span>{getIslandDefinition(entry.locationId)?.name ?? entry.locationId}</span>
                    <span>{entry.opponentHealth} máu</span>
                    <span>Phản công {entry.attackDamage}</span>
                    {entry.loot.map((loot) => (
                      <ItemStack key={loot.itemId} itemId={loot.itemId} quantity={loot.quantity} className="combat-loot-item" />
                    ))}
                  </div>
                  {issue && <small className="activity-blocked">{issue}</small>}
                  {entry.type === 'duel' && <small className="combat-disclaimer">Đấu tập mô phỏng; không gây thiệt hại cho hồ sơ khác.</small>}
                  <button className="gather-button building-action" type="button" disabled={Boolean(issue)} onClick={() => startCombat(entry.id)}>
                    {issue ? 'Chưa thể chiến đấu' : entry.type === 'raid' ? 'Bắt đầu đột kích' : 'Bắt đầu'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="combat-log-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">NHẬT KÝ CHIẾN ĐẤU &amp; ĐỘT KÍCH</span>
            <h2>Lịch sử</h2>
          </div>
        </div>
        {gameState.combatLog.length === 0
          ? <p className="empty-world-log">Chưa có trận chiến nào được ghi lại.</p>
          : (
            <div className="world-event-list">
              {gameState.combatLog.slice().reverse().map((entry) => (
                <article className="world-event-row combat-log-row" key={entry.id}>
                  <span className="queue-index">{entry.outcome === 'victory' ? '✓' : entry.outcome === 'defeat' ? '!' : '↩'}</span>
                  <div>
                    <strong>{entry.opponentName} · {getOutcomeLabel(entry.outcome)}</strong>
                    <p>{getEncounterTypeLabel(entry.encounterType)} · {entry.rounds} lượt · {getIslandDefinition(entry.locationId)?.name ?? entry.locationId}</p>
                    {entry.droppedItems.length > 0 && (
                      <div className="item-stack-list">
                        <strong>Rơi:</strong>
                        {entry.droppedItems.map((item) => <ItemStack key={item.itemId} itemId={item.itemId} quantity={item.quantity} />)}
                      </div>
                    )}
                  </div>
                  {entry.loot.length > 0 && (
                    <div className="item-stack-list">
                      <strong>Nhận:</strong>
                      {entry.loot.map((item) => <ItemStack key={item.itemId} itemId={item.itemId} quantity={item.quantity} />)}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
      </section>
      <p className="inventory-note">Đây là chiến đấu giả lập cục bộ. Trong multiplayer thật, máy chủ phải quyết định trận đấu và quyền sở hữu vật phẩm.</p>
    </div>
  )
}
