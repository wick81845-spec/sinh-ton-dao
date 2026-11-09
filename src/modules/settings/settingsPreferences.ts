export const avatarOptions = ['⚓', '🧭', '🌊', '🐚', '🪸', '🦈'] as const

export type GameBackground = 'ocean' | 'forest' | 'sunset' | 'custom'

export const backgroundOptions: { id: GameBackground; label: string }[] = [
  { id: 'ocean', label: 'Biển sâu' },
  { id: 'forest', label: 'Rừng đảo' },
  { id: 'sunset', label: 'Hoàng hôn' },
]

export function isGameBackground(value: unknown): value is GameBackground {
  return value === 'ocean' || value === 'forest' || value === 'sunset' || value === 'custom'
}
