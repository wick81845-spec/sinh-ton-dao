import 'dotenv/config'
import { buildApiApp } from './app.js'
import { loadApiConfig } from './config.js'
import { createSupabaseAuthenticationServices } from './auth/supabaseServices.js'
import { createSupabaseGameStateService } from './game/gameStateService.js'
import { createSupabaseWorldPresenceService } from './world/worldPresenceService.js'
import { createSupabaseAdminControlService } from './admin/adminControlService.js'

async function startServer(): Promise<void> {
  const config = loadApiConfig()
  const app = await buildApiApp(
    createSupabaseAuthenticationServices(config),
    config.webOrigin,
    createSupabaseGameStateService(config),
    createSupabaseWorldPresenceService(config),
    createSupabaseAdminControlService(config),
  )
  await app.listen({ host: config.host, port: config.port })
}

startServer().catch((error: unknown) => {
  console.error('Không thể khởi chạy API server:', error)
  process.exitCode = 1
})
