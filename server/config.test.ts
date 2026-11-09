import { describe, expect, it } from 'vitest'
import { loadApiConfig } from './config.js'

describe('backend configuration', () => {
  it('requires Supabase connection settings instead of starting in a fake mode', () => {
    expect(() => loadApiConfig({})).toThrow('SUPABASE_URL, SUPABASE_ANON_KEY, WEB_ORIGIN')
  })

  it('accepts a local Supabase URL and applies safe local defaults', () => {
    expect(loadApiConfig({
      SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
      WEB_ORIGIN: 'http://127.0.0.1:5173',
    })).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'test-anon-key',
      supabaseSecretKey: null,
      host: '127.0.0.1',
      port: 3001,
      webOrigin: 'http://127.0.0.1:5173',
    })
  })

  it('uses the port assigned by the hosting platform when API_PORT is unset', () => {
    expect(loadApiConfig({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      WEB_ORIGIN: 'https://game.example.com',
      API_HOST: '0.0.0.0',
      PORT: '10000',
    })).toMatchObject({
      host: '0.0.0.0',
      port: 10_000,
    })
  })

  it('rejects insecure remote Supabase URLs and invalid ports', () => {
    expect(() => loadApiConfig({
      SUPABASE_URL: 'http://supabase.example.com',
      SUPABASE_ANON_KEY: 'test-anon-key',
      WEB_ORIGIN: 'http://127.0.0.1:5173',
    })).toThrow('phải dùng HTTPS')
    expect(() => loadApiConfig({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      WEB_ORIGIN: 'http://127.0.0.1:5173',
      API_PORT: '70000',
    })).toThrow('API_PORT')
  })

  it('rejects a Data API endpoint instead of the Supabase project root URL', () => {
    expect(() => loadApiConfig({
      SUPABASE_URL: 'https://project.supabase.co/rest/v1/',
      SUPABASE_ANON_KEY: 'test-anon-key',
      WEB_ORIGIN: 'http://127.0.0.1:5173',
    })).toThrow('URL gốc của project')
  })
})
