import { describe, expect, it } from 'vitest'
import { isUsernameAuthEmail, isValidUsername, usernameToAuthEmail } from './usernameAuth'

describe('username authentication identifiers', () => {
  it('accepts supported usernames and rejects invalid lengths or characters', () => {
    expect(isValidUsername('island_01')).toBe(true)
    expect(isValidUsername('ab')).toBe(false)
    expect(isValidUsername('name with spaces')).toBe(false)
    expect(isValidUsername('x'.repeat(25))).toBe(false)
  })

  it('normalizes usernames into non-deliverable Supabase email identifiers', () => {
    const email = usernameToAuthEmail('  Islander_01  ')
    expect(email).toBe('islander_01@accounts.haigioi.invalid')
    expect(isUsernameAuthEmail(email)).toBe(true)
    expect(isUsernameAuthEmail('player@example.com')).toBe(false)
  })
})
