import { useEffect, useRef } from 'react'
import { clearFrame, composite, createFrame, createFx, type PixelFxModule } from 'pixelfx'

const lootPalette = ['#214b3b', '#397251', '#639264', '#9eae70', '#d2bd78', '#ead99b', '#fff0c2', '#ffffff']

export function PixelFxEffect({
  effect,
  seed,
  palette = lootPalette,
  className = '',
  repeat = false,
}: {
  effect: PixelFxModule
  seed: number
  palette?: string[]
  className?: string
  repeat?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const [width, height] = effect.meta.size
    const [originX, originY] = effect.meta.origin
    canvas.width = width
    canvas.height = height
    context.imageSmoothingEnabled = false

    const frame = createFrame(width, height)
    const image = context.createImageData(width, height)
    const makeAnimation = (effectSeed: number) => createFx(effect, {
      x: originX,
      y: originY,
      seed: effectSeed,
      ...(palette ? { palette } : {}),
    })
    let animation = makeAnimation(seed)
    const renderFrame = () => {
      clearFrame(frame)
      animation.draw(frame, 'front')
      composite(frame, image.data)
      context.putImageData(image, 0, 0)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animation.update(Math.min(0.1, effect.meta.duration))
      renderFrame()
      return
    }

    let frameId = 0
    let lastTimestamp = 0
    const tick = (timestamp: number) => {
      if (timestamp - lastTimestamp < 1000 / effect.meta.fps) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      const deltaSeconds = lastTimestamp === 0
        ? 1 / effect.meta.fps
        : Math.min((timestamp - lastTimestamp) / 1000, 0.05)
      lastTimestamp = timestamp
      if (animation.done() && repeat) {
        animation = makeAnimation(seed + Math.floor(timestamp))
      }
      animation.update(deltaSeconds)
      renderFrame()
      if (repeat || !animation.done()) frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameId)
  }, [effect, palette, repeat, seed])

  return <canvas className={`pixel-fx-canvas ${className}`} ref={canvasRef} aria-hidden="true" />
}
