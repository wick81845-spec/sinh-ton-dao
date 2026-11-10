import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { ItemArtwork } from '../../../shared/components/ItemArtwork'
import { PixelFxEffect } from '../../../shared/components/PixelFxEffect'
import * as waterSplash from 'pixelfx/fx/water/splash'
import { itemDefinitions } from '../../../data/items/itemDefinitions'
import type { ItemId } from '../../../shared/types/game'
import type { FishDefinition, FishFightProfile, FishMeasurement } from '../data/fishingConfig'
import {
  getFishFightProfile,
  getFishingSkillCastPower,
  rollFishingCatch,
  type FishingMethod,
  type FishingCatch,
} from '../data/fishingConfig'
import { getFishingLootDefinition, type FishingLootEntry } from '../../../data/items/fishingLootCatalog'
import type { FishingActionResult } from '../../../app/providers/gameContext'
import { gameClock } from '../../../services/clock/gameClock'
import type { FishingRodDefinition } from '../../../data/items/fishingRodCatalog'

interface FishingMinigameProps {
  startedAt: number
  fishingSkillLevel: number
  sceneImage: string
  sceneName: string
  method: FishingMethod
  staminaCost: number
  fishPool: FishDefinition[]
  lootPool: FishingLootEntry[]
  rod?: FishingRodDefinition & { durability: number }
  onFinish(castPower: number, caughtItemId: ItemId): FishingActionResult
  onCancel(): void
  onCaught(itemId: ItemId): void
  onEscaped(reason?: 'rod-damaged'): void
}

function getBiteDelay(startedAt: number): number {
  return 2_400 + (Math.abs(Math.floor(startedAt / 13)) % 2_400)
}

type FishingPhase = 'casting' | 'waiting' | 'bite' | 'hooked' | 'escaped' | 'caught'

function FishingScene({
  phase,
  fighting,
  image,
  name,
  fightProfile,
  catchKind,
  method,
  rod,
}: {
  phase: FishingPhase
  fighting: boolean
  image: string
  name: string
  fightProfile: FishFightProfile | null
  catchKind: FishingCatch['kind'] | null
  method: FishingMethod
  rod?: FishingRodDefinition & { durability: number }
}) {
  return (
    <div className={`fishing-scene fishing-scene-${phase}${fightProfile ? ` fish-${fightProfile.movement}` : ''}${fighting ? ' is-fighting' : ''}`}>
      <img className="fishing-landscape" src={image} alt={name} />
      <div className="fishing-scene-shade" />
      <div className="fishing-scene-label">
        <span className="fishing-scene-dot" />
        {phase === 'casting'
          ? name
          : phase === 'waiting'
            ? method === 'spear' ? 'Đang quan sát cá gần bờ' : 'Mồi câu đang trôi trên mặt nước'
            : phase === 'bite'
            ? catchKind === 'fish'
            ? method === 'spear' ? 'Cá xuất hiện — phóng lao!' : 'Phao chìm — cá cắn câu!'
              : catchKind === 'trash'
                ? 'Phao chìm — có rác mắc câu!'
                : 'Phao chìm — có vật phẩm mắc câu!'
            : fighting ? `${fightProfile?.label ?? 'Cá'} đang vùng vẫy!` : 'Cá đã cắn câu!'}
      </div>
      <div className="fishing-current-rod">
        {method === 'spear'
          ? <span aria-hidden="true">↗</span>
          : <img src={rod?.image ?? '/assets/fishing/rods/rod-1.png'} alt="" />}
        <span>{method === 'spear' ? 'Lao đánh cá' : rod?.name ?? 'Cần câu'}</span>
      </div>
    </div>
  )
}

