export interface BrowserAuthConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

export function getBrowserAuthConfig(env: Record<string, string | undefined>): BrowserAuthConfig | null {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !supabaseAnonKey) return null

  let url: URL
  try {
    url = new URL(supabaseUrl)
  } catch {
    return null
  }
  if (url.pathname !== '/' || url.search || url.hash) return null
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    return null
  }
  return { supabaseUrl, supabaseAnonKey }
}
