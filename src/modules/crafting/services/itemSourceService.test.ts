import { describe, expect, it } from 'vitest'
import { getItemSourceInfo } from './itemSourceService'

describe('getItemSourceInfo', () => {
  it('finds gathering locations and island names for raw resources', () => {
    expect(getItemSourceInfo('item_wood')).toContainEqual({
      kind: 'gathering',
      label: 'Thu hoạch tại Bãi biển · Đảo Mầm Xanh',
    })
  })

  it('finds a crafting recipe and its station for processed materials', () => {
    expect(getItemSourceInfo('item_wood_plank').some((source) => (
      source.kind === 'crafting' && source.label.includes('Bàn chế tạo')
    ))).toBe(true)
  })

  it('finds gathering activities that can yield materials as byproducts', () => {
    expect(getItemSourceInfo('item_bark').some((source) => (
      source.kind === 'gathering' && source.label.includes('Rừng')
    ))).toBe(true)
  })

  it('shows fishing zones and islands for catchable fish', () => {
    expect(getItemSourceInfo('item_anchovy').some((source) => (
      source.kind === 'fishing'
      && source.label.includes('ven bờ')
      && source.label.includes('Đảo nhiệt đới')
    ))).toBe(true)
  })
})
