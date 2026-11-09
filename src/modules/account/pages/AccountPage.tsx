import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../app/providers/useAuth'
import { useThemePreference } from '../../../app/providers/useThemePreference'
import { isValidUsername } from '../../../services/auth/usernameAuth'

function getSafeReturnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return '/'
  const from = state.from
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return '/'
  const pathname = from.pathname
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//') || pathname === '/account') {
    return '/'
  }
  const search = 'search' in from && typeof from.search === 'string' ? from.search : ''
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : ''
  return `${pathname}${search}${hash}`
}

export function AccountPage() {
  const { configured, isLoading, session, error: authError, signIn, signUp } = useAuth()
  const { theme, themeReady, toggleTheme } = useThemePreference()
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = getSafeReturnPath(location.state)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [islandName, setIslandName] = useState('')
  const [appearance, setAppearance] = useState<'male' | 'female'>('male')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const isDesignPreview = new URLSearchParams(window.location.search).get('design-preview') === '1'

  useEffect(() => {
    if (session && !isLoading && !isDesignPreview) navigate(returnTo, { replace: true })
  }, [isDesignPreview, isLoading, navigate, returnTo, session])

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDesignPreview) return
    if (mode === 'sign-up') {
      if (!isValidUsername(username.trim())) {
        setFeedback('Tên đăng nhập cần từ 3 đến 24 ký tự: chữ không dấu, số, gạch dưới hoặc gạch ngang.')
        return
      }
      if (!displayName.trim() || !islandName.trim()) {
        setFeedback('Hãy nhập tên nhân vật và tên đảo.')
        return
      }
    }

    setIsSubmitting(true)
    setFeedback(null)
    const result = mode === 'sign-in'
      ? await signIn(identifier.trim(), password)
      : await signUp(username.trim(), password, displayName.trim(), islandName.trim(), appearance)

    if (result.ok && mode === 'sign-in') {
      navigate(returnTo, { replace: true })
      return
    }

    setFeedback(result.message)
    setIsSubmitting(false)
  }

  const accountForm = (
    <section className="account-card account-auth-card account-login-card">
      <div className="account-auth-intro">
        {!isDesignPreview && <span className="account-emblem" aria-hidden="true">✦</span>}
        <span className="section-kicker">
          {isDesignPreview
            ? mode === 'sign-in' ? 'TIẾP TỤC CUỘC PHIÊU LƯU' : 'BẮT ĐẦU CUỘC PHIÊU LƯU'
            : 'HÀNH TRÌNH CỦA BẠN'}
        </span>
        <h2>{isDesignPreview
          ? mode === 'sign-in' ? 'Đăng nhập' : 'Tạo tài khoản'
          : mode === 'sign-in' ? 'Chào mừng trở lại' : 'Bắt đầu hành trình mới'}</h2>
        <p>{isDesignPreview
          ? mode === 'sign-in'
            ? 'Nhập thông tin để trở về nơi bạn đã bắt đầu.'
            : 'Đặt tên cho nhân vật và hòn đảo của bạn. Bạn có thể dùng tiếng Việt.'
          : mode === 'sign-in'
            ? 'Nhập tên đăng nhập và mật khẩu để tiếp tục chuyến đi.'
            : 'Đặt tên cho nhân vật và hòn đảo của bạn. Bạn có thể dùng tiếng Việt.'}</p>
      </div>
      <div className="account-mode-switch" role="tablist" aria-label="Chọn thao tác tài khoản">
        <button type="button" role="tab" aria-selected={mode === 'sign-in'} onClick={() => { setMode('sign-in'); setFeedback(null) }}>Đăng nhập</button>
        <button type="button" role="tab" aria-selected={mode === 'sign-up'} onClick={() => { setMode('sign-up'); setFeedback(null) }}>Tạo tài khoản</button>
      </div>
      <form className="account-form" onSubmit={(event) => void submitAuth(event)}>
        {mode === 'sign-up' && (
          <label>
            Tên đăng nhập
            <input
              autoComplete="username"
              maxLength={24}
              minLength={3}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <small>3–24 ký tự: chữ không dấu, số, gạch dưới hoặc gạch ngang.</small>
          </label>
        )}
        {mode === 'sign-up' && (
          <label>
            Tên nhân vật
            <input
              autoComplete="nickname"
              maxLength={32}
              minLength={1}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}
        {mode === 'sign-up' && (
          <fieldset className="character-choice-field">
            <legend>Chọn nhân vật</legend>
            <div className="character-choice-grid">
              {([
                ['male', 'Nam', '/assets/characters/survivor-male.png'],
                ['female', 'Nữ', '/assets/characters/survivor-female.png'],
              ] as const).map(([value, label, image]) => (
                <label className={`character-choice-card${appearance === value ? ' selected' : ''}`} key={value}>
                  <input
                    type="radio"
                    name="character-appearance"
                    value={value}
                    checked={appearance === value}
                    onChange={() => setAppearance(value)}
                  />
                  <img src={image} alt="" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {mode === 'sign-up' && (
          <label>
            Tên hòn đảo của bạn
            <input
              autoComplete="off"
              maxLength={40}
              minLength={1}
              required
              value={islandName}
              onChange={(event) => setIslandName(event.target.value)}
            />
          </label>
        )}
        {mode === 'sign-in' && (
          <label>
            Tên đăng nhập
            <input
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
        )}
        <label>
          Mật khẩu
          <input
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            minLength={8}
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === 'sign-up' && <small>Tối thiểu 8 ký tự.</small>}
        </label>
        {feedback && <p className="account-feedback" role="status">{feedback}</p>}
        {authError && <p className="account-error" role="alert">{authError}</p>}
        {!configured && <p className="account-error" role="status">Cánh cổng chưa mở được. Hãy quay lại sau.</p>}
        <button className="gather-button" type="submit" disabled={isSubmitting || !configured}>
          {isSubmitting ? 'Đang mở cánh cổng…' : mode === 'sign-in'
            ? isDesignPreview ? 'Trở về đảo' : 'Bắt đầu hành trình'
            : 'Tạo nhân vật'}
        </button>
      </form>
    </section>
  )

  const accountUtilities = (
    <div className="account-header-actions">
      <button
        className="icon-button theme-toggle"
        type="button"
        aria-label={theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
        aria-pressed={theme === 'dark'}
        disabled={!themeReady}
        onClick={toggleTheme}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
      </button>
      <Link className="account-return-link" to="/">Về trò chơi</Link>
    </div>
  )

  return (
    <main className="account-screen account-login-screen">
      <header className="account-login-topbar">{accountUtilities}</header>
      <div className="account-login-content">
        <img
          className="account-login-logo"
          src="/assets/login/logo.png"
          alt="Hải Giới Sinh Tồn — hai người sống sót giữa đảo hoang"
        />
        <h1 className="account-login-title">{isDesignPreview ? 'Đường về hòn đảo' : 'Cánh cổng Hải Giới'}</h1>
        <p className="account-login-lead">{isDesignPreview
          ? 'Biển vẫn lặng. Hành trình của bạn vẫn còn đó.'
          : 'Trở về hành trình của bạn, hoặc bắt đầu một chuyến phiêu lưu mới.'}</p>
        {isDesignPreview && <span className="account-preview-badge">BẢN XEM TRƯỚC</span>}
        <div className="account-login-panel">
          {isLoading || session
            ? <p className="account-state">{session ? 'Đang trở về hành trình…' : 'Đang mở cánh cổng…'}</p>
            : accountForm}
        </div>
        <p className="account-login-footnote">
          <span aria-hidden="true">✦</span>
          Mọi chuyến đi đều bắt đầu từ một bước chân.
        </p>
      </div>
    </main>
  )
}
