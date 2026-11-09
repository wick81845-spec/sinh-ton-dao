declare module 'pixelfx' {
  export interface PixelFxFrame {
    w: number
    h: number
    color: Uint32Array
    light: Uint32Array
  }

  export interface PixelFxModule {
    meta: {
      name: string
      size: [number, number]
      origin: [number, number]
      duration: number
      loop: boolean
      fps: number
      options?: Record<string, unknown>
    }
    create(options: Record<string, unknown>): {
      update?(deltaSeconds: number, options?: Record<string, unknown>): void
      draw(painter: unknown, timeSeconds: number, options?: Record<string, unknown>): void
      drawBack?(painter: unknown, timeSeconds: number, options?: Record<string, unknown>): void
    }
  }

  export interface PixelFxInstance {
    update(deltaSeconds: number): void
    draw(frame: PixelFxFrame, layer?: 'back' | 'front'): void
    done(): boolean
  }

  export function createFrame(width: number, height: number): PixelFxFrame
  export function clearFrame(frame: PixelFxFrame): PixelFxFrame
  export function createFx(
    effect: PixelFxModule,
    options: { x: number; y: number; seed: number; palette?: string[] },
  ): PixelFxInstance
  export function composite(
    frame: PixelFxFrame,
    output: Uint8ClampedArray,
    background?: null,
  ): Uint8ClampedArray
}

declare module 'pixelfx/fx/pickups/collect-burst' {
  import type { PixelFxModule } from 'pixelfx'
  export const meta: PixelFxModule['meta']
  export function create(options: Record<string, unknown>): ReturnType<PixelFxModule['create']>
}

declare module 'pixelfx/fx/water/splash' {
  import type { PixelFxModule } from 'pixelfx'
  export const meta: PixelFxModule['meta']
  export function create(options: Record<string, unknown>): ReturnType<PixelFxModule['create']>
}
