import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { getAdapter } from '../lib/dataAdapter'
import { userFacingError } from '../lib/userFacingError'
import type { AppLayoutContext } from '../components/AppLayout'
import type { AppAuditEntry, BookModerationReport, BookReportStatus, StaffAppUser, StaffPlatformSummary } from '../types/book'
import type { AppRole } from '../lib/dataAdapter'

const STATUS_TEXT: Record<BookReportStatus, string> = {
  pending: 'Chờ xử lý',
  reviewed: 'Đã xem xét',
  resolved: 'Đã giải quyết',
}

const REASON_TEXT: Record<BookModerationReport['reason'], string> = {
  incorrect: 'Thông tin không chính xác',
  unavailable: 'Sách không còn khả dụng',
  inappropriate: 'Nội dung không phù hợp',
  other: 'Lý do khác',
}

const ROLE_LABELS: Record<AppRole, string> = {
  user: 'Thành viên',
  moderator: 'Moderator',
  admin: 'Admin',
  owner: 'Owner',
}

const AUDIT_LABELS: Record<string, string> = {
  'role.changed': 'Cập nhật vai trò thành viên',
  'book.moderation_deleted': 'Gỡ bài đăng theo báo cáo',
  'report.status_changed': 'Cập nhật trạng thái báo cáo',
}

