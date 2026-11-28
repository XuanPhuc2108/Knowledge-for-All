import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { getAdapter, getAdapterMode } from '../lib/dataAdapter'
import {
  LOCAL_QA_ADMIN_KEY,
  SYNTHETIC_USERS_STORAGE_KEY,
  parseSyntheticUserFile,
  readStoredSyntheticUsers,
} from '../lib/syntheticQaUsers'
import { normalizeBookSearch } from '../lib/search'
import { userFacingError } from '../lib/userFacingError'
import type { AppLayoutContext } from '../components/AppLayout'
import type { AppAuditEntry, BookGuardQueueItem, BookReportReason, BookReportStatus, StaffAppUser, StaffPlatformSummary } from '../types/book'
import type { AppRole } from '../lib/dataAdapter'

const STATUS_TEXT: Record<BookReportStatus, string> = {
  pending: 'Chờ xử lý',
  reviewed: 'Đã xem xét',
  resolved: 'Đã giải quyết',
}

const REASON_TEXT: Record<BookReportReason, string> = {
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
  'book.guard_marked_safe': 'Đánh dấu bài đăng an toàn',
  'book.guard_kept': 'Giữ lại bài đăng sau khi xem xét',
  'report.status_changed': 'Cập nhật trạng thái báo cáo',
}

type QueueFilter = 'needs_review' | 'all' | 'MEDIUM' | 'HIGH' | 'reported' | 'resolved'
type MemberRoleFilter = 'all' | AppRole

