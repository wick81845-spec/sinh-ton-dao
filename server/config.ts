export interface ApiConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseSecretKey: string | null
  host: string
  port: number
  webOrigin: string
}

export function loadApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'WEB_ORIGIN'] as const
  const missing = required.filter((name) => !env[name]?.trim())
  if (missing.length > 0) {
    throw new Error(`Thiếu cấu hình backend bắt buộc: ${missing.join(', ')}. Hãy tạo file .env từ .env.example.`)
  }

  const supabaseUrl = env.SUPABASE_URL!.trim()
  const webOrigin = env.WEB_ORIGIN!.trim()
  let parsedUrl: URL
  try {
    parsedUrl = new URL(supabaseUrl)
    new URL(webOrigin)
  } catch (error) {
    throw new Error('SUPABASE_URL hoặc WEB_ORIGIN không phải URL hợp lệ.', { cause: error })
  }
  if (parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
    throw new Error('SUPABASE_URL phải là URL gốc của project, không thêm /rest/v1 hoặc đường dẫn khác.')
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error('SUPABASE_URL phải dùng HTTPS ngoài môi trường local.')
  }

  const rawPort = env.API_PORT?.trim() || env.PORT?.trim() || '3001'
  const port = Number(rawPort)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('API_PORT hoặc PORT phải là số nguyên từ 1 đến 65535.')
  }

  return {
    supabaseUrl,
    supabaseAnonKey: env.SUPABASE_ANON_KEY!.trim(),
    supabaseSecretKey: env.SUPABASE_SECRET_KEY?.trim() || null,
    host: env.API_HOST?.trim() || '127.0.0.1',
    port,
    webOrigin,
  }
}