export function FishingMinigame({
  startedAt,
  fishingSkillLevel,
  sceneImage,
  sceneName,
  method,
  staminaCost,
  fishPool,
  lootPool,
  rod,
  onFinish,
  onCancel,
  onCaught,
  onEscaped,
}: FishingMinigameProps) {
  const [now, setNow] = useState(gameClock.now())
  const [phase, setPhase] = useState<FishingPhase>('casting')
  const [isFighting, setIsFighting] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [castPower, setCastPower] = useState(0)
  const [tension, setTension] = useState(12)
  const [progress, setProgress] = useState(0)
  const [fishStamina, setFishStamina] = useState(100)
  const [fightProfile, setFightProfile] = useState<FishFightProfile | null>(null)
  const [catchKind, setCatchKind] = useState<FishingCatch['kind'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const phaseRef = useRef<FishingPhase>('casting')
  const holdingRef = useRef(false)
  const finishStartedRef = useRef(false)
  const castPowerRef = useRef(0)
  const tensionRef = useRef(12)
  const progressRef = useRef(0)
  const fishStaminaRef = useRef(100)
  const fightProfileRef = useRef<FishFightProfile | null>(null)
  const caughtItemRef = useRef<FishingCatch | null>(null)
  const castAtRef = useRef<number | null>(null)
  const hookedAtRef = useRef<number | null>(null)
  const onFinishRef = useRef(onFinish)
  const onCaughtRef = useRef(onCaught)
  const onEscapedRef = useRef(onEscaped)

  useEffect(() => {
    onFinishRef.current = onFinish
    onCaughtRef.current = onCaught
    onEscapedRef.current = onEscaped
  }, [onCaught, onEscaped, onFinish])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = gameClock.now()
      setNow(currentTime)
      const elapsed = currentTime - startedAt

      if (elapsed >= 45_000
        && (phaseRef.current === 'casting'
          || phaseRef.current === 'waiting'
          || phaseRef.current === 'bite'
          || phaseRef.current === 'hooked')) {
        phaseRef.current = 'escaped'
        setError(method === 'spear' ? 'Cá đã bơi khỏi tầm bắt.' : 'Thứ mắc câu đã trôi mất.')
        onEscapedRef.current()
        return
      }

      if (phaseRef.current === 'casting') {
        if (holdingRef.current) {
          castPowerRef.current = Math.min(100, castPowerRef.current + 2.6)
          setCastPower(castPowerRef.current)
        }
        return
      }
      if (phaseRef.current === 'waiting' && castAtRef.current !== null) {
        if (currentTime >= castAtRef.current + getBiteDelay(startedAt)) {
          phaseRef.current = 'bite'
          setPhase('bite')
        }
        return
      }
      if (phaseRef.current === 'bite') {
        if (castAtRef.current !== null && currentTime - castAtRef.current - getBiteDelay(startedAt) > 850) {
          phaseRef.current = 'escaped'
          setError(method === 'spear' ? 'Bạn phóng lao chậm quá, cá đã bơi mất.' : 'Bạn giật cần chậm quá, cá đã nhả mồi.')
          onEscapedRef.current()
        }
        return
      }
      if (phaseRef.current !== 'hooked' || finishStartedRef.current) return

      const profile = fightProfileRef.current
      if (!profile) return
      const hookedElapsed = currentTime - (hookedAtRef.current ?? currentTime)
      const cyclePosition = hookedElapsed % profile.fightCycleMs
      const fighting = cyclePosition >= profile.fightCycleMs - profile.fightDurationMs
      setIsFighting(fighting)
      const rodTensionScale = method === 'rod' ? 1 - (rod?.tensionResistance ?? 0) : 1
      const rodReelSpeed = method === 'rod' ? rod?.reelSpeed ?? 1 : 1
      const fishStrength = profile.force * (0.65 + fishStaminaRef.current / 100 * 0.55)

      if (holdingRef.current) {
        tensionRef.current += fighting ? 5.2 * fishStrength * rodTensionScale : 0.75 * profile.force
        if (!fighting) {
          const tiredFishBonus = 1 + (1 - fishStaminaRef.current / 100) * 0.3
          progressRef.current += 1.8 * profile.reelSpeed * rodReelSpeed * tiredFishBonus
          fishStaminaRef.current = Math.max(0, fishStaminaRef.current - 0.04)
        } else if (fishStaminaRef.current <= 15) {
          progressRef.current += 0.45 * profile.reelSpeed * rodReelSpeed
        }
      } else {
        tensionRef.current -= fighting ? 4.7 * (0.8 + profile.force * 0.2) : 1.1
        if (fighting) {
          progressRef.current = Math.max(0, progressRef.current - 0.08 * profile.force)
          fishStaminaRef.current = Math.max(0, fishStaminaRef.current - profile.tireRate * 0.1)
        }
      }
      tensionRef.current = Math.max(0, Math.min(100, tensionRef.current))
      progressRef.current = Math.max(0, Math.min(100, progressRef.current))
      setFishStamina(fishStaminaRef.current)
      setTension(tensionRef.current)
      setProgress(progressRef.current)

      if (tensionRef.current >= 100) {
        phaseRef.current = 'escaped'
        setError(method === 'spear' ? 'Cá vùng vẫy thoát khỏi mũi lao!' : 'Dây câu đứt mất rồi! Cá đã thoát.')
        onEscapedRef.current(method === 'rod' && Math.random() < 0.45 ? 'rod-damaged' : undefined)
        return
      }
      if (progressRef.current >= 100) {
        finishStartedRef.current = true
        const caughtItem = caughtItemRef.current
        if (!caughtItem || caughtItem.kind !== 'fish') {
          finishStartedRef.current = false
          setError('Chưa xác định được thứ đang mắc câu.')
          return
        }
        const result = onFinishRef.current(castPowerRef.current, caughtItem.itemId)
        if (result.ok) {
          phaseRef.current = 'caught'
          onCaughtRef.current(result.itemId)
        } else {
          finishStartedRef.current = false
          setError(result.message)
          progressRef.current = 80
          setProgress(80)
        }
      }
    }, 100)

    return () => window.clearInterval(timer)
  }, [method, rod?.reelSpeed, rod?.tensionResistance, startedAt])

  function finishCatch(itemId: ItemId) {
    if (finishStartedRef.current) return
    finishStartedRef.current = true
    const result = onFinishRef.current(castPowerRef.current, itemId)
    if (result.ok) {
      phaseRef.current = 'caught'
      onCaughtRef.current(result.itemId)
    } else {
      finishStartedRef.current = false
      setError(result.message)
      phaseRef.current = 'bite'
      setPhase('bite')
    }
  }

  function hookFish() {
    if (phaseRef.current !== 'bite') return
    const caughtItem = caughtItemRef.current
    if (!caughtItem) {
      setError('Chưa xác định được thứ đang mắc câu.')
      return
    }
    if (caughtItem.kind !== 'fish') {
      phaseRef.current = 'hooked'
      finishCatch(caughtItem.itemId)
      return
    }
    phaseRef.current = 'hooked'
    hookedAtRef.current = gameClock.now()
    setPhase('hooked')
    setError(null)
    if (fightProfileRef.current) setFightProfile(fightProfileRef.current)
  }

  function castLine() {
    if (phaseRef.current !== 'casting') return
    holdingRef.current = false
    setIsHolding(false)
    if (castPowerRef.current < 12) {
      setError('Hãy giữ cần lâu hơn một chút để ném mồi ra xa.')
      castPowerRef.current = 0
      setCastPower(0)
      return
    }
    const caughtItem = rollFishingCatch(
      fishPool,
      lootPool,
      Math.random(),
      Math.random(),
      getFishingSkillCastPower(castPowerRef.current, fishingSkillLevel),
    )
    if (!caughtItem) {
      setError('Vùng biển này hiện chưa có cá hay vật phẩm nào có thể câu.')
      castPowerRef.current = 0
      setCastPower(0)
      return
    }
    caughtItemRef.current = caughtItem
    if (caughtItem.kind === 'fish') {
      const fish = fishPool.find((entry) => entry.itemId === caughtItem.itemId)
      if (!fish) {
        setError('Không thể xác định loài cá đang cắn câu.')
        return
      }
      fightProfileRef.current = getFishFightProfile(fish.rarity, fishingSkillLevel)
    } else {
      fightProfileRef.current = null
    }
    setCatchKind(caughtItem.kind)
    setFightProfile(fightProfileRef.current)
    fishStaminaRef.current = 100
    setFishStamina(100)
    phaseRef.current = 'waiting'
    castAtRef.current = gameClock.now()
    setPhase('waiting')
    setError(null)
  }

  function startControl(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (phaseRef.current === 'bite') {
      hookFish()
      return
    }
    if (phaseRef.current !== 'casting' && phaseRef.current !== 'hooked') return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    holdingRef.current = true
    setIsHolding(true)
  }

  function stopControl() {
    if (phaseRef.current === 'casting' && holdingRef.current) {
      castLine()
      return
    }
    holdingRef.current = false
    setIsHolding(false)
  }

  function startControlByKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return
    event.preventDefault()
    if (event.repeat) return
    if (phaseRef.current === 'bite') {
      hookFish()
      return
    }
    if (phaseRef.current === 'casting' || phaseRef.current === 'hooked') {
      holdingRef.current = true
      setIsHolding(true)
    }
  }

  return (
    <section className="fishing-game-panel" aria-live="polite">
      <div className="fishing-game-heading">
        <div>
          <span className="section-kicker">
            {method === 'spear'
              ? 'ĐÁNH CÁ BẰNG LAO · CHỈ BẮT CÁ NHỎ Ở VÙNG VEN BỜ VÀ RẠN SAN HÔ'
              : `KỸ NĂNG THU THẬP CẤP ${fishingSkillLevel} · ${rod?.name ?? 'Cần câu'} · ĐỘ BỀN ${rod?.durability ?? 0}/${rod?.maxDurability ?? 0}`}
          </span>
          <h2>{phase === 'casting'
            ? method === 'spear' ? 'Lấy đà phóng lao' : 'Lấy đà ném mồi'
            : phase === 'waiting'
              ? method === 'spear' ? 'Canh cá ven bờ' : 'Canh phao'
              : phase === 'bite'
                ? catchKind === 'fish'
                  ? method === 'spear' ? 'Cá nhỏ xuất hiện!' : 'Cá cắn câu!'
                  : catchKind === 'trash'
                    ? 'Mắc rác biển!'
                    : 'Mắc vật phẩm!'
                : 'Giữ dây, kéo cá'}</h2>
        </div>
        <button className="small-action cancel-action" type="button" onClick={onCancel}>Bỏ câu</button>
      </div>

      <FishingScene
        phase={phase}
        fighting={isFighting}
        image={sceneImage}
        name={sceneName}
        fightProfile={fightProfile}
        catchKind={catchKind}
        method={method}
        rod={rod}
      />

      <div className="fishing-game-status">
        <strong>{phase === 'casting'
          ? method === 'spear'
            ? 'Nhấn giữ để lấy đà, nhả tay để phóng lao.'
            : 'Nhấn giữ để tích lực, nhả tay để ném mồi.'
          : phase === 'waiting'
            ? method === 'spear' ? 'Quan sát mặt nước, phóng lao khi cá lộ diện.' : 'Mồi đã rơi xuống nước — chờ tín hiệu phao.'
            : phase === 'bite'
              ? catchKind === 'fish'
                ? method === 'spear' ? 'Nhấn ngay để phóng lao trúng cá!' : 'Nhấn ngay để giật cần và móc cá!'
                : catchKind === 'trash'
                  ? 'Nhấn ngay để kéo rác lên khỏi biển!'
                  : 'Nhấn ngay để trục vớt vật phẩm!'
              : isFighting
                ? `${fightProfile?.description ?? 'Cá đang kéo mạnh.'} Nhả nút để dây chùng bớt!`
                : fishStamina <= 15
                  ? 'Cá đã kiệt sức — tranh thủ kéo vào bờ!'
                  : 'Cá dịu lại — nhấn giữ để kéo vào bờ.'}</strong>
        <span>{phase === 'casting'
          ? `Lực ném ${Math.floor(castPower)}%`
          : phase === 'waiting'
            ? 'Đừng rời mắt khỏi phao.'
            : phase === 'bite'
              ? 'Chỉ có chưa đầy một giây để giật cần!'
              : `Thời gian còn ${Math.max(0, Math.ceil((startedAt + 45_000 - now) / 1000))} giây`}</span>
      </div>

      <div className="fishing-meters">
        {phase === 'casting' && (
          <div className="fishing-meter fishing-meter-full">
            <div className="fishing-meter-heading"><span>{method === 'spear' ? 'Lực phóng lao' : 'Lực ném mồi'}</span><strong>{Math.floor(castPower)}%</strong></div>
            <div className="fishing-meter-track fishing-cast-track" role="progressbar" aria-label={method === 'spear' ? 'Lực phóng lao' : 'Lực ném mồi'} aria-valuenow={castPower} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${castPower}%` }} />
            </div>
          </div>
        )}
        {phase === 'hooked' && (
          <>
            <div className="fishing-meter">
              <div className="fishing-meter-heading"><span>Đưa cá vào bờ</span><strong>{Math.floor(progress)}%</strong></div>
              <div className="fishing-meter-track fishing-catch-track" role="progressbar" aria-label="Tiến độ kéo cá" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="fishing-meter">
              <div className="fishing-meter-heading"><span>{method === 'spear' ? 'Sức ghì' : 'Sức căng dây'}</span><strong>{Math.floor(tension)}%</strong></div>
              <div className="fishing-meter-track fishing-tension-track" role="meter" aria-label={method === 'spear' ? 'Sức ghì cá' : 'Sức căng dây câu'} aria-valuenow={tension} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${tension}%` }} />
              </div>
            </div>
            <div className="fishing-meter fishing-meter-full">
              <div className="fishing-meter-heading">
                <span>{fightProfile?.label ?? 'Sức cá'}</span>
                <strong>{Math.floor(fishStamina)}%</strong>
              </div>
              <div className="fishing-meter-track fishing-fish-stamina-track" role="progressbar" aria-label="Sức cá còn lại" aria-valuenow={fishStamina} aria-valuemin={0} aria-valuemax={100}>
                <span style={{ width: `${fishStamina}%` }} />
              </div>
            </div>
          </>
        )}
        {(phase === 'waiting' || phase === 'bite') && (
          <div className="fishing-meter fishing-meter-full">
            <div className="fishing-meter-heading"><span>{phase === 'bite' ? 'Giật cần ngay!' : 'Phao câu'}</span><strong>{phase === 'bite' ? '!' : '◉'}</strong></div>
            <div className={`fishing-meter-track fishing-bite-track${phase === 'bite' ? ' is-biting' : ''}`}>
              <span />
            </div>
          </div>
        )}
      </div>

      {(phase === 'casting' || phase === 'bite' || phase === 'hooked') && (
        <button
          className={`fishing-reel-button fishing-control-button phase-${phase}${isHolding ? ' is-held' : ''}${isFighting ? ' fish-is-fighting' : ''}`}
          type="button"
          onPointerDown={startControl}
          onPointerUp={stopControl}
          onPointerCancel={stopControl}
          onLostPointerCapture={stopControl}
          onKeyDown={startControlByKey}
          onKeyUp={stopControl}
          onBlur={stopControl}
          onClick={() => { if (phaseRef.current === 'bite') hookFish() }}
          aria-label={phase === 'casting'
            ? method === 'spear' ? 'Nhấn giữ để lấy đà và nhả tay để phóng lao' : 'Nhấn giữ để tích lực và nhả tay để ném mồi'
            : phase === 'bite'
              ? catchKind === 'fish'
                ? method === 'spear' ? 'Phóng lao ngay để bắt cá' : 'Giật cần ngay để móc cá'
                : method === 'spear' ? 'Phóng lao để bắt cá' : 'Giật cần ngay để kéo vật đang mắc câu'
              : method === 'spear' ? 'Nhấn giữ khi cá dịu, nhả khi cá vùng vẫy' : 'Nhấn và giữ khi cá dịu, nhả khi cá chạy'}
        >
          <span className="fishing-reel-handle" aria-hidden="true">{phase === 'casting' ? '↗' : phase === 'bite' ? '!' : '⤴'}</span>
          <span>{phase === 'casting'
            ? method === 'spear'
              ? isHolding ? 'ĐANG LẤY ĐÀ — NHẢ TAY ĐỂ PHÓNG LAO' : 'NHẤN GIỮ ĐỂ LẤY ĐÀ, NHẢ ĐỂ PHÓNG LAO'
              : isHolding ? 'ĐANG LẤY ĐÀ — NHẢ TAY ĐỂ NÉM' : 'NHẤN GIỮ ĐỂ LẤY ĐÀ, NHẢ ĐỂ NÉM'
            : phase === 'bite'
              ? catchKind === 'fish'
                ? method === 'spear' ? 'PHÓNG LAO NGAY!' : 'GIẬT CẦN NGAY!'
                : method === 'spear' ? 'PHÓNG LAO BẮT CÁ!' : 'KÉO VẬT MẮC CÂU!'
              : method === 'spear'
                ? isHolding ? 'ĐANG GHÌ CÁ — NHẢ KHI CÁ VÙNG VẪY' : 'GIỮ ĐỂ GHÌ · NHẢ KHI CÁ VÙNG VẪY'
                : isHolding ? 'ĐANG KÉO — NHẢ NẾU CÁ CHẠY' : 'GIỮ ĐỂ KÉO · NHẢ KHI CÁ CHẠY'}</span>
        </button>
      )}

      {phase === 'casting' && (
        <p className="fishing-game-hint">
          {method === 'spear'
            ? 'Canh hướng cá bơi; lấy đà vừa đủ rồi nhả tay để phóng lao.'
            : 'Giữ nút để ném xa hơn. Lực ném tốt tăng nhẹ cơ hội gặp cá hiếm. Khi đã đủ lực, nhả nút để thả mồi.'}
        </p>
      )}
      {phase === 'waiting' && (
        <p className="fishing-game-hint">
          {method === 'spear'
            ? 'Chờ cá nhỏ lộ diện gần bờ rồi nhấn ngay để phóng lao.'
            : 'Canh dấu hiệu phao chìm rồi nhấn ngay nút để giật cần. Chậm một nhịp cá sẽ nhả mồi.'}
        </p>
      )}
      {phase === 'hooked' && (
        <p className="fishing-game-hint">
          {method === 'spear'
            ? 'Khi cá dịu, nhấn giữ để ghì. Khi cá vùng vẫy, nhả nút để tránh tuột lao.'
            : 'Khi cá dịu, nhấn giữ để kéo. Khi cá chạy và thanh căng dây tăng, nhả nút để dây không đứt.'}
        </p>
      )}
      {error && <p className="fishing-game-error" role="alert">{error}</p>}

      <div className="fishing-game-footer">
        <span>ϟ {staminaCost} thể lực</span>
        <span>{method === 'spear' ? 'Lấy đà · Phóng lao · Ghì cá' : 'Ném · Giật cần · Kéo và nhả dây'}</span>
      </div>
    </section>
  )
}