export function ModerationPage() {
  const { role, roleError } = useOutletContext<AppLayoutContext>()
  const { showToast } = useToast()
  const [reports, setReports] = useState<BookModerationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookModerationReport | null>(null)
  const [summary, setSummary] = useState<StaffPlatformSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [staffUsers, setStaffUsers] = useState<StaffAppUser[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersReload, setUsersReload] = useState(0)
  const [auditEntries, setAuditEntries] = useState<AppAuditEntry[]>([])
  const [auditError, setAuditError] = useState<string | null>(null)
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!role || role === 'user') return
    let cancelled = false
    void getAdapter().getModerationReports()
      .then((result) => {
        if (cancelled) return
        setReports(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load moderation reports', cause)
        if (!cancelled) setError('Chưa thể tải báo cáo. Hãy thử lại nha.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [role, reload])

  useEffect(() => {
    if (role !== 'admin' && role !== 'owner') return
    let cancelled = false
    void getAdapter().getStaffSummary()
      .then((result) => { if (!cancelled) setSummary(result) })
      .catch((cause: unknown) => {
        console.error('Unable to load moderation overview statistics', cause)
        if (!cancelled) setSummaryError('Chưa thể tải thống kê quản trị.')
      })
    return () => { cancelled = true }
  }, [role])

  useEffect(() => {
    if (role !== 'admin' && role !== 'owner') return
    let cancelled = false
    void getAdapter().getStaffUsers()
      .then((result) => { if (!cancelled) setStaffUsers(result) })
      .catch((cause: unknown) => {
        console.error('Unable to load user list for moderation', cause)
        if (!cancelled) setUsersError('Chưa thể tải danh sách thành viên.')
      })
    return () => { cancelled = true }
  }, [role, usersReload])

  useEffect(() => {
    if (role !== 'admin' && role !== 'owner') return
    let cancelled = false
    void getAdapter().getAuditLog()
      .then((result) => { if (!cancelled) setAuditEntries(result) })
      .catch((cause: unknown) => {
        console.error('Unable to load privileged action audit history', cause)
        if (!cancelled) setAuditError('Chưa thể tải lịch sử thao tác.')
      })
    return () => { cancelled = true }
  }, [role, usersReload])

  const updateStatus = async (reportId: string, status: BookReportStatus) => {
    setBusyId(reportId)
    try {
      await getAdapter().updateModerationReport(reportId, status)
      showToast('Đã cập nhật trạng thái báo cáo.', 'success')
      setReload((current) => current + 1)
    } catch (cause) {
      console.error('Unable to update moderation report', cause)
      showToast(userFacingError(cause, 'Không thể cập nhật báo cáo. Hãy thử lại nha.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const deleteReportedBook = async () => {
    if (!deleteTarget?.book) return
    setBusyId(deleteTarget.id)
    try {
      await getAdapter().moderateDeleteBook(deleteTarget.bookId)
      setDeleteTarget(null)
      showToast('Đã gỡ bài đăng vi phạm.', 'success')
      setReload((current) => current + 1)
    } catch (cause) {
      console.error('Unable to remove reported book', cause)
      showToast(userFacingError(cause, 'Không thể gỡ bài đăng. Hãy thử lại nha.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const changeRole = async (userId: string, nextRole: Exclude<AppRole, 'owner'>) => {
    setRoleBusyId(userId)
    try {
      await getAdapter().setStaffUserRole(userId, nextRole)
      showToast('Đã cập nhật vai trò thành viên.', 'success')
      setUsersReload((current) => current + 1)
    } catch (cause) {
      console.error('Unable to change an application role', cause)
      showToast(userFacingError(cause, 'Không thể cập nhật vai trò. Hãy thử lại nha.'), 'error')
    } finally {
      setRoleBusyId(null)
    }
  }

  if (roleError) {
    return <EmptyState title="Chưa thể xác định quyền truy cập" description="Khu vực này cần cấu hình vai trò trong Supabase trước khi sử dụng." />
  }
  if (role === null) {
    return <div className="py-16 text-center text-sm text-text-muted" role="status">Đang xác định quyền truy cập...</div>
  }
  if (role === 'user') {
    return (
      <div className="glass-card mx-auto max-w-lg rounded-2xl p-6 text-center">
        <h1 className="text-xl font-bold text-text-primary">Khu vực dành cho đội ngũ kiểm duyệt</h1>
        <p className="mt-2 text-sm text-text-muted">Tài khoản hiện tại không có quyền truy cập.</p>
        <Link to="/app" className="mt-4 inline-flex text-sm font-semibold text-accent-yellow hover:underline">Về trang khám phá</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-accent-yellow/20 bg-accent-yellow/10 text-accent-yellow">
          <ShieldAlert aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-yellow">QUẢN TRỊ CỘNG ĐỒNG</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary">Kiểm duyệt bài đăng</h1>
          <p className="mt-2 text-sm text-text-muted">Vai trò hiện tại: {ROLE_LABELS[role]}. Nội dung hiển thị dựa trên báo cáo thật.</p>
        </div>
      </header>

      {(role === 'admin' || role === 'owner') && summary ? (
        <section aria-label="Thống kê nền tảng" className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <SummaryCard label="Thành viên" value={summary.userCount} />
          <SummaryCard label="Bài đăng sách" value={summary.bookCount} />
          <SummaryCard label="Báo cáo chờ" value={summary.pendingReportCount} />
          <SummaryCard label="Lượt đang kết nối" value={summary.activeRequestCount} />
          <SummaryCard label="Đã hoàn tất" value={summary.completedInteractionCount} />
        </section>
      ) : (role === 'admin' || role === 'owner') && summaryError ? (
        <p className="text-sm text-text-muted" role="status">{summaryError}</p>
      ) : (role === 'admin' || role === 'owner') ? (
        <div className="glass-card h-24 animate-pulse rounded-2xl" role="status" aria-label="Đang tải thống kê" />
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Báo cáo từ cộng đồng</h2>
            <p className="mt-1 text-sm text-text-muted">Xem lý do, người báo cáo và tình trạng bài đăng trước khi xử lý.</p>
          </div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => { setLoading(true); setReload((current) => current + 1) }}>
            Tải lại
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3" role="status" aria-label="Đang tải báo cáo">
            {[0, 1, 2].map((item) => <div key={item} className="glass-card h-36 animate-pulse rounded-2xl" />)}
          </div>
        ) : error ? (
          <EmptyState title="Không thể tải báo cáo" description={error} actionLabel="Thử lại" onAction={() => { setLoading(true); setReload((current) => current + 1) }} />
        ) : reports.length === 0 ? (
          <EmptyState title="Chưa có báo cáo nào" description="Khi cộng đồng gửi báo cáo bài đăng, nội dung sẽ xuất hiện tại đây." />
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <article key={report.id} className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary">{report.book?.title ?? 'Bài đăng không còn tồn tại'}</h3>
                      <span className="rounded-full border border-accent-yellow/20 bg-accent-yellow/[0.08] px-2.5 py-1 text-xs text-accent-yellow">
                        {STATUS_TEXT[report.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      {REASON_TEXT[report.reason]} · Người báo cáo: {report.reporterName ?? 'Thành viên'} · Người đăng: {report.book?.ownerName ?? 'Không xác định'}
                    </p>
                    {report.book && <p className="mt-1 text-xs text-text-muted">Tình trạng hiện tại: {report.book.status}</p>}
                    {report.details && <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">{report.details}</p>}
                    <p className="mt-2 text-xs text-text-muted">
                      Báo cáo {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.createdAt))}
                    </p>
                  </div>
                  {report.book && (
                    <Link to={`/books/${report.book.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-yellow hover:underline">
                      Mở bài đăng <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-glass/10 pt-3">
                  <Button size="sm" variant="outline" disabled={busyId === report.id || report.status === 'reviewed'} onClick={() => void updateStatus(report.id, 'reviewed')}>
                    Đánh dấu đã xem
                  </Button>
                  <Button size="sm" variant="outline" disabled={busyId === report.id || report.status === 'resolved'} onClick={() => void updateStatus(report.id, 'resolved')}>
                    Đánh dấu đã giải quyết
                  </Button>
                  {report.book && (
                    <Button size="sm" variant="danger" disabled={busyId === report.id} onClick={() => setDeleteTarget(report)}>
                      <AlertTriangle aria-hidden="true" className="h-4 w-4" /> Gỡ bài đăng
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {(role === 'admin' || role === 'owner') && (
        <>
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-yellow">QUẢN LÝ THÀNH VIÊN</p>
              <h2 className="mt-1 text-xl font-bold text-text-primary">Vai trò trong Booki</h2>
              <p className="mt-1 text-sm text-text-muted">
                Email và tọa độ riêng tư không hiển thị. Chỉ Owner được cấp vai trò; Moderator chỉ kiểm duyệt báo cáo và gỡ nội dung.
              </p>
            </div>
            {usersError ? (
              <p className="rounded-xl border border-accent-rose/20 p-3 text-sm text-accent-rose" role="alert">{usersError}</p>
            ) : staffUsers.length === 0 ? (
              <div className="glass-card rounded-2xl p-5 text-sm text-text-muted">Chưa có hồ sơ thành viên để hiển thị.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-glass/10">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="bg-[rgb(var(--color-interactive-surface)/.8)] text-xs text-text-muted">
                    <tr><th scope="col" className="px-4 py-3">Thành viên</th><th scope="col" className="px-4 py-3">Tham gia</th><th scope="col" className="px-4 py-3">Vai trò</th></tr>
                  </thead>
                  <tbody className="divide-y divide-glass/10">
                    {staffUsers.map((member) => (
                      <tr key={member.userId}>
                        <td className="px-4 py-3 font-medium text-text-primary">{member.fullName}</td>
                        <td className="px-4 py-3 text-text-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(member.joinedAt))}</td>
                        <td className="px-4 py-3">
                          {role === 'owner' && member.role !== 'owner' ? (
                            <select
                              aria-label={`Vai trò của ${member.fullName}`}
                              value={member.role}
                              disabled={roleBusyId === member.userId}
                              onChange={(event) => void changeRole(member.userId, event.target.value as Exclude<AppRole, 'owner'>)}
                              className="field-control min-w-32 px-3 py-2 text-sm"
                            >
                              <option value="user">Thành viên</option>
                              <option value="moderator">Moderator</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="rounded-full border border-glass/10 px-2.5 py-1 text-xs text-text-muted">{ROLE_LABELS[member.role]}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-yellow">LỊCH SỬ QUẢN TRỊ</p>
              <h2 className="mt-1 text-xl font-bold text-text-primary">Thao tác gần đây</h2>
            </div>
            {auditError ? (
              <p className="text-sm text-text-muted" role="status">{auditError}</p>
            ) : auditEntries.length === 0 ? (
              <p className="glass-card rounded-2xl p-4 text-sm text-text-muted">Chưa có thao tác quản trị được ghi nhận.</p>
            ) : (
              <ul className="divide-y divide-glass/10 rounded-2xl border border-glass/10">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="text-text-primary">{AUDIT_LABELS[entry.eventType] ?? 'Thao tác quản trị'}</span>
                    <time dateTime={entry.createdAt} className="text-xs text-text-muted">
                      {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt))}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/80 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && busyId !== deleteTarget.id) setDeleteTarget(null) }}
          onKeyDown={(event) => { if (event.key === 'Escape' && busyId !== deleteTarget.id) setDeleteTarget(null) }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="moderation-delete-title" className="glass-card w-full max-w-md rounded-2xl p-5">
            <h2 id="moderation-delete-title" className="text-lg font-bold text-text-primary">Gỡ bài đăng này?</h2>
            <p className="mt-2 text-sm text-text-muted">
              “{deleteTarget.book?.title}” và các báo cáo liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={busyId === deleteTarget.id} onClick={() => setDeleteTarget(null)}>Hủy</Button>
              <Button variant="danger" disabled={busyId === deleteTarget.id} onClick={() => void deleteReportedBook()}>
                {busyId === deleteTarget.id ? 'Đang gỡ...' : 'Xác nhận gỡ'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-3 sm:rounded-2xl sm:p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-text-primary sm:text-2xl">{value}</p>
    </div>
  )
}
