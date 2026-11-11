import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomePage } from '../../modules/core/pages/HomePage'
import { CharacterPage } from '../../modules/character/pages/CharacterPage'
import { InventoryPage } from '../../modules/inventory/pages/InventoryPage'
import { GatheringPage } from '../../modules/gathering/pages/GatheringPage'
import { SurvivalPage } from '../../modules/survival/pages/SurvivalPage'
import { CraftingPage } from '../../modules/crafting/pages/CraftingPage'
import { BuildingPage } from '../../modules/building/pages/BuildingPage'
import { CampfirePage } from '../../modules/building/pages/CampfirePage'
import { CookingStovePage } from '../../modules/building/pages/CookingStovePage'
import { WorldPage } from '../../modules/world/pages/WorldPage'
import { ExplorationPage } from '../../modules/exploration/pages/ExplorationPage'
import { VoyagePage } from '../../modules/voyage/pages/VoyagePage'
import { SocialPage } from '../../modules/social/pages/SocialPage'
import { WorldChatWidget } from '../../modules/social/components/WorldChatWidget'
import { RandomWorldEventWidget } from '../../modules/world/components/RandomWorldEventWidget'
import { TutorialGuide } from '../../modules/onboarding/components/TutorialGuide'
import { CombatPage } from '../../modules/combat/pages/CombatPage'
import { SettingsPage } from '../../modules/settings/pages/SettingsPage'
import { AdminPage } from '../../modules/settings/pages/AdminPage'
import { ProgressionPage } from '../../modules/progression/pages/ProgressionPage'
import { MarketPage } from '../../modules/economy/pages/MarketPage'
import { UpdatesPage } from '../../modules/updates/pages/UpdatesPage'
import { useAuth } from '../providers/useAuth'
import { useGame } from '../providers/useGame'
import { useWorldPresence } from '../providers/useWorldPresence'
import { gameClock } from '../../services/clock/gameClock'
import { isUsernameAuthEmail } from '../../services/auth/usernameAuth'
import { getIslandDefinition } from '../../modules/world/data/worldDefinitions'
import { localStorageAdapter } from '../../services/storage/localStorageAdapter'
import { avatarOptions, isAvatarPortrait, isGameBackground } from '../../modules/settings/settingsPreferences'
import { applyGameBackground, isStoredImage, prepareImageUpload } from '../../modules/settings/imagePreferences'
import { getCurrentWeather } from '../../modules/world/services/weatherService'
import { weatherSeverityLabels } from '../../modules/world/data/weatherDefinitions'
import { getWorldClock, getWorldWeatherAtTime } from '../../modules/world/services/worldClock'
import { isMarketAvailableAt } from '../../modules/economy/data/marketDefinitions'
import { gatheringActivities } from '../../modules/gathering/data/gatheringConfig'
import { explorationTasks } from '../../modules/exploration/data/explorationConfig'
import { recipes } from '../../modules/crafting/data/recipes'
import { buildingDefinitions } from '../../modules/building/data/buildingDefinitions'

interface OngoingActivity {
  id: string
  label: string
  icon: string
  path: string
  completesAt?: number | null
}

function formatActivityTime(completesAt: number, now: number): string {
  const remainingSeconds = Math.max(0, Math.ceil((completesAt - now) / 1000))
  return remainingSeconds > 0 ? `Còn ${remainingSeconds} giây` : 'Đang hoàn tất…'
}

const gameNavigation = [
  { id: 'character', label: 'Nhân vật', icon: '◉', path: '/character' },
  { id: 'world', label: 'Bản đồ', icon: '⌖', path: '/island' },
  { id: 'inventory', label: 'Túi đồ', icon: '▤', path: '/inventory' },
  { id: 'structures', label: 'Công trình', icon: '⌂', path: '/structures' },
]

