import type { ResourceNodeDefinition } from './gatheringConfig'

export interface GatheringMapPosition {
  x: number
  y: number
  icon: string
}

export interface IslandGatheringMapLayout {
  nodes: Partial<Record<ResourceNodeDefinition['id'], GatheringMapPosition>>
  fishing: Pick<GatheringMapPosition, 'x' | 'y'>
}

export const gatheringMapLayouts: Readonly<Record<string, IslandGatheringMapLayout>> = {
  island_001: {
    nodes: {
      shoreline: { x: 23, y: 68, icon: '⌁' },
      'sea-water': { x: 44, y: 83, icon: '≈' },
      'rocky-outcrop': { x: 84, y: 61, icon: '◆' },
      'wild-grove': { x: 40, y: 39, icon: '❋' },
      'forest-edge': { x: 62, y: 30, icon: '♧' },
      'palm-grove': { x: 72, y: 21, icon: '♧' },
      'fallen-tree': { x: 53, y: 20, icon: '▥' },
      'freshwater-stream': { x: 69, y: 51, icon: '≈' },
      'tidal-rocks': { x: 78, y: 74, icon: '◈' },
      'iron-deposit': { x: 36, y: 29, icon: '◆' },
    },
    fishing: { x: 13, y: 80 },
  },
  island_002: {
    nodes: {
      'wild-grove': { x: 39, y: 55, icon: '❋' },
      'forest-edge': { x: 75, y: 24, icon: '♧' },
      'iron-deposit': { x: 70, y: 42, icon: '◆' },
      'riverbank-clay': { x: 51, y: 43, icon: '⬡' },
      'old-growth-forest': { x: 28, y: 18, icon: '♧' },
      'resin-tree': { x: 53, y: 25, icon: '●' },
      'bee-hive': { x: 15, y: 32, icon: '♧' },
    },
    fishing: { x: 89, y: 79 },
  },
  island_003: {
    nodes: {},
    fishing: { x: 88, y: 38 },
  },
  island_004: {
    nodes: {
      'forest-edge': { x: 25, y: 32, icon: '♧' },
      'rocky-outcrop': { x: 22, y: 60, icon: '◆' },
      'iron-deposit': { x: 53, y: 18, icon: '◆' },
      'copper-deposit': { x: 74, y: 38, icon: '◆' },
      'tin-deposit': { x: 44, y: 51, icon: '◆' },
      'coal-seam': { x: 73, y: 65, icon: '⬟' },
    },
    fishing: { x: 49, y: 91 },
  },
  island_005: {
    nodes: {
      'forest-edge': { x: 32, y: 31, icon: '♧' },
      'iron-deposit': { x: 53, y: 21, icon: '◆' },
      'copper-deposit': { x: 70, y: 43, icon: '◆' },
      'coal-seam': { x: 35, y: 57, icon: '⬟' },
    },
    fishing: { x: 15, y: 80 },
  },
  island_006: {
    nodes: {
      'riverbank-clay': { x: 67, y: 54, icon: '⬡' },
      'tidal-rocks': { x: 28, y: 63, icon: '◈' },
    },
    fishing: { x: 16, y: 45 },
  },
  island_007: {
    nodes: {
      'riverbank-clay': { x: 51, y: 22, icon: '⬡' },
    },
    fishing: { x: 88, y: 49 },
  },
  island_008: {
    nodes: {
      'tidal-rocks': { x: 79, y: 22, icon: '◈' },
    },
    fishing: { x: 49, y: 88 },
  },
  island_009: {
    nodes: {
      'wild-grove': { x: 43, y: 18, icon: '❋' },
      'tin-deposit': { x: 86, y: 40, icon: '◆' },
      'coal-seam': { x: 17, y: 47, icon: '⬟' },
      'riverbank-clay': { x: 56, y: 35, icon: '⬡' },
      'old-growth-forest': { x: 35, y: 62, icon: '♧' },
      'resin-tree': { x: 66, y: 17, icon: '●' },
      'bee-hive': { x: 18, y: 24, icon: '♧' },
    },
    fishing: { x: 88, y: 78 },
  },
  island_010: {
    nodes: {},
    fishing: { x: 84, y: 84 },
  },
  island_011: {
    nodes: {
      'forest-edge': { x: 20, y: 73, icon: '♧' },
      'iron-deposit': { x: 51, y: 42, icon: '◆' },
    },
    fishing: { x: 88, y: 76 },
  },
  island_012: {
    nodes: {},
    fishing: { x: 88, y: 76 },
  },
  island_013: {
    nodes: {
      shoreline: { x: 17, y: 47, icon: '⌁' },
      'sea-water': { x: 42, y: 82, icon: '≈' },
      'rocky-outcrop': { x: 82, y: 42, icon: '◆' },
      'wild-grove': { x: 37, y: 27, icon: '❋' },
      'forest-edge': { x: 61, y: 58, icon: '♧' },
      'palm-grove': { x: 56, y: 16, icon: '♧' },
      'fallen-tree': { x: 50, y: 39, icon: '▥' },
      'freshwater-stream': { x: 35, y: 55, icon: '≈' },
      'tidal-rocks': { x: 84, y: 72, icon: '◈' },
      'iron-deposit': { x: 77, y: 27, icon: '◆' },
    },
    fishing: { x: 88, y: 84 },
  },
}
