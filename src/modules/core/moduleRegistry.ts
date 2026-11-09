export type GameModuleId =
  | 'core'
  | 'character'
  | 'survival'
  | 'inventory'
  | 'gathering'
  | 'crafting'
  | 'building'
  | 'world'
  | 'exploration'
  | 'ship'
  | 'voyage'
  | 'social'
  | 'combat'
  | 'progression'

export interface GameModuleDefinition {
  id: GameModuleId
  name: string
  version: string
  enabled: boolean
  dependencies: GameModuleId[]
}

export const gameModules: readonly GameModuleDefinition[] = [
  { id: 'core', name: 'Nền tảng', version: '1.0.0', enabled: true, dependencies: [] },
  { id: 'character', name: 'Nhân vật', version: '1.0.0', enabled: true, dependencies: ['core'] },
  { id: 'survival', name: 'Sinh tồn', version: '1.0.0', enabled: true, dependencies: ['core', 'character'] },
  { id: 'inventory', name: 'Túi đồ', version: '1.0.0', enabled: true, dependencies: ['core'] },
  { id: 'gathering', name: 'Thu thập', version: '1.0.0', enabled: true, dependencies: ['survival', 'inventory', 'world'] },
  { id: 'crafting', name: 'Chế tạo', version: '1.0.0', enabled: true, dependencies: ['inventory', 'progression'] },
  { id: 'building', name: 'Xây dựng', version: '1.0.0', enabled: true, dependencies: ['inventory', 'world'] },
  { id: 'world', name: 'Thế giới', version: '1.0.0', enabled: true, dependencies: ['core'] },
  { id: 'exploration', name: 'Thám hiểm', version: '1.0.0', enabled: true, dependencies: ['world', 'inventory', 'survival'] },
  { id: 'ship', name: 'Thuyền', version: '1.0.0', enabled: true, dependencies: ['inventory', 'world'] },
  { id: 'voyage', name: 'Hành trình', version: '1.0.0', enabled: true, dependencies: ['ship', 'world', 'survival'] },
  { id: 'social', name: 'Cộng đồng', version: '1.0.0', enabled: true, dependencies: ['core', 'world', 'inventory'] },
  { id: 'combat', name: 'Chiến đấu', version: '1.0.0', enabled: true, dependencies: ['character', 'inventory', 'survival', 'world'] },
  { id: 'progression', name: 'Tiến trình', version: '1.0.0', enabled: true, dependencies: ['character'] },
]

export function getEnabledModules(): GameModuleDefinition[] {
  return gameModules.filter((module) => module.enabled)
}