const activityPanelLinks = [
  { path: '/exploration', label: 'Thám hiểm', icon: '⌖', group: 'Khám phá', requiredLevel: 2 },
  { path: '/voyage', label: 'Hàng hải', icon: '≈', group: 'Khám phá', requiredLevel: 3 },
  { path: '/crafting', label: 'Chế tạo', icon: '⚒', group: 'Sinh tồn' },
  { path: '/building', label: 'Xây dựng', icon: '⌂', group: 'Sinh tồn' },
  { path: '/survival', label: 'Thể trạng', icon: '♥', group: 'Sinh tồn' },
  { path: '/market', label: 'Chợ đảo', icon: '◉', group: 'Hoạt động' },
  { path: '/progression', label: 'Tiến trình', icon: '↗', group: 'Khác' },
  { path: '/settings', label: 'Cài đặt', icon: '⚙', group: 'Khác' },
  { path: '/overview', label: 'Tổng quan hành trình', icon: '⌂', group: 'Khác' },
]

const sidePanelNavigation = activityPanelLinks.filter((item) => (
  item.path !== '/overview'
  && item.path !== '/settings'
  && item.path !== '/crafting'
  && item.path !== '/building'
  && item.path !== '/survival'
))

const panelContentByPath: Record<string, () => ReactNode> = {
  '/overview': () => <HomePage />,
  '/character': () => <CharacterPage />,
  '/survival': () => <SurvivalPage />,
  '/inventory': () => <InventoryPage />,
  '/gathering': () => <GatheringPage asPanel />,
  '/crafting': () => <CraftingPage />,
  '/building': () => <BuildingPage />,
  '/structures': () => <BuildingPage ownedOnly />,
  '/campfire': () => null,
  '/cooking-stove': () => null,
  '/island': () => <WorldPage />,
  '/exploration': () => <ExplorationPage />,
  '/voyage': () => <VoyagePage />,
  '/social': () => <SocialPage />,
  '/combat': () => <CombatPage />,
  '/settings': () => <SettingsPage />,
  '/admin': () => <AdminPage />,
  '/progression': () => <ProgressionPage />,
  '/market': () => <MarketPage />,
  '/updates': () => <UpdatesPage />,
  '/activities': () => null,
}

