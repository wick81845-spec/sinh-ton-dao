import { describe, expect, it } from 'vitest'
import { isStoredImage } from './imagePreferences'

describe('isStoredImage', () => {
  it('accepts a bounded JPEG data URL produced by the image processor', () => {
    expect(isStoredImage('data:image/jpeg;base64,SGVsbG8=')).toBe(true)
  })

  it('rejects other data URL types and malformed image values', () => {
    expect(isStoredImage('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false)
    expect(isStoredImage('not-an-image')).toBe(false)
    expect(isStoredImage(null)).toBe(false)
  })

  it('rejects oversized stored images', () => {
    expect(isStoredImage(`data:image/jpeg;base64,${'a'.repeat(2_500_000)}`)).toBe(false)
  })
})
