import { describe, expect, it } from 'vitest'
import { getBrowserAuthConfig } from './authConfig'

describe('browser auth configuration', () => {
  it('does not enable authentication when public Supabase settings are absent', () => {
    expect(getBrowserAuthConfig({})).toBeNull()
  })

  it('accepts HTTPS Supabase URLs and local development URLs', () => {
    expect(getBrowserAuthConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toEqual({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    })
    expect(getBrowserAuthConfig({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'local-anon-key',
    })).not.toBeNull()
  })

  it('rejects insecure remote URLs and malformed URLs', () => {
    expect(getBrowserAuthConfig({
      VITE_SUPABASE_URL: 'http://example.com',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toBeNull()
    expect(getBrowserAuthConfig({
      VITE_SUPABASE_URL: 'not-a-url',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toBeNull()
    expect(getBrowserAuthConfig({
      VITE_SUPABASE_URL: 'https://project.supabase.co/rest/v1/',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toBeNull()
  })
})
