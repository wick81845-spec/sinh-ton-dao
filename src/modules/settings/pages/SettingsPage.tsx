import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/useAuth'
import { useThemePreference } from '../../../app/providers/useThemePreference'
import { localStorageAdapter } from '../../../services/storage/localStorageAdapter'
import { avatarOptions, backgroundOptions, isGameBackground, type GameBackground } from '../settingsPreferences'
import { applyGameBackground, isStoredImage, prepareImageUpload } from '../imagePreferences'
import { AdminControlsPanel } from '../components/AdminControlsPanel'

export function SettingsPage() {
  const { session, signOut, isAdmin, isAdminLoading, adminError } = useAuth()
  const { theme, themeReady, toggleTheme } = useThemePreference()
  const navigate = useNavigate()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string>('⚓')
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [background, setBackground] = useState<GameBackground>('ocean')
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let active = true
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
      if (isGameBackground(savedBackground)
        && (savedBackground !== 'custom' || isStoredImage(savedBackgroundImage))) {
        setBackground(savedBackground)
        setBackgroundImage(isStoredImage(savedBackgroundImage) ? savedBackgroundImage : null)
      } else if (savedBackground !== null) {
        console.warn('Bỏ qua hình nền không hợp lệ.')
      }
      setIsLoading(false)
    }).catch((loadError: unknown) => {
      if (!active) return
      console.error('Không thể tải cài đặt.', loadError)
      setError('Không thể tải cài đặt trên thiết bị này.')
      setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    applyGameBackground(background, background === 'custom' ? backgroundImage : null)
  }, [background, backgroundImage])

  async function savePreference(key: string, value: unknown): Promise<boolean> {
    setError(null)
    try {
      await localStorageAdapter.set(key, value)
      return true
    } catch (saveError: unknown) {
      console.error(`Không thể lưu cài đặt ${key}.`, saveError)
      setError('Không thể lưu thay đổi. Hãy kiểm tra dung lượng lưu trữ của trình duyệt.')
      return false
    }
  }

  async function updateAvatar(value: string): Promise<void> {
    if (!await savePreference('settings.avatar', value)) return
    try {
      await localStorageAdapter.remove('settings.avatarImage')
      setAvatar(value)
      setAvatarImage(null)
      window.dispatchEvent(new CustomEvent('game-settings:avatar', { detail: value }))
    } catch (saveError: unknown) {
      console.error('Không thể cập nhật ảnh đại diện.', saveError)
      setError('Không thể cập nhật ảnh đại diện trên thiết bị này.')
    }
  }

  async function updateBackground(value: GameBackground): Promise<void> {
    if (!await savePreference('settings.background', value)) return
    setBackground(value)
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      const image = await prepareImageUpload(file, 'avatar')
      if (!await savePreference('settings.avatarImage', image)) return
      setAvatarImage(image)
      window.dispatchEvent(new CustomEvent('game-settings:avatar', { detail: image }))
    } catch (uploadError: unknown) {
      console.error('Không thể tải ảnh đại diện.', uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'Không thể xử lý ảnh đại diện.')
    }
  }

  async function handleBackgroundUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      const image = await prepareImageUpload(file, 'background')
      if (!await savePreference('settings.backgroundImage', image)) return
      if (!await savePreference('settings.background', 'custom')) return
      setBackgroundImage(image)
      setBackground('custom')
    } catch (uploadError: unknown) {
      console.error('Không thể tải ảnh nền.', uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'Không thể xử lý ảnh nền.')
    }
  }

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true)
    const result = await signOut()
    if (result.ok) {
      navigate('/account', { replace: true })
      return
    }
    setError(result.message)
    setIsSigningOut(false)
  }

  return (
    <div className="settings-page">
      <div className="page-title-row">
        <div>
          <span className="section-kicker">HẢI GIỚI · TÙY CHỈNH</span>
          <h1>Cài đặt</h1>
          <p>Điều chỉnh hành trình theo cách bạn thích.</p>
        </div>
      </div>

      {error && <p className="account-error" role="alert">{error}</p>}
      {isLoading ? (
        <p className="account-state">Đang mở cài đặt…</p>
      ) : (
        <>
          <section className="settings-card settings-shortcuts">
            <div className="settings-section-heading">
              <span className="settings-section-icon" aria-hidden="true">✦</span>
              <div><h2>Tiện ích</h2><p>Mở hoạt động và xem tin cập nhật của trò chơi.</p></div>
            </div>
            <div className="settings-shortcut-links">
              <Link className="small-action" to="/activities">Hoạt động</Link>
              <Link className="small-action" to="/updates">Cập nhật</Link>
            </div>
          </section>
          <section className="settings-card">
            <div className="settings-section-heading">
              <span className="settings-section-icon" aria-hidden="true">◐</span>
              <div><h2>Giao diện</h2><p>Chọn chế độ hiển thị và khung cảnh của hành trình.</p></div>
            </div>
            <div className="settings-theme-row">
              <div><strong>Chế độ sáng / tối</strong><small>Đang dùng giao diện {theme === 'dark' ? 'tối' : 'sáng'}.</small></div>
              <button
                className="small-action"
                type="button"
                disabled={!themeReady}
                aria-pressed={theme === 'dark'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? '☼  Dùng giao diện sáng' : '☾  Dùng giao diện tối'}
              </button>
            </div>
            <div className="settings-choice-group">
              <strong>Khung cảnh</strong>
              <div className="settings-background-options">
                {backgroundOptions.map((option) => (
                  <button
                    className={`settings-background-choice settings-background-${option.id}`}
                    type="button"
                    key={option.id}
                    aria-pressed={background === option.id}
                    onClick={() => void updateBackground(option.id)}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
                {backgroundImage && (
                  <button
                    className="settings-background-choice settings-background-custom"
                    type="button"
                    aria-pressed={background === 'custom'}
                    style={{ backgroundImage: `linear-gradient(transparent, rgb(0 0 0 / 55%)), url("${backgroundImage}")` }}
                    onClick={() => void updateBackground('custom')}
                  >
                    <span>Ảnh của tôi</span>
                  </button>
                )}
              </div>
              <button className="small-action settings-upload-button" type="button" onClick={() => backgroundInputRef.current?.click()}>
                Tải ảnh nền lên
              </button>
              <input
                ref={backgroundInputRef}
                className="visually-hidden"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Chọn ảnh nền"
                onChange={(event) => void handleBackgroundUpload(event)}
              />
              <small className="settings-note">Ảnh được thu nhỏ và lưu riêng trên thiết bị này. Tối đa 8 MB, định dạng JPG, PNG hoặc WebP.</small>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-section-heading">
              <span className="settings-section-icon" aria-hidden="true">☻</span>
              <div><h2>Hồ sơ người chơi</h2><p>Chọn biểu tượng hoặc tải ảnh đại diện của riêng bạn.</p></div>
            </div>
            <div className="settings-avatar-options" role="group" aria-label="Biểu tượng hồ sơ">
              <button
                className="settings-avatar-upload"
                type="button"
                aria-label="Tải ảnh đại diện lên"
                aria-pressed={avatarImage !== null}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarImage ? <img src={avatarImage} alt="" /> : '+'}
              </button>
              {avatarOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  aria-label={`Chọn biểu tượng ${option}`}
                  aria-pressed={!avatarImage && avatar === option}
                  onClick={() => void updateAvatar(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <input
              ref={avatarInputRef}
              className="visually-hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Chọn ảnh đại diện"
              onChange={(event) => void handleAvatarUpload(event)}
            />
            <p className="settings-note">Ảnh đại diện sẽ được cắt vuông, thu nhỏ và chỉ lưu trên thiết bị này.</p>
          </section>

          {session && isAdminLoading && <p className="account-state">Đang xác minh quyền quản trị…</p>}
          {session && isAdmin && <AdminControlsPanel accessToken={session.access_token} />}
          {session && !isAdminLoading && adminError && (
            <p className="account-error" role="alert">Không thể xác minh quyền quản trị: {adminError}</p>
          )}

          {session && (
            <section className="settings-card settings-account-card">
              <div>
                <h2>Tài khoản</h2>
                <p>Đăng xuất khỏi tài khoản trên thiết bị này.</p>
              </div>
              <button className="settings-signout-button" type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>
                {isSigningOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  )
}
