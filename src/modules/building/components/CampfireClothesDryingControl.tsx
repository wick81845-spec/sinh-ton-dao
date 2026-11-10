import { useGame } from '../../../app/providers/useGame'
import { getCampfireRemainingMs, isCampfireLitAt } from '../services/campfireService'
import { clothesDryingDurationMs, getClothesDryingRemainingMs } from '../services/clothesDryingService'

export function CampfireClothesDryingControl({ buildingId, now }: { buildingId: string; now: number }) {
  const { gameState, startDryingClothes } = useGame()
  if (!gameState) return null

  const drying = gameState.clothesDrying
  const isDryingHere = drying?.buildingId === buildingId && now < drying.completesAt
  const dryingElsewhere = Boolean(drying && now < drying.completesAt && drying.buildingId !== buildingId)
  const remainingDryingMs = getClothesDryingRemainingMs(gameState, now)
  const fireRemainingMs = getCampfireRemainingMs(gameState, buildingId, now)
  const fireReady = isCampfireLitAt(gameState, buildingId, now)
    && fireRemainingMs >= clothesDryingDurationMs
  const wetness = gameState.survival.wetness ?? 0

  return (
    <section className="campfire-quick-section" aria-label="Phơi quần áo">
      <div className="campfire-quick-section-heading">
        <div>
          <span className="section-kicker">CHĂM SÓC TRANG PHỤC</span>
          <h3>Phơi quần áo · 3 phút</h3>
        </div>
      </div>
      <p className="campfire-drying-status" role="status">
        {isDryingHere
          ? `Đang phơi quần áo cạnh lửa trại · còn ${Math.ceil(remainingDryingMs / 60_000)} phút`
          : dryingElsewhere
            ? `Quần áo đang được phơi tại lửa trại khác · còn ${Math.ceil(remainingDryingMs / 60_000)} phút`
            : wetness > 0
              ? `Độ ẩm quần áo: ${Math.round(wetness)}%. Lửa cần cháy liên tục đủ 3 phút.`
              : 'Quần áo đã khô.'}
      </p>
      {!isDryingHere && !dryingElsewhere && wetness > 0 && !fireReady && (
        <small className="activity-blocked">Hãy nhóm lửa hoặc thêm nhiên liệu để lửa cháy đủ 3 phút.</small>
      )}
      {!drying && (
        <button
          className="small-action"
          type="button"
          disabled={wetness <= 0 || !fireReady}
          onClick={() => startDryingClothes(buildingId)}
        >
          Bắt đầu phơi
        </button>
      )}
    </section>
  )
}
