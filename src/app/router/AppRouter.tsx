import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../providers/useAuth'
import { GameLayout } from '../layouts/GameLayout'
import { HomePage } from '../../modules/core/pages/HomePage'
import { ModulePage } from '../../modules/core/pages/ModulePage'
import { CharacterPage } from '../../modules/character/pages/CharacterPage'
import { InventoryPage } from '../../modules/inventory/pages/InventoryPage'
import { GatheringPage } from '../../modules/gathering/pages/GatheringPage'
import { SurvivalPage } from '../../modules/survival/pages/SurvivalPage'
import { CraftingPage } from '../../modules/crafting/pages/CraftingPage'
import { BuildingPage } from '../../modules/building/pages/BuildingPage'
import { WorldPage } from '../../modules/world/pages/WorldPage'
import { ExplorationPage } from '../../modules/exploration/pages/ExplorationPage'
import { VoyagePage } from '../../modules/voyage/pages/VoyagePage'
import { SocialPage } from '../../modules/social/pages/SocialPage'
import { CombatPage } from '../../modules/combat/pages/CombatPage'
import { AccountPage } from '../../modules/account/pages/AccountPage'
import { SettingsPage } from '../../modules/settings/pages/SettingsPage'
import { ProgressionPage } from '../../modules/progression/pages/ProgressionPage'
import { MarketPage } from '../../modules/economy/pages/MarketPage'
import { UpdatesPage } from '../../modules/updates/pages/UpdatesPage'
import { WorldPresenceProvider } from '../providers/WorldPresenceProvider'

function RequireAuthentication({ children }: { children: ReactNode }) {
  const { configured, isLoading, session } = useAuth()
  const location = useLocation()

  if (isLoading) return <p className="page-state">Đang kiểm tra phiên đăng nhập…</p>
  if (configured && !session) {
    return <Navigate to="/account" replace state={{ from: location }} />
  }
  return children
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="account" element={<AccountPage />} />
        <Route element={(
          <RequireAuthentication>
            <WorldPresenceProvider><GameLayout /></WorldPresenceProvider>
          </RequireAuthentication>
        )}>
          <Route index element={<GatheringPage />} />
          <Route path="overview" element={<HomePage />} />
          <Route path="character" element={<CharacterPage />} />
          <Route path="survival" element={<SurvivalPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="gathering" element={<GatheringPage />} />
          <Route path="crafting" element={<CraftingPage />} />
          <Route path="building" element={<BuildingPage />} />
          <Route path="island" element={<WorldPage />} />
          <Route path="exploration" element={<ExplorationPage />} />
          <Route path="voyage" element={<VoyagePage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="combat" element={<CombatPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="progression" element={<ProgressionPage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="updates" element={<UpdatesPage />} />
          <Route path="*" element={<ModulePage title="Không tìm thấy trang" description="Đường dẫn này chưa tồn tại." />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