export function FishingCatchReveal({
  itemId,
  measurement,
  onClose,
}: {
  itemId: ItemId
  measurement?: FishMeasurement
  onClose(): void
}) {
  const item = itemDefinitions[itemId]
  const loot = getFishingLootDefinition(itemId)
  const action = loot?.kind === 'trash' ? 'vớt được' : loot ? 'trục vớt được' : 'bắt được'
  return (
    <section className="fishing-catch-reveal" aria-live="polite">
      <div className="fishing-catch-illustration">
        <div className="fishing-catch-rays" />
        <ItemArtwork itemId={itemId} size="large" />
        <PixelFxEffect className="pixel-fx-fishing" effect={waterSplash} seed={itemId.length} repeat />
        <span className="fishing-catch-spark fishing-catch-spark-one">✦</span>
        <span className="fishing-catch-spark fishing-catch-spark-two">✦</span>
      </div>
      <div className="fishing-catch-copy">
        <span className="section-kicker">
          {loot?.kind === 'trash' ? 'RÁC BIỂN ĐÃ ĐƯỢC VỚT' : loot ? 'VẬT PHẨM ĐẶC BIỆT' : 'MẺ ĐÁNH BẮT THÀNH CÔNG'}
        </span>
        <h2>Bạn {action} {item.name}!</h2>
        <p>{item.description}</p>
        {measurement && (
          <p className="fishing-catch-measurement">
            Dài {measurement.lengthCm} cm · Nặng {measurement.weightKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg
          </p>
        )}
        <span className="fishing-catch-reward">+1 {item.name} · Đã cho vào túi đồ</span>
        <button className="gather-button" type="button" onClick={onClose}>Tiếp tục</button>
      </div>
    </section>
  )
}

export function FishingCatchToast({
  itemId,
  measurement,
  onClose,
}: {
  itemId: ItemId
  measurement?: FishMeasurement
  onClose(): void
}) {
  const item = itemDefinitions[itemId]
  const loot = getFishingLootDefinition(itemId)
  const action = loot?.kind === 'trash' ? 'vớt được' : loot ? 'trục vớt được' : 'bắt được'
  return (
    <aside className="fishing-catch-toast" role="status" aria-live="polite">
      <ItemArtwork itemId={itemId} />
      <span>
        <strong>Bạn {action} {item.name}!</strong>
        <small>
          {measurement
            ? `${measurement.lengthCm} cm · ${measurement.weightKg.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg · Đã thêm vào túi đồ`
            : 'Đã thêm vào túi đồ'}
        </small>
      </span>
      <button type="button" aria-label="Đóng thông báo cá vừa câu" onClick={onClose}>×</button>
    </aside>
  )
}

export function FishingEscapeReveal({ onClose }: { onClose(): void }) {
  return (
    <section className="fishing-escape-reveal" aria-live="polite">
      <span className="fishing-escape-icon" aria-hidden="true">〰</span>
      <div>
        <span className="section-kicker">ĐÁNH BẮT THẤT BẠI</span>
        <h2>Cá đã thoát mất rồi</h2>
        <p>Cá vùng vẫy thoát khỏi tầm bắt. Thử lại và canh thời điểm chính xác hơn.</p>
      </div>
      <button className="gather-button" type="button" onClick={onClose}>Thử lại</button>
    </section>
  )
}