export function ModerationPage() {
  const { role, roleError } = useOutletContext<AppLayoutContext>()
  const { showToast } = useToast()
  const [items, setItems] = useState<BookGuardQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookGuardQueueItem | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('needs_review')
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [summary, setSummary] = useState<StaffPlatformSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [staffUsers, setStaffUsers] = useState<StaffAppUser[]>([])
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersReload, setUsersReload] = useState(0)
  const [auditEntries, setAuditEntries] = useState<AppAuditEntry[]>([])
  const [auditError, setAuditError] = useState<string | null>(null)
  const [roleBusyId, setRoleBusyId] = useState<string | null>(null)
  const localQaAvailable = import.meta.env.DEV && getAdapterMode() === 'local'
  const [storedSyntheticState] = useState(() => {
    if (!localQaAvailable) return { users: [] as StaffAppUser[], error: null as string | null }
    try {
      return { users: readStoredSyntheticUsers(localStorage), error: null }
    } catch (cause) {
      console.error('Unable to read local synthetic user fixture', cause)
      return { users: [], error: 'Không thể đọc dữ liệu QA lưu trên trình duyệt. Hãy nhập lại tệp JSON hợp lệ.' }
    }
  })
  const [syntheticUsers, setSyntheticUsers] = useState(storedSyntheticState.users)
  const [syntheticError, setSyntheticError] = useState<string | null>(storedSyntheticState.error)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState<MemberRoleFilter>('all')
  const [memberSort, setMemberSort] = useState<'newest' | 'oldest'>('newest')
  const [memberPage, setMemberPage] = useState(1)
  const importInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!role || role === 'user') return
    let cancelled = false
    void getAdapter().getBookGuardQueue()
      .then((result) => {
        if (cancelled) return
        setItems(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load Booki Guard queue', cause)
        if (!cancelled) setError('Chưa thể tải hàng chờ kiểm duyệt. Hãy thử lại nha.')
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

  const updateStatus = async (item: BookGuardQueueItem, status: BookReportStatus) => {
    if (!item.report) return
    setBusyId(item.bookId)
    try {
      await getAdapter().updateModerationReport(item.report.id, status)
      showToast('Đã cập nhật trạng thái báo cáo.', 'success')
      setLoading(true)
      setReload((current) => current + 1)
    } catch (cause) {
      console.error('Unable to update moderation report', cause)
      showToast(userFacingError(cause, 'Không thể cập nhật báo cáo. Hãy thử lại nha.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const reviewBook = async (item: BookGuardQueueItem, decision: 'kept' | 'marked_safe') => {
    setBusyId(item.bookId)
    try {
      await getAdapter().reviewBookGuard(item.bookId, decision)
      showToast(decision === 'marked_safe' ? 'Đã đánh dấu bài đăng an toàn.' : 'Đã lưu quyết định giữ lại bài đăng.', 'success')
      setLoading(true)
      setReload((current) => current + 1)
    } catch (cause) {
      console.error('Unable to save Booki Guard review', cause)
      showToast(userFacingError(cause, 'Không thể lưu quyết định kiểm duyệt. Hãy thử lại nha.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const deleteReportedBook = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.bookId)
    try {
      await getAdapter().moderateDeleteBook(deleteTarget.bookId)
      setDeleteTarget(null)
      showToast('Đã gỡ bài đăng vi phạm.', 'success')
      setLoading(true)
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

  const importSyntheticUsers = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file || !localQaAvailable) return
    try {
      const users = parseSyntheticUserFile(JSON.parse(await file.text()))
      localStorage.setItem(SYNTHETIC_USERS_STORAGE_KEY, JSON.stringify({
        marker: 'BOOKI_LOCAL_SYNTHETIC_USERS_V1',
        users,
      }))
      setSyntheticUsers(users)
      setSyntheticError(null)
      setMemberPage(1)
      showToast(`Đã nạp ${users.length} hồ sơ kiểm thử cục bộ.`, 'success')
    } catch (cause) {
      console.error('Unable to import local synthetic user fixture', cause)
      setSyntheticError(cause instanceof Error
        ? cause.message
        : 'Không thể nhập dữ liệu kiểm thử.')
    }
  }

  const clearSyntheticUsers = () => {
    if (!localQaAvailable) return
    localStorage.removeItem(SYNTHETIC_USERS_STORAGE_KEY)
    setSyntheticUsers([])
    setSyntheticError(null)
    setMemberPage(1)
  }

  const enableLocalQaAdmin = () => {
    if (!localQaAvailable) return
    localStorage.setItem(LOCAL_QA_ADMIN_KEY, 'true')
    window.location.reload()
  }

  const disableLocalQaAdmin = () => {
    if (!localQaAvailable) return
    localStorage.removeItem(LOCAL_QA_ADMIN_KEY)
    window.location.reload()
  }

  const needsReviewCount = items.filter((item) => (
    item.moderationStatus === 'needs_review' || item.report?.status === 'pending'
  )).length
  const mediumRiskCount = items.filter((item) => item.riskLevel === 'MEDIUM').length
  const highRiskCount = items.filter((item) => item.riskLevel === 'HIGH').length
  const reportedCount = items.filter((item) => item.report).length
  const resolvedCount = items.filter((item) => (
    item.report?.status === 'resolved' || item.decision !== null
  )).length
  const visibleItems = items.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'needs_review') {
      return item.moderationStatus === 'needs_review' || item.report?.status === 'pending'
    }
    if (filter === 'reported') return Boolean(item.report)
    if (filter === 'resolved') return item.report?.status === 'resolved' || item.decision !== null
    return item.riskLevel === filter
  })
  const filteredMembers = useMemo(() => {
    const normalizedSearch = normalizeBookSearch(memberSearch.trim())
    return [...staffUsers, ...syntheticUsers]
      .filter((member) => memberRoleFilter === 'all' || member.role === memberRoleFilter)
      .filter((member) => !normalizedSearch || normalizeBookSearch(member.fullName).includes(normalizedSearch))
      .sort((left, right) => {
        const difference = Date.parse(left.joinedAt) - Date.parse(right.joinedAt)
        return memberSort === 'newest' ? -difference : difference
      })
  }, [staffUsers, syntheticUsers, memberRoleFilter, memberSearch, memberSort])
  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / 25))
  const visibleMembers = filteredMembers.slice((memberPage - 1) * 25, memberPage * 25)

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
        {localQaAvailable && (
          <div className="mt-5 rounded-xl border border-accent-yellow/20 bg-accent-yellow/[0.06] p-4 text-left">
            <p className="text-sm font-bold text-accent-yellow">Chế độ quản trị QA chỉ dùng local</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Chỉ có trong Vite development khi ứng dụng dùng local adapter; thao tác này không cấp quyền hoặc ghi dữ liệu vào Supabase.
            </p>
            <Button type="button" className="mt-3 w-full" onClick={enableLocalQaAdmin}>
              Mở Booki Guard cho QA local
            </Button>
          </div>
        )}
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
          <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary">Booki Guard</h1>
          <p className="mt-2 text-sm text-text-muted">
            Vai trò hiện tại: {ROLE_LABELS[role]}. Quy tắc chỉ gợi ý nội dung cần xem; quyết định luôn thuộc về đội ngũ.
          </p>
        </div>
      </header>

      {localQaAvailable && (
        <section aria-label="Dữ liệu thành viên QA cục bộ" className="rounded-2xl border border-accent-yellow/30 bg-accent-yellow/[0.07] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-accent-yellow">DỮ LIỆU KIỂM THỬ — KHÔNG PHẢI THÀNH VIÊN THẬT</p>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                Hồ sơ QA chỉ được lưu trong localStorage của trình duyệt. Thống kê thành viên thật từ adapter không bị thay đổi.
              </p>
              <p className="mt-1 text-xs text-text-muted">Đang nạp {syntheticUsers.length} hồ sơ QA riêng biệt.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Chọn tệp hồ sơ người dùng tổng hợp"
                onChange={(event) => void importSyntheticUsers(event)}
              />
              <Button type="button" size="sm" variant="secondary" onClick={() => importInputRef.current?.click()}>
                Nạp tệp JSON
              </Button>
              {syntheticUsers.length > 0 && (
                <Button type="button" size="sm" variant="secondary" onClick={clearSyntheticUsers}>
                  Xóa hồ sơ QA trong trình duyệt
                </Button>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={disableLocalQaAdmin}>
                Tắt chế độ QA
              </Button>
            </div>
          </div>
          {syntheticError && <p className="mt-3 text-sm text-accent-rose" role="alert">{syntheticError}</p>}
        </section>
      )}

      <section aria-label="Thống kê Booki Guard" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Cần xem xét" value={needsReviewCount} />
        <SummaryCard label="Mức trung bình" value={mediumRiskCount} />
        <SummaryCard label="Mức cao" value={highRiskCount} />
        <SummaryCard label="Có báo cáo" value={reportedCount} />
      </section>

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

      <section aria-labelledby="booki-guard-queue-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="booki-guard-queue-title" className="text-xl font-bold text-text-primary">Hàng chờ xem xét</h2>
            <p className="mt-1 text-sm text-text-muted">Tín hiệu minh bạch, không tự động gỡ bài hay xử phạt thành viên.</p>
          </div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => { setLoading(true); setReload((current) => current + 1) }}>
            Tải lại
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Lọc hàng chờ kiểm duyệt">
          {([
            ['needs_review', 'Cần xem xét', needsReviewCount],
            ['all', 'Tất cả', items.length],
            ['MEDIUM', 'Mức trung bình', mediumRiskCount],
            ['HIGH', 'Mức cao', highRiskCount],
            ['reported', 'Có báo cáo', reportedCount],
            ['resolved', 'Đã xử lý', resolvedCount],
          ] as const).map(([value, label, count]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? 'secondary' : 'outline'}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label} <span className="tabular-nums opacity-75">{count}</span>
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3" role="status" aria-label="Đang tải hàng chờ">
            {[0, 1, 2].map((item) => <div key={item} className="glass-card h-36 animate-pulse rounded-2xl" />)}
          </div>
        ) : error ? (
          <EmptyState title="Không thể tải Booki Guard" description={error} actionLabel="Thử lại" onAction={() => { setLoading(true); setReload((current) => current + 1) }} />
        ) : items.length === 0 ? (
          <EmptyState title="Hàng chờ đang trống" description="Chưa có bài đăng cần xem xét hoặc báo cáo từ cộng đồng." />
        ) : visibleItems.length === 0 ? (
          <EmptyState title="Không có kết quả phù hợp" description="Thử chọn bộ lọc khác để xem các bài đăng trong hàng chờ." />
        ) : (
          <div className="space-y-3">
            {visibleItems.map((item) => {
              const expanded = expandedBookId === item.bookId
              const busy = busyId === item.bookId
              return (
              <article key={item.bookId} className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary">{item.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.riskLevel === 'HIGH'
                          ? 'border-accent-rose/25 bg-accent-rose/[0.08] text-accent-rose'
                          : item.riskLevel === 'MEDIUM'
                            ? 'border-accent-yellow/20 bg-accent-yellow/[0.08] text-accent-yellow'
                            : 'border-glass/15 bg-[rgb(var(--color-interactive-surface)/.65)] text-text-muted'
                      }`}>
                        Rủi ro {item.riskLevel === 'HIGH' ? 'cao' : item.riskLevel === 'MEDIUM' ? 'trung bình' : 'thấp'}
                      </span>
                      <span className="rounded-full border border-glass/10 px-2.5 py-1 text-xs text-text-muted">
                        {item.moderationStatus === 'needs_review' ? 'Cần xem xét' : 'Đã duyệt'}
                      </span>
                      {item.report && (
                        <span className="rounded-full border border-accent-yellow/20 bg-accent-yellow/[0.08] px-2.5 py-1 text-xs text-accent-yellow">
                          {STATUS_TEXT[item.report.status]}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-text-muted">
                      Người đăng: {item.ownerName} · {item.category} · Tình trạng sách: {item.bookStatus}
                    </p>
                    {item.report && (
                      <p className="mt-1 text-sm text-text-muted">
                        {REASON_TEXT[item.report.reason]} · Người báo cáo: {item.report.reporterName ?? 'Thành viên'}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-text-muted">
                      Đăng {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}
                      {item.report ? ` · Báo cáo ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.report.createdAt))}` : ''}
                    </p>
                  </div>
                  <Link to={`/books/${item.bookId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-yellow hover:underline">
                    Mở bài đăng <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <button
                  type="button"
                  className="mt-4 w-full rounded-xl border border-glass/10 px-3 py-2 text-left text-sm font-semibold text-text-primary transition-colors hover:bg-[rgb(var(--color-interactive-surface)/.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
                  aria-expanded={expanded}
                  aria-controls={`book-guard-detail-${item.bookId}`}
                  onClick={() => setExpandedBookId(expanded ? null : item.bookId)}
                >
                  {expanded ? 'Ẩn chi tiết kiểm duyệt' : 'Xem chi tiết và tín hiệu'}
                </button>

                {expanded && (
                  <div id={`book-guard-detail-${item.bookId}`} className="mt-3 rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.5)] p-4">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,.8fr)]">
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">Booki Guard · Nguồn: {item.moderationSource}</h4>
                        <p className="mt-1 text-xs text-text-muted">
                          Mức {item.riskLevel.toLowerCase()} là tín hiệu tham khảo, không phải kết luận về người đăng.
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-text-primary">
                          {item.riskReasons.map((reason) => <li key={reason} className="flex gap-2"><span aria-hidden="true">•</span><span>{reason}</span></li>)}
                        </ul>
                        {item.decision && (
                          <p className="mt-3 text-xs font-medium text-text-muted">
                            Quyết định đã lưu: {item.decision === 'marked_safe' ? 'Đánh dấu an toàn' : 'Giữ bài đăng'}
                            {item.reviewedAt ? ` · ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.reviewedAt))}` : ''}
                          </p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary">Thông tin để đối chiếu</h4>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-muted">{item.description}</p>
                        {item.report?.details && (
                          <p className="mt-3 whitespace-pre-wrap border-l-2 border-accent-yellow/40 pl-3 text-sm text-text-primary">
                            Báo cáo: {item.report.details}
                          </p>
                        )}
                        <p className="mt-3 rounded-lg border border-glass/10 px-3 py-2 text-xs text-text-muted">
                          {item.imageReviewStatus === 'manual_review'
                            ? 'Ảnh chưa được phân loại tự động; cần xem trực tiếp khi duyệt.'
                            : 'Bài đăng không có ảnh cần kiểm tra.'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-glass/10 pt-3">
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void reviewBook(item, 'kept')}>
                        Giữ bài đăng
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void reviewBook(item, 'marked_safe')}>
                        Đánh dấu an toàn
                      </Button>
                      {item.report && (
                        <>
                          <Button size="sm" variant="outline" disabled={busy || item.report.status === 'reviewed'} onClick={() => void updateStatus(item, 'reviewed')}>
                            Đánh dấu đã xem
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy || item.report.status === 'resolved'} onClick={() => void updateStatus(item, 'resolved')}>
                            Giải quyết báo cáo
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => setDeleteTarget(item)}>
                        <AlertTriangle aria-hidden="true" className="h-4 w-4" /> Gỡ bài đăng
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            )})}
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
                Email và tọa độ riêng tư không hiển thị. Chỉ Owner được cấp vai trò; Moderator có thể xem xét tín hiệu, xử lý báo cáo và gỡ nội dung.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="search"
                aria-label="Tìm thành viên"
                placeholder="Tìm theo tên"
                value={memberSearch}
                onChange={(event) => {
                  setMemberSearch(event.target.value)
                  setMemberPage(1)
                }}
                className="field-control px-3 py-2 text-sm"
              />
              <select
                aria-label="Lọc thành viên theo vai trò"
                value={memberRoleFilter}
                onChange={(event) => {
                  setMemberRoleFilter(event.target.value as MemberRoleFilter)
                  setMemberPage(1)
                }}
                className="field-control px-3 py-2 text-sm"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="user">Thành viên</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <select
                aria-label="Sắp xếp thành viên theo ngày tham gia"
                value={memberSort}
                onChange={(event) => setMemberSort(event.target.value as 'newest' | 'oldest')}
                className="field-control px-3 py-2 text-sm"
              >
                <option value="newest">Tham gia mới nhất</option>
                <option value="oldest">Tham gia cũ nhất</option>
              </select>
            </div>
            {localQaAvailable && syntheticUsers.length > 0 && (
              <p className="text-sm text-text-muted">
                Thành viên thật: {staffUsers.length}. Hồ sơ QA riêng biệt: {syntheticUsers.length}. Tổng dòng có thể duyệt: {staffUsers.length + syntheticUsers.length}.
              </p>
            )}
            {usersError ? (
              <p className="rounded-xl border border-accent-rose/20 p-3 text-sm text-accent-rose" role="alert">{usersError}</p>
            ) : filteredMembers.length === 0 ? (
              <div className="glass-card rounded-2xl p-5 text-sm text-text-muted">Chưa có hồ sơ thành viên để hiển thị.</div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-glass/10">
                <table className="w-full min-w-[34rem] text-left text-sm">
                  <thead className="bg-[rgb(var(--color-interactive-surface)/.8)] text-xs text-text-muted">
                    <tr><th scope="col" className="px-4 py-3">Thành viên</th><th scope="col" className="px-4 py-3">Tham gia</th><th scope="col" className="px-4 py-3">Vai trò</th></tr>
                  </thead>
                  <tbody className="divide-y divide-glass/10">
                    {visibleMembers.map((member) => (
                      <tr key={member.userId}>
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {member.fullName}
                          {member.synthetic && <span className="ml-2 rounded-full border border-accent-yellow/25 px-2 py-0.5 text-[10px] font-bold text-accent-yellow">QA local</span>}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(member.joinedAt))}</td>
                        <td className="px-4 py-3">
                          {role === 'owner' && member.role !== 'owner' && !member.synthetic ? (
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
              <span>
                {filteredMembers.length === 0 ? 'Không có kết quả.' : `Hiển thị ${(memberPage - 1) * 25 + 1}-${Math.min(memberPage * 25, filteredMembers.length)} / ${filteredMembers.length}`}
              </span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={memberPage <= 1} onClick={() => setMemberPage((page) => page - 1)}>Trước</Button>
                <span className="self-center" aria-live="polite">Trang {memberPage} / {memberPageCount}</span>
                <Button type="button" size="sm" variant="secondary" disabled={memberPage >= memberPageCount} onClick={() => setMemberPage((page) => page + 1)}>Sau</Button>
              </div>
            </div>
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
          onMouseDown={(event) => { if (event.target === event.currentTarget && busyId !== deleteTarget.bookId) setDeleteTarget(null) }}
          onKeyDown={(event) => { if (event.key === 'Escape' && busyId !== deleteTarget.bookId) setDeleteTarget(null) }}
        >
          <section role="alertdialog" aria-modal="true" aria-labelledby="moderation-delete-title" className="glass-card w-full max-w-md rounded-2xl p-5">
            <h2 id="moderation-delete-title" className="text-lg font-bold text-text-primary">Gỡ bài đăng này?</h2>
            <p className="mt-2 text-sm text-text-muted">
              “{deleteTarget.title}” và các báo cáo liên quan sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={busyId === deleteTarget.bookId} onClick={() => setDeleteTarget(null)}>Hủy</Button>
              <Button variant="danger" disabled={busyId === deleteTarget.bookId} onClick={() => void deleteReportedBook()}>
                {busyId === deleteTarget.bookId ? 'Đang gỡ...' : 'Xác nhận gỡ'}
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
