import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../../../app/providers/useGame'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { gameClock } from '../../../services/clock/gameClock'
import { getIslandDefinition, islandDefinitions, worldEventDefinitions, worldLocations } from '../../world/data/worldDefinitions'
import { randomWorldEventDefinitions } from '../../world/data/randomWorldEventDefinitions'
import { explorationTasks, wildlifeObservationTasks } from '../data/explorationConfig'
import { getExplorationAvailability } from '../services/explorationService'
import { speciesDefinitionsById } from '../../ecology/data/ecologyDefinitions'

export function ExplorationPage() {
  const { gameState, isLoading, error, startExploration } = useGame()
  const [now, setNow] = useState(gameClock.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  if (isLoading) return <p className="page-state">Đang tải nhiệm vụ thám hiểm…</p>
  if (!gameState) return <p className="page-state error-state" role="alert">{error ?? 'Chưa có dữ liệu trò chơi.'}</p>

  const active = gameState.activeExploration
  const activeTask = active && explorationTasks.find((task) => task.id === active.taskId)
  const progress = active
    ? Math.max(0, Math.min(100, ((now - active.startedAt) / (active.completesAt - active.startedAt)) * 100))
    : 0
  const secondsRemaining = active ? Math.max(0, Math.ceil((active.completesAt - now) / 1000)) : 0
  const currentIsland = getIslandDefinition(gameState.character.currentLocationId)
  const discoveryTask = explorationTasks.find((task) => task.id === 'survey-nearby-island')
  const islandTask = currentIsland
    ? explorationTasks.find((task) => task.id === `explore-island-${currentIsland.id}`)
    : undefined
  const discoveryIssue = discoveryTask
    ? getExplorationAvailability(gameState, discoveryTask.id)
    : 'Nhiệm vụ dò tìm đảo chưa được cấu hình.'
  const islandTaskIssue = islandTask
    ? getExplorationAvailability(gameState, islandTask.id)
    : 'Chưa có nhiệm vụ khám phá cho hòn đảo này.'
  const undiscoveredIslandCount = islandDefinitions.filter((island) => (
    island.id !== gameState.character.currentLocationId
      && !gameState.discoveredIslandIds.includes(island.id)
  )).length
  const randomEvents = gameState.randomWorldEvents ?? []
  const completedTaskIds = new Set(gameState.explorationLog.map((entry) => entry.taskId))
  const availableObservationTasks = wildlifeObservationTasks.filter((task) => (
    task.locationId === gameState.character.currentLocationId
      && !completedTaskIds.has(task.id)
  ))
  const observedSpecies = gameState.explorationLog
    .filter((entry) => entry.locationId === gameState.character.currentLocationId && entry.observedSpeciesId)
    .map((entry) => entry.observedSpeciesId
      ? speciesDefinitionsById[entry.observedSpeciesId]
      : undefined)
    .filter((species) => species !== undefined)

  return (
    <div className="exploration-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">KHÁM PHÁ · TÌM ĐỊA ĐIỂM MỚI</span>
          <h1>Thám hiểm</h1>
          <p>Khám phá địa điểm, nhận phần thưởng và ghi lại sự kiện trên hành trình.</p>
        </div>
        <Link className="stamina-chip exploration-link" to="/voyage"><strong>≈</strong> Lập chuyến đi</Link>
      </div>

      <section className="world-current-location">
        <div className="building-emblem" aria-hidden="true">⌖</div>
        <div>
          <span className="section-kicker">ĐANG Ở</span>
          <h2>{currentIsland?.name ?? gameState.character.currentLocationId}</h2>
          <p>{worldLocations.find((location) => location.islandId === gameState.character.currentLocationId)?.name}</p>
        </div>
        <div className="stamina-chip"><strong>{gameState.survival.stamina.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}%</strong> thể lực</div>
      </section>

      {active && activeTask && (
        <section className="gathering-progress" aria-live="polite">
          <div className="progress-heading">
            <div>
              <span className="section-kicker">ĐANG THÁM HIỂM</span>
              <h2>{activeTask.name}</h2>
            </div>
            <span className="crafting-time">{secondsRemaining > 0 ? `Còn ${secondsRemaining} giây` : 'Đang ghi nhận kết quả…'}</span>
          </div>
          <div className="gathering-progress-track" role="progressbar" aria-label="Tiến độ thám hiểm" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-footer"><span>ϟ {activeTask.staminaCost} thể lực</span><span>{Math.floor(progress)}%</span></div>
        </section>
      )}

      {discoveryTask && (
        <section className="exploration-task-list" aria-label="Dò tìm đảo ngoài khơi">
          <article className="exploration-task">
            <div className="node-icon" aria-hidden="true">⌖</div>
            <div className="gathering-activity-copy">
              <span className="section-kicker">DÒ TÌM NGOÀI KHƠI · CÓ THỂ THỰC HIỆN Ở MỌI ĐẢO</span>
              <h3>{discoveryTask.name}</h3>
              <p>Quan sát đường chân trời để tìm một hòn đảo chưa được ghi nhận. Thứ tự phát hiện được tạo riêng cho hành trình của bạn.</p>
              <div className="activity-requirements">
                <span>{discoveryTask.durationSeconds} giây</span>
                <span>ϟ {discoveryTask.staminaCost}</span>
                <span>Còn {undiscoveredIslandCount} đảo chưa phát hiện</span>
              </div>
              {discoveryIssue && <small className="activity-blocked">{discoveryIssue}</small>}
            </div>
            <button
              className="gather-button"
              type="button"
              disabled={Boolean(discoveryIssue)}
              onClick={() => startExploration(discoveryTask.id)}
            >
              Dò tìm đảo
            </button>
          </article>
        </section>
      )}

      {islandTask && (
        <>
          <div className="section-heading exploration-section-heading">
            <div>
              <span className="section-kicker">ĐANG ĐẶT CHÂN ĐẾN</span>
              <h2>Khám phá hòn đảo này</h2>
            </div>
          </div>
          <section className="exploration-task-list">
            <article className="exploration-task">
              <div className="node-icon" aria-hidden="true">◈</div>
              <div className="gathering-activity-copy">
                <span className="section-kicker">{currentIsland?.name}</span>
                <h3>{islandTask.name}</h3>
                <p>{islandTask.description}</p>
                <div className="activity-requirements">
                  <span>{islandTask.durationSeconds} giây</span>
                  <span>ϟ {islandTask.staminaCost}</span>
                </div>
                {islandTaskIssue && <small className="activity-blocked">{islandTaskIssue}</small>}
              </div>
              <button
                className="gather-button"
                type="button"
                disabled={Boolean(islandTaskIssue)}
                onClick={() => startExploration(islandTask.id)}
              >
                Khám phá đảo
              </button>
            </article>
          </section>
        </>
      )}

      <div className="section-heading exploration-section-heading">
        <div>
          <span className="section-kicker">ĐỊA ĐIỂM ĐÃ PHÁT HIỆN</span>
          <h2>Nhiệm vụ khả dụng</h2>
        </div>
      </div>
      <section className="exploration-task-list">
        {explorationTasks.filter((task) => (
          !task.observedSpeciesId
            && task.id !== 'survey-nearby-island'
            && !task.id.startsWith('survey-island-')
            && !task.id.startsWith('explore-island-')
        )).map((task) => {
          const taskIsland = getIslandDefinition(task.locationId)
          if (!taskIsland || !gameState.discoveredIslandIds.includes(taskIsland.id)) return null
          const issue = getExplorationAvailability(gameState, task.id)
          const event = task.worldEventId
            ? worldEventDefinitions.find((entry) => entry.id === task.worldEventId)
            : undefined
          return (
            <article className="exploration-task" key={task.id}>
              <div className="node-icon" aria-hidden="true">⌖</div>
              <div className="gathering-activity-copy">
                <span className="section-kicker">{taskIsland.name}</span>
                <h3>{task.name}</h3>
                <p>{task.description}</p>
                <div className="activity-requirements">
                  <span>{task.durationSeconds} giây</span>
                  <span>ϟ {task.staminaCost}</span>
                  {task.rewards.map((reward) => (
                    <ItemStack key={reward.itemId} itemId={reward.itemId} quantity={reward.quantity} />
                  ))}
                  {task.discoveredIslandIds.map((islandId) => (
                    <span key={islandId}>Mở khóa: {getIslandDefinition(islandId)?.name ?? islandId}</span>
                  ))}
                  {event && <span>Sự kiện: {event.title}</span>}
                </div>
                {issue && <small className="activity-blocked">{issue}</small>}
              </div>
              <button
                className="gather-button"
                type="button"
                disabled={Boolean(issue)}
                onClick={() => startExploration(task.id)}
              >
                {issue ? 'Chưa thể' : 'Thám hiểm'}
              </button>
            </article>
          )
        })}
      </section>

      <section className="wildlife-observation-section">
        <div className="section-heading exploration-section-heading">
          <div>
            <span className="section-kicker">THÚ HOANG · QUAN SÁT KHÔNG XÂM HẠI</span>
            <h2>Theo dấu quanh đảo</h2>
          </div>
          <span className="stamina-chip">{observedSpecies.length} loài đã ghi nhận</span>
        </div>
        <p className="wildlife-observation-intro">
          Lần theo dấu chân, tiếng kêu và vệt lá để nhận diện động vật. Hoạt động này chỉ quan sát, không săn bắt hay làm hại chúng.
        </p>
        {observedSpecies.length > 0 && (
          <div className="wildlife-observed-list" aria-label="Các loài đã ghi nhận">
            {observedSpecies.map((species) => (
              <span className="wildlife-observed-chip" key={species.id}>
                <span aria-hidden="true">🐾</span>{species.name}
                {species.protected && <small>Được bảo vệ</small>}
              </span>
            ))}
          </div>
        )}
        {availableObservationTasks.length > 0 ? (
          <section className="exploration-task-list wildlife-observation-list">
            {availableObservationTasks.map((task) => {
              const issue = getExplorationAvailability(gameState, task.id)
              return (
                <article className="exploration-task wildlife-observation-task" key={task.id}>
                  <div className="node-icon" aria-hidden="true">🐾</div>
                  <div className="gathering-activity-copy">
                    <span className="section-kicker">{currentIsland?.name ?? task.locationId}</span>
                    <h3>{task.name}</h3>
                    <p>{task.description}</p>
                    <div className="activity-requirements">
                      <span>{task.durationSeconds} giây</span>
                      <span>ϟ {task.staminaCost}</span>
                    </div>
                    {issue && <small className="activity-blocked">{issue}</small>}
                  </div>
                  <button
                    className="gather-button"
                    type="button"
                    disabled={Boolean(issue)}
                    onClick={() => startExploration(task.id)}
                  >
                    {issue ? 'Chưa thể' : 'Theo dấu'}
                  </button>
                </article>
              )
            })}
          </section>
        ) : (
          <p className="empty-world-log">
            {observedSpecies.length > 0
              ? 'Bạn đã ghi nhận các dấu vết hiện có trên hòn đảo này.'
              : 'Chưa có dấu vết động vật phù hợp tại địa điểm này.'}
          </p>
        )}
      </section>

      <section className="exploration-log-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">LỰA CHỌN VÀ HỆ QUẢ</span>
            <h2>Nhật ký sự kiện ngẫu nhiên</h2>
          </div>
        </div>
        {randomEvents.filter((record) => record.status !== 'pending').length === 0
          ? <p className="empty-world-log">Những quyết định của bạn sẽ được ghi lại tại đây.</p>
          : (
            <div className="world-event-list">
              {randomEvents.filter((record) => record.status !== 'pending').slice().reverse().slice(0, 5).map((record) => {
                const event = randomWorldEventDefinitions.find((entry) => entry.id === record.eventId)
                const island = getIslandDefinition(record.locationId)
                return (
                  <article className="world-event-row" key={record.id}>
                    <span className="queue-index">{record.status === 'expired' ? '⌛' : '✦'}</span>
                    <div>
                      <strong>{event?.title ?? 'Sự kiện ngoài khơi'}</strong>
                      <p>{record.outcome ?? 'Sự kiện đã kết thúc mà không có lựa chọn.'}</p>
                    </div>
                    <small>{island?.name ?? record.locationId}</small>
                  </article>
                )
              })}
            </div>
          )}
      </section>

      <section className="exploration-log-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">HỒ SƠ KHÁM PHÁ</span>
            <h2>Nhật ký thám hiểm</h2>
          </div>
        </div>
        {gameState.explorationLog.length === 0
          ? <p className="empty-world-log">Chưa có chuyến thám hiểm nào được ghi lại.</p>
          : (
            <div className="world-event-list">
              {gameState.explorationLog.slice().reverse().map((entry) => {
                const task = explorationTasks.find((item) => item.id === entry.taskId)
                const island = getIslandDefinition(entry.locationId)
                const event = entry.worldEventId
                  ? worldEventDefinitions.find((item) => item.id === entry.worldEventId)
                  : undefined
                const species = entry.observedSpeciesId
                  ? speciesDefinitionsById[entry.observedSpeciesId]
                  : undefined
                return (
                  <article className="world-event-row" key={entry.id}>
                    <span className="queue-index">{species ? '🐾' : '✓'}</span>
                    <div>
                      <strong>{species ? `Đã ghi nhận ${species.name}` : task?.name ?? 'Nhiệm vụ thám hiểm'}</strong>
                      <p>{species ? `Quan sát tại ${island?.name ?? entry.locationId}` : event?.title ?? island?.name ?? entry.locationId}</p>
                    </div>
                    <span className="item-stack-list">
                      {entry.rewards.length > 0
                        ? entry.rewards.map((reward) => <ItemStack key={reward.itemId} itemId={reward.itemId} quantity={reward.quantity} />)
                        : <small>Không có vật phẩm</small>}
                    </span>
                  </article>
                )
              })}
            </div>
          )}
      </section>
    </div>
  )
}
