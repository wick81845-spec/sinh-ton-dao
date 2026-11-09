import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../server/database.types'
import { getBrowserAuthConfig } from './authConfig'

export const browserAuthConfig = getBrowserAuthConfig(import.meta.env)

let clientPromise: Promise<SupabaseClient<Database> | null> | null = null

export async function createSupabaseBrowserClient(): Promise<SupabaseClient<Database> | null> {
  if (!browserAuthConfig) return null
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => (
    createClient<Database>(browserAuthConfig.supabaseUrl, browserAuthConfig.supabaseAnonKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  ))
  return clientPromise
}
