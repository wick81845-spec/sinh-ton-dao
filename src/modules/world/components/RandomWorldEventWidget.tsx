import { useEffect, useState } from 'react'
import { useGame } from '../../../app/providers/useGame'
import { ItemStack } from '../../../shared/components/ItemArtwork'
import { gameClock } from '../../../services/clock/gameClock'
import { randomWorldEventDefinitions } from '../data/randomWorldEventDefinitions'
import { getRandomEventChoiceIssue } from '../services/randomWorldEventService'

const RESULT_DISPLAY_MS = 9_000

export function RandomWorldEventWidget() {
  const { gameState, resolveRandomWorldEvent } = useGame()
  const [now, setNow] = useState(gameClock.now())
  const [resolvedResult, setResolvedResult] = useState<{ eventId: string; title: string; message: string } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(gameClock.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!resolvedResult) return
    const timer = window.setTimeout(() => setResolvedResult(null), RESULT_DISPLAY_MS)
    return () => window.clearTimeout(timer)
  }, [resolvedResult])

  if (!gameState) return null

  const pendingEvent = (gameState.randomWorldEvents ?? []).find((record) => (
    record.status === 'pending'
      && record.locationId === gameState.character.currentLocationId
      && record.expiresAt > now
  ))
  const event = pendingEvent
    ? randomWorldEventDefinitions.find((definition) => definition.id === pendingEvent.eventId)
    : undefined

  if (!pendingEvent || !event) {
    if (!resolvedResult) return null
    const resultEvent = randomWorldEventDefinitions.find((definition) => definition.id === resolvedResult.eventId)
    return (
      <aside className="random-world-event-widget" aria-live="polite" role="status">
        <div className="random-world-event-card is-result">
          <div className="random-world-event-heading">
            <span className="random-world-event-icon" aria-hidden="true">{resultEvent?.icon ?? '✦'}</span>
            <div>
              <span className="section-kicker">KẾT QUẢ SỰ KIỆN</span>
              <h2>{resolvedResult.title}</h2>
            </div>
          </div>
          <p>{resolvedResult.message}</p>
        </div>
      </aside>
    )
  }

  const secondsRemaining = Math.max(0, Math.ceil((pendingEvent.expiresAt - now) / 1_000))

  return (
    <aside className="random-world-event-widget" aria-live="polite">
      <section className={`random-world-event-card rarity-${event.rarity}`} aria-labelledby="random-world-event-title">
        <header className="random-world-event-heading">
          <span className="random-world-event-icon" aria-hidden="true">{event.icon}</span>
          <div>
            <span className="section-kicker">SỰ KIỆN CÁ NHÂN · CÒN {secondsRemaining} GIÂY</span>
            <h2 id="random-world-event-title">{event.title}</h2>
          </div>
        </header>
        <p className="random-world-event-description">{event.description}</p>
        <p className="random-world-event-mystery">
          Hệ quả và phần thưởng được giữ bí mật cho đến khi bạn quyết định.
        </p>
        {event.choices.length > 0 && (
          <div className="random-world-event-choices">
            {event.choices.map((choice) => {
              const issue = getRandomEventChoiceIssue(gameState, event.id, choice)
              return (
                <article className="random-world-event-choice" key={choice.id}>
                  <div className="random-world-event-choice-copy">
                    <strong>{choice.label}</strong>
                    <div className="random-world-event-item-list" aria-label="Chi phí đã biết">
                      {(choice.costs ?? []).map((item) => (
                        <span className="random-world-event-cost" key={`cost-${item.itemId}`}>
                          <ItemStack itemId={item.itemId} quantity={item.quantity} />
                        </span>
                      ))}
                      {choice.coinCost ? <small>−{choice.coinCost} xu</small> : null}
                      {(choice.costs?.length ?? 0) === 0 && !choice.coinCost && (
                        <small>Không tốn vật phẩm hoặc xu</small>
                      )}
                    </div>
                    {issue && <small className="random-world-event-issue">{issue}</small>}
                  </div>
                  <button
                    className="random-world-event-select"
                    type="button"
                    disabled={Boolean(issue) || Boolean(gameState.activeCombat) || isResolving}
                    onClick={() => {
                      setIsResolving(true)
                      setActionError(null)
                      const result = resolveRandomWorldEvent(pendingEvent.id, choice.id)
                      if (result.ok) {
                        setResolvedResult({ eventId: event.id, title: event.title, message: result.message })
                      } else {
                        setActionError(result.message)
                      }
                      setIsResolving(false)
                    }}
                  >
                    Chọn
                  </button>
                </article>
              )
            })}
          </div>
        )}
        {actionError && <p className="random-world-event-issue" role="alert">{actionError}</p>}
      </section>
    </aside>
  )
}
