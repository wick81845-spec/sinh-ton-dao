export const avatarOptions = [
  '⚓',
  '🧭',
  '🌊',
  '🐚',
  '🪸',
  '🦈',
  '/assets/portraits/survivor-masculine-a.png',
  '/assets/portraits/survivor-masculine-b.png',
  '/assets/portraits/survivor-feminine-a.png',
  '/assets/portraits/survivor-feminine-b.png',
] as const

const avatarOptionLabels: Readonly<Record<string, string>> = {
  '/assets/portraits/survivor-masculine-a.png': 'Chân dung nam A',
  '/assets/portraits/survivor-masculine-b.png': 'Chân dung nam B',
  '/assets/portraits/survivor-feminine-a.png': 'Chân dung nữ A',
  '/assets/portraits/survivor-feminine-b.png': 'Chân dung nữ B',
}

export function isAvatarPortrait(value: string): boolean {
  return value in avatarOptionLabels
}

export function getAvatarOptionLabel(value: string): string {
  return avatarOptionLabels[value] ?? value
}

export type GameBackground = 'ocean' | 'forest' | 'sunset' | 'custom'

export const backgroundOptions: { id: GameBackground; label: string }[] = [
  { id: 'ocean', label: 'Biển sâu' },
  { id: 'forest', label: 'Rừng đảo' },
  { id: 'sunset', label: 'Hoàng hôn' },
]

export function isGameBackground(value: unknown): value is GameBackground {
  return value === 'ocean' || value === 'forest' || value === 'sunset' || value === 'custom'
}
