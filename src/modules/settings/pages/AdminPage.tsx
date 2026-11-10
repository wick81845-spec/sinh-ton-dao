import { useAuth } from '../../../app/providers/useAuth'
import { AdminControlsPanel } from '../components/AdminControlsPanel'

export function AdminPage() {
  const { session, isAdmin, isAdminLoading, adminError } = useAuth()

  if (isAdminLoading) return <p className="page-state">Đang xác minh quyền quản trị…</p>
  if (!isAdmin || !session) {
    return (
      <p className="page-state error-state" role="alert">
        {adminError ?? 'Bạn không có quyền truy cập công cụ quản trị.'}
      </p>
    )
  }
  return <AdminControlsPanel accessToken={session.access_token} />
}
