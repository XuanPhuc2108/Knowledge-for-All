import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../hooks/useToast'
import { getAdapter } from '../lib/dataAdapter'
import type { AppLayoutContext } from '../components/AppLayout'
import type { BookModerationReport, BookReportStatus } from '../types/book'

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

export function ModerationPage() {
  const { role, roleError } = useOutletContext<AppLayoutContext>()
  const { showToast } = useToast()
  const [reports, setReports] = useState<BookModerationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookModerationReport | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAdapter().getModerationReports()
      setReports(result)
    } catch (cause) {
      console.error('Unable to load moderation reports', cause)
      setError('Chưa thể tải báo cáo. Hãy kiểm tra cấu hình quyền kiểm duyệt rồi thử lại.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role && role !== 'user') void loadReports()
    else setLoading(false)
  }, [loadReports, role])

  const updateStatus = async (reportId: string, status: BookReportStatus) => {
    setBusyId(reportId)
    try {
      await getAdapter().updateModerationReport(reportId, status)
      await loadReports()
      showToast('Đã cập nhật trạng thái báo cáo.', 'success')
    } catch (cause) {
      console.error('Unable to update moderation report', cause)
      showToast('Không thể cập nhật báo cáo. Vui lòng thử lại.', 'error')
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
      await loadReports()
      showToast('Đã gỡ bài đăng vi phạm.', 'success')
    } catch (cause) {
      console.error('Unable to remove reported book', cause)
      showToast('Không thể gỡ bài đăng. Vui lòng thử lại.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (roleError) {
    return (
      <EmptyState
        title="Chưa thể xác định quyền truy cập"
        description="Khu vực này cần cấu hình vai trò trong Supabase trước khi sử dụng."
      />
    )
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
          <p className="mt-2 text-sm text-text-muted">Vai trò hiện tại: {role}. Chỉ báo cáo thật gửi từ người dùng được hiển thị.</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Đang tải báo cáo">
          {[0, 1, 2].map((item) => <div key={item} className="glass-card h-36 animate-pulse rounded-2xl" />)}
        </div>
      ) : error ? (
        <EmptyState title="Không thể tải báo cáo" description={error} actionLabel="Thử lại" onAction={() => void loadReports()} />
      ) : reports.length === 0 ? (
        <EmptyState title="Chưa có báo cáo nào" description="Khi cộng đồng gửi báo cáo bài đăng, nội dung sẽ xuất hiện tại đây." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report.id} className="glass-card rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-text-primary">{report.book?.title ?? 'Bài đăng không còn tồn tại'}</h2>
                    <span className="rounded-full border border-accent-yellow/20 bg-accent-yellow/[0.08] px-2.5 py-1 text-xs text-accent-yellow">
                      {STATUS_TEXT[report.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    {REASON_TEXT[report.reason]} · Người đăng: {report.book?.ownerName ?? 'Không xác định'}
                  </p>
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

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/80 p-4" role="presentation">
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
