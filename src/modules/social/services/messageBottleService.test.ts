import { describe, expect, it } from 'vitest'
import { validateMessageBottleText } from './messageBottleService'

describe('validateMessageBottleText', () => {
  it('accepts a short plain-text message', () => {
    expect(validateMessageBottleText('Chào người lữ hành!')).toBeNull()
  })

  it('rejects empty or oversized messages, contact details, links, and profanity', () => {
    expect(validateMessageBottleText('   ')).toContain('1 đến 280')
    expect(validateMessageBottleText('a'.repeat(281))).toContain('1 đến 280')
    expect(validateMessageBottleText('Gọi tôi 0123456789')).toContain('số điện thoại')
    expect(validateMessageBottleText('Gặp tại https://example.com')).toContain('liên kết')
    expect(validateMessageBottleText('đồ lồn')).toContain('không phù hợp')
  })
})