export function GameLayout() {
  const { pathname } = useLocation()
  const { gameState, error, notice, clearNotice } = useGame()
  const { configured, session, isAdmin } = useAuth()
  const { status: worldPresenceStatus, players, maxPlayers } = useWorldPresence()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string>('⚓')
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<{ path: string; title: string } | null>(() => {
    if (!panelContentByPath[pathname]) return null
    const item = [...gameNavigation, ...activityPanelLinks].find((entry) => entry.path === pathname)
    return { path: pathname, title: item?.label ?? (pathname === '/activities' ? 'Hoạt động' : 'Thông tin') }
  })
  const [worldTimeNow, setWorldTimeNow] = useState(gameClock.now())
  const sessionName = typeof session?.user.user_metadata.username === 'string'
    ? session.user.user_metadata.username
    : null
  const accountLabel = isUsernameAuthEmail(session?.user.email)
    ? sessionName ?? 'Người chơi'
    : session?.user.email ?? 'Tài khoản'
  const currentIsland = gameState
    ? getIslandDefinition(gameState.character.currentLocationId)
    : undefined
  const currentIslandName = gameState
    ? gameState.character.currentLocationId === gameState.character.homeIslandId
      ? gameState.character.homeIslandName ?? currentIsland?.name
      : currentIsland?.name
    : undefined
  const currentWeather = gameState ? getCurrentWeather(gameState) : undefined
  const worldClock = getWorldClock(worldTimeNow)
  const worldPresenceConnected = worldPresenceStatus === 'online' || worldPresenceStatus === 'full'
  const weatherAtGameTime = currentWeather
    ? getWorldWeatherAtTime(currentWeather, worldTimeNow)
    : undefined
  const playerLevel = gameState?.character.level ?? 1
  const isActivityLocked = (item: typeof activityPanelLinks[number]) => (
    (item.requiredLevel !== undefined && playerLevel < item.requiredLevel)
    || (item.path === '/market' && !isMarketAvailableAt(gameState?.character.currentLocationId ?? ''))
  )
  const displayTemperature = gameState
    ? (gameState.survival.temperature ?? 28) + (weatherAtGameTime?.temperatureDelta ?? 0)
    : 28
  const shelterRestingAt = gameState?.buildings.find((building) => (
    building.definitionId === 'building_shelter'
    && building.status === 'completed'
    && building.islandId === gameState.character.currentLocationId
  ))
  const shelterRestingName = shelterRestingAt
    ? buildingDefinitions.find((building) => building.id === shelterRestingAt.definitionId)?.name
    : undefined
  const ongoingActivities: OngoingActivity[] = gameState
    ? [
      ...(gameState.activeCombat ? [{
        id: 'combat',
        label: 'Đang chiến đấu',
        icon: '⚔',
        path: '/combat',
      }] : []),
      ...(gameState.activeGathering ? [{
        id: 'gathering',
        label: gatheringActivities.find((activity) => activity.id === gameState.activeGathering?.activityId)?.name ?? 'Đang thu thập',
        icon: '⌁',
        path: '/gathering',
        completesAt: gameState.activeGathering.completesAt,
      }] : []),
      ...(gameState.activeExploration ? [{
        id: 'exploration',
        label: explorationTasks.find((task) => task.id === gameState.activeExploration?.taskId)?.name ?? 'Đang thám hiểm',
        icon: '⌖',
        path: '/exploration',
        completesAt: gameState.activeExploration.completesAt,
      }] : []),
      ...gameState.craftingQueue.map((job) => ({
        id: job.id,
        label: recipes.find((recipe) => recipe.id === job.recipeId)?.name ?? 'Đang chế tạo',
        icon: '⚒',
        path: '/crafting',
        completesAt: job.completesAt,
      })),
      ...gameState.constructionQueue.map((job) => ({
        id: job.id,
        label: `${job.kind === 'upgrade' ? 'Nâng cấp' : 'Xây'} ${buildingDefinitions.find((building) => building.id === job.buildingId)?.name ?? 'công trình'}`,
        icon: '⌂',
        path: '/building',
        completesAt: job.completesAt,
      })),
      ...(gameState.clothesDrying ? [{
        id: 'clothes-drying',
        label: 'Đang phơi quần áo',
        icon: '♨',
        path: '/campfire',
        completesAt: gameState.clothesDrying.completesAt,
      }] : []),
      ...(gameState.shipConstruction ? [{
        id: 'ship-construction',
        label: 'Đang đóng thuyền',
        icon: '⛵',
        path: '/voyage',
        completesAt: gameState.shipConstruction.completesAt,
      }] : []),
      ...gameState.voyages
        .filter((voyage) => voyage.status === 'departed' || voyage.status === 'traveling')
        .map((voyage) => ({
          id: voyage.id,
          label: `Đang đi đến ${getIslandDefinition(voyage.destinationId)?.name ?? 'đảo mới'}`,
          icon: '≈',
          path: '/voyage',
          completesAt: voyage.completesAt,
        })),
      ...(gameState.isResting ? [{
        id: 'resting',
        label: `Đang nghỉ ngơi tại ${shelterRestingName ?? 'lều'}`,
        icon: '☾',
        path: '/survival',
      }] : []),
    ]
    : []
  const renderActivePanel = () => {
    if (!activePanel) return null
    const activeActivity = activityPanelLinks.find((item) => item.path === activePanel.path)
    if (activeActivity && isActivityLocked(activeActivity)) {
      return renderActivityHub()
    }
    if (activePanel.path === '/campfire') return <CampfirePage />
    if (activePanel.path === '/cooking-stove') return <CookingStovePage />
    if (activePanel.path === '/gathering') {
      return (
        <GatheringPage
          asPanel
          onOpenPanel={(path, title) => setActivePanel({ path, title })}
          onClosePanel={() => setActivePanel(null)}
        />
      )
    }
    if (activePanel.path !== '/activities') return panelContentByPath[activePanel.path]?.() ?? null
    return renderActivityHub()
  }

  const renderActivityHub = () => {
    const groups = [...new Set(activityPanelLinks.map((item) => item.group))]
    return (
      <div className="game-activity-hub">
        {groups.map((group) => (
          <section className="game-activity-group" key={group}>
            <h3>{group}</h3>
            <div className="game-activity-grid">
              {activityPanelLinks.filter((item) => item.group === group).map((item) => {
                const locked = isActivityLocked(item)
                const lockLabel = item.path === '/market'
                  ? gameState?.character.currentLocationId === 'island_001' ? 'Rời đảo tân thủ' : 'Chưa có chợ'
                  : `Cấp ${item.requiredLevel}`
                return (
                  <button
                    className={`game-activity-link${locked ? ' is-locked' : ''}`}
                    key={item.path}
                    type="button"
                    disabled={locked}
                    title={locked ? (item.path === '/market' ? lockLabel : `Mở khóa ở cấp ${item.requiredLevel}`) : undefined}
                    onClick={() => setActivePanel({ path: item.path, title: item.label })}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    {item.label}
                    {locked
                      ? <span className="game-activity-lock" aria-label={lockLabel}>{lockLabel}</span>
                      : <span className="game-activity-arrow" aria-hidden="true">›</span>}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    )
  }

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(clearNotice, 2_000)
    return () => window.clearTimeout(timer)
  }, [notice, clearNotice])

  useEffect(() => {
    const timer = window.setInterval(() => setWorldTimeNow(gameClock.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!activePanel) return
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePanel(null)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePanel])

  const handleInternalNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return
    const link = event.target.closest('a[href]')
    if (!(link instanceof HTMLAnchorElement)) return
    const destination = new URL(link.href, window.location.origin)
    if (destination.origin !== window.location.origin) return
    if (destination.pathname === '/') {
      event.preventDefault()
      setActivePanel(null)
      return
    }
    if (!panelContentByPath[destination.pathname]) return

    const activityItem = activityPanelLinks.find((item) => item.path === destination.pathname)
    if (activityItem && isActivityLocked(activityItem)) {
      event.preventDefault()
      setActivePanel({ path: '/activities', title: 'Hoạt động' })
      return
    }

    event.preventDefault()
    const item = [...gameNavigation, ...activityPanelLinks].find((entry) => entry.path === destination.pathname)
    setActivePanel({
      path: destination.pathname,
      title: item?.label ?? link.textContent?.trim() ?? 'Thông tin',
    })
  }

  useEffect(() => {
    let active = true
    const handleAvatarChange = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail === 'string') {
        if (isStoredImage(event.detail)) {
          setAvatarImage(event.detail)
        } else if ((avatarOptions as readonly string[]).includes(event.detail)) {
          setAvatar(event.detail)
          setAvatarImage(null)
        }
      }
    }

    window.addEventListener('game-settings:avatar', handleAvatarChange)
    void Promise.all([
      localStorageAdapter.get<unknown>('settings.avatar'),
      localStorageAdapter.get<unknown>('settings.avatarImage'),
      localStorageAdapter.get<unknown>('settings.background'),
      localStorageAdapter.get<unknown>('settings.backgroundImage'),
    ]).then(([savedAvatar, savedAvatarImage, savedBackground, savedBackgroundImage]) => {
      if (!active) return
      if (typeof savedAvatar === 'string' && (avatarOptions as readonly string[]).includes(savedAvatar)) {
        setAvatar(savedAvatar)
      } else if (savedAvatar !== null) {
        console.warn('Bỏ qua biểu tượng hồ sơ không hợp lệ.')
      }
      if (isStoredImage(savedAvatarImage)) {
        setAvatarImage(savedAvatarImage)
      } else if (savedAvatarImage !== null) {
        console.warn('Bỏ qua ảnh đại diện không hợp lệ.')
      }
      const customBackgroundImage = isStoredImage(savedBackgroundImage) ? savedBackgroundImage : null
      if (isGameBackground(savedBackground)
        && (savedBackground !== 'custom' || customBackgroundImage !== null)) {
        applyGameBackground(savedBackground, savedBackground === 'custom' ? customBackgroundImage : null)
      } else if (savedBackground !== null) {
        console.warn('Bỏ qua hình nền không hợp lệ.')
      }
    }).catch((error: unknown) => {
      console.error('Không thể tải tùy chỉnh giao diện.', error)
    })
    return () => {
      active = false
      window.removeEventListener('game-settings:avatar', handleAvatarChange)
    }
  }, [])

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setAvatarUploadError(null)
    try {
      const image = await prepareImageUpload(file, 'avatar')
      await localStorageAdapter.set('settings.avatarImage', image)
      setAvatarImage(image)
      window.dispatchEvent(new CustomEvent('game-settings:avatar', { detail: image }))
    } catch (uploadError: unknown) {
      console.error('Không thể tải ảnh đại diện.', uploadError)
      setAvatarUploadError(uploadError instanceof Error
        ? uploadError.message
        : 'Không thể xử lý ảnh đại diện trên thiết bị này.')
    }
  }

  return (
    <div
      className="game-shell game-interface-preview gathering-navigation-preview"
      data-world-light={worldClock.lightLevel}
      onClickCapture={handleInternalNavigation}
    >
      <aside className="sidebar">
        <Link
          className="brand"
          to="/"
          aria-label="Hải Giới Sinh Tồn - Bản đồ đảo"
        >
          <span className="brand-mark">
            <img src="/assets/login/logo.png" alt="" />
          </span>
          <span className="brand-copy">
            <strong>HẢI GIỚI</strong>
            <small>SINH TỒN</small>
          </span>
        </Link>

        <div className="map-world-info" aria-label="Thời gian và thời tiết hiện tại">
          <div
            className={`world-clock-pill world-clock-${worldClock.phaseId}`}
            title={`Chu kỳ toàn cục · đổi giai đoạn trong khoảng ${Math.ceil(worldClock.minutesUntilNextPhase)} phút`}
            aria-label={`Giờ thế giới ${worldClock.time}, ${worldClock.phaseName}`}
          >
            <span aria-hidden="true">{worldClock.icon}</span>
            <strong>{worldClock.time}</strong>
            <small>{worldClock.phaseName}</small>
          </div>
          <div
            className={`weather-pill${currentWeather ? ` weather-${currentWeather.severity}` : ''}`}
            title={currentWeather?.description ?? 'Thời tiết ổn định'}
            aria-label={currentWeather
              ? `${currentWeather.name}, ${weatherSeverityLabels[currentWeather.severity]}, ${displayTemperature} độ`
              : 'Thời tiết ổn định'}
          >
            <span aria-hidden="true">{currentWeather?.icon ?? '☀'}</span>
            <span>{displayTemperature}°</span>
            <small>{currentWeather?.name ?? 'Thời tiết ổn định'}</small>
          </div>
          <div
            className="world-season-pill"
            title={`${worldClock.season.name} · ngày ${worldClock.season.day} / 7`}
            aria-label={`${worldClock.season.name}, ngày ${worldClock.season.day} trong mùa`}
          >
            <span aria-hidden="true">{worldClock.season.icon}</span>
            <small>{worldClock.season.name} · {worldClock.season.day}/7</small>
          </div>
          <div
            className={`world-population-pill world-population-${worldPresenceStatus}`}
            title={worldPresenceConnected
              ? `${players.length} người đang online · sức chứa máy chủ ${maxPlayers}`
              : 'Chưa kết nối máy chủ thế giới'}
            aria-label={worldPresenceConnected
              ? `${players.length} người online trên sức chứa ${maxPlayers}`
              : 'Chưa kết nối máy chủ thế giới'}
          >
            <span aria-hidden="true">♙</span>
            <strong>{worldPresenceConnected ? players.length : '—'}/{maxPlayers}</strong>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            className="profile-chip"
            type="button"
            aria-label={`Tải ảnh đại diện lên cho ${accountLabel}`}
            title="Bấm để tải ảnh đại diện lên"
            onClick={() => avatarInputRef.current?.click()}
          >
            <span className="avatar">
              {avatarImage
                ? <img src={avatarImage} alt="" />
                : isAvatarPortrait(avatar)
                  ? <img src={avatar} alt="" />
                  : avatar}
            </span>
            <span className="profile-copy">
              <strong>{accountLabel}</strong>
              <small>{session ? 'Đang phiêu lưu' : configured ? 'Vào hành trình' : 'Hành trình đang chờ bạn'}</small>
            </span>
            <span className={`online-dot${session ? '' : ' account-offline-dot'}`} aria-label={session ? 'Đã đăng nhập' : 'Chưa đăng nhập'} />
          </button>
          <input
            ref={avatarInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Chọn ảnh đại diện"
            onChange={(event) => void handleAvatarUpload(event)}
          />
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar topbar-map-hidden">
          <div className="breadcrumb"><span>Đại dương</span><span className="breadcrumb-separator">/</span><strong>{currentIslandName ?? 'Đảo Mầm Xanh'}</strong></div>
          <div className="topbar-actions">
            <span className="game-beta-badge" title="Phiên bản hiện tại: beta test">
              BETA TEST
            </span>
            {gameState && (
              <span className="game-character-chip" title={`Nhân vật ${gameState.character.name}`}>
                <img
                  src={`/assets/characters/survivor-${gameState.character.appearance ?? 'male'}.png`}
                  alt=""
                />
                <strong>{gameState.character.name}</strong>
              </span>
            )}
            <div
              className={`world-clock-pill world-clock-${worldClock.phaseId}`}
              title={`Chu kỳ toàn cục · đổi giai đoạn trong khoảng ${Math.ceil(worldClock.minutesUntilNextPhase)} phút`}
              aria-label={`Giờ thế giới ${worldClock.time}, ${worldClock.phaseName}`}
            >
              <span aria-hidden="true">{worldClock.icon}</span>
              <strong>{worldClock.time}</strong>
              <small>{worldClock.phaseName}</small>
            </div>
            <div
              className={`weather-pill${currentWeather ? ` weather-${currentWeather.severity}` : ''}`}
              title={currentWeather?.description ?? 'Thời tiết ổn định'}
              aria-label={currentWeather
                ? `${currentWeather.name}, ${weatherSeverityLabels[currentWeather.severity]}, ${displayTemperature} độ`
                : 'Thời tiết ổn định'}
            >
              <span aria-hidden="true">{currentWeather?.icon ?? '☀'}</span>
              <span>{displayTemperature}°</span>
              <small>{currentWeather?.name ?? 'Thời tiết ổn định'}</small>
            </div>
          </div>
        </header>
        {avatarUploadError && <div className="game-error" role="alert"><strong>Có lỗi:</strong> {avatarUploadError}</div>}
        {error && <div className="game-error" role="alert"><strong>Không thể lưu trò chơi:</strong> {error}</div>}
        <main className="page-content">
          <GatheringPage onOpenPanel={(path, title) => setActivePanel({ path, title })} />
        </main>
        <footer className="app-footer">
          <span>HẢI GIỚI SINH TỒN</span>
          <span>Chúc bạn một hành trình bình an</span>
        </footer>
      </div>
      <nav className="game-side-rail game-side-rail-left" aria-label="Điều hướng chính">
        {gameNavigation.map((item) => {
          const isActive = activePanel?.path === item.path
          return (
            <button
              className={`game-side-rail-button${isActive ? ' is-open' : ''}`}
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-pressed={isActive}
              title={item.label}
              onClick={() => setActivePanel({ path: item.path, title: item.label })}
            >
              <span aria-hidden="true">{item.icon}</span>
            </button>
          )
        })}
      </nav>
      <nav className="game-side-rail game-side-rail-right" aria-label="Công cụ và hoạt động">
        {sidePanelNavigation.map((item) => {
          const isActive = activePanel?.path === item.path
          const locked = isActivityLocked(item)
          return (
            <button
              className={`game-side-rail-button${isActive ? ' is-open' : ''}${locked ? ' is-locked' : ''}`}
              key={item.path}
              type="button"
              aria-label={item.label}
              aria-pressed={isActive}
              title={locked ? `${item.label} · ${item.requiredLevel ? `Cấp ${item.requiredLevel}` : 'Chưa có chợ tại đảo này'}` : item.label}
              disabled={locked}
              onClick={() => setActivePanel({ path: item.path, title: item.label })}
            >
              <span aria-hidden="true">{item.icon}</span>
            </button>
          )
        })}
        {isAdmin && session && (
          <button
            className={`game-side-rail-button game-side-rail-admin${activePanel?.path === '/admin' ? ' is-open' : ''}`}
            type="button"
            aria-label="Quản trị"
            aria-pressed={activePanel?.path === '/admin'}
            title="Quản trị"
            onClick={() => setActivePanel({ path: '/admin', title: 'Quản trị' })}
          >
            <span aria-hidden="true">⌘</span>
          </button>
        )}
        <button
          className={`game-side-rail-button game-side-rail-settings${activePanel?.path === '/settings' ? ' is-open' : ''}`}
          type="button"
          aria-label="Cài đặt"
          aria-pressed={activePanel?.path === '/settings'}
          title="Cài đặt"
          onClick={() => setActivePanel({ path: '/settings', title: 'Cài đặt' })}
        >
          <span aria-hidden="true">⚙</span>
        </button>
      </nav>
      <div className="game-hud-stack" aria-label="Thông tin hành trình">
        <RandomWorldEventWidget />
        {notice && (
          <div className="game-toast" role="status" aria-live="polite">
            <span>{notice}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={clearNotice}>×</button>
          </div>
        )}
        {ongoingActivities.length > 0 && (
          <aside className="ongoing-activities-widget" aria-label="Các hoạt động đang thực hiện">
            <div className="ongoing-activities-heading">
              <span className="ongoing-activities-indicator" aria-hidden="true" />
              <strong>ĐANG LÀM</strong>
              <span>{ongoingActivities.length}</span>
            </div>
            <ul>
              {ongoingActivities.map((activity) => (
                <li key={activity.id}>
                  <Link to={activity.path} title={`Mở ${activity.label}`}>
                    <span className="ongoing-activity-icon" aria-hidden="true">{activity.icon}</span>
                    <span className="ongoing-activity-copy">
                      <strong>{activity.label}</strong>
                      {activity.completesAt !== undefined && activity.completesAt !== null && (
                        <small>{formatActivityTime(activity.completesAt, worldTimeNow)}</small>
                      )}
                    </span>
                    <span className="ongoing-activity-arrow" aria-hidden="true">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      {activePanel && (
        <div
          className="game-module-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActivePanel(null)
          }}
        >
          <section
            className="game-module-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-module-panel-title"
          >
            <header className="game-module-panel-header">
              <h2 id="game-module-panel-title">
                {activityPanelLinks.some((item) => item.path === activePanel.path && isActivityLocked(item))
                  ? 'Hoạt động'
                  : activePanel.title}
              </h2>
              <button
                className="game-module-panel-close"
                type="button"
                aria-label="Đóng bảng"
                onClick={() => setActivePanel(null)}
              >
                ×
              </button>
            </header>
            <div className="game-module-panel-content">
              {renderActivePanel()}
            </div>
          </section>
        </div>
      )}
      <TutorialGuide />
      <WorldChatWidget />
    </div>
  )
}
