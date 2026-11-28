import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, HandHeart, Search, Send } from 'lucide-react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import { useToast } from '../hooks/useToast'
import { getSupabaseClient } from '../lib/supabase'

type RequestStatus = 'searching' | 'has_offer' | 'confirmed' | 'fulfilled' | 'closed' | 'expired' | 'cancelled'

interface BorrowingRequestRow {
  id: string
  requester_id: string
  title: string
  author: string | null
  isbn: string | null
  cover_image_url: string | null
  description: string | null
  desired_start_date: string | null
  duration_days: number | null
  expected_return_date: string | null
  pickup_area: string | null
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at?: string
}

interface BorrowingOfferRow {
  id: string
  request_id: string
  lender_id: string
  message: string | null
  offered_start_date: string
  offered_end_date: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'cancelled'
  created_at: string
}

interface LoanRow {
  id: string
  request_id: string
  offer_id: string
  borrower_id: string
  lender_id: string
  start_date: string
  expected_return_date: string
  actual_return_date: string | null
  status: 'active' | 'awaiting_return_confirmation' | 'completed' | 'cancelled'
  created_at: string
  completed_at: string | null
}

interface LoanExtensionRow {
  id: string
  loan_id: string
  requester_id: string
  requested_return_date: string
  reason: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
}

interface BorrowingNotificationRow {
  id: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  searching: 'Đang tìm mượn',
  has_offer: 'Đã có người đề nghị',
  confirmed: 'Đang chờ xác nhận',
  fulfilled: 'Đã tìm được sách',
  closed: 'Đã đóng yêu cầu',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
}

export function BorrowingPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const supabase = getSupabaseClient()
  const [tab, setTab] = useState<'discover' | 'mine' | 'loans'>('discover')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open')
  const [requests, setRequests] = useState<BorrowingRequestRow[]>([])
  const [offers, setOffers] = useState<BorrowingOfferRow[]>([])
  const [loans, setLoans] = useState<LoanRow[]>([])
  const [loanExtensions, setLoanExtensions] = useState<LoanExtensionRow[]>([])
  const [notifications, setNotifications] = useState<BorrowingNotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editTarget, setEditTarget] = useState<BorrowingRequestRow | null>(null)

  useEffect(() => {
    if (!supabase || !user) return
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        let requestQuery = supabase
          .from('borrowing_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        if (statusFilter === 'open') requestQuery = requestQuery.in('status', ['searching', 'has_offer'])
        if (tab === 'mine') requestQuery = requestQuery.eq('requester_id', user.id)
        if (query.trim()) {
          const term = query.trim()
          requestQuery = requestQuery.or(`title.ilike.%${term}%,author.ilike.%${term}%`)
        }
        const [requestResult, offerResult, loanResult, extensionResult, notificationResult] = await Promise.all([
          requestQuery,
          supabase.from('borrowing_offers').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('book_loans').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('loan_extensions').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('in_app_notifications').select('*').order('created_at', { ascending: false }).limit(20),
        ])
        if (requestResult.error) throw requestResult.error
        if (offerResult.error) throw offerResult.error
        if (loanResult.error) throw loanResult.error
        if (extensionResult.error) throw extensionResult.error
        if (notificationResult.error) throw notificationResult.error
        if (!cancelled) {
          setRequests((requestResult.data ?? []) as BorrowingRequestRow[])
          setOffers((offerResult.data ?? []) as BorrowingOfferRow[])
          setLoans((loanResult.data ?? []) as LoanRow[])
          setLoanExtensions((extensionResult.data ?? []) as LoanExtensionRow[])
          setNotifications((notificationResult.data ?? []) as BorrowingNotificationRow[])
        }
      } catch (cause) {
        console.error('Unable to load borrowing data', cause)
        if (!cancelled) showToast('Chưa thể tải dữ liệu mượn sách. Hãy thử lại nha.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [query, refreshKey, statusFilter, supabase, tab, user, showToast])

  const myLoanData = useMemo(() => {
    if (!user) return { borrowed: [] as LoanRow[], lent: [] as LoanRow[], completed: [] as LoanRow[] }
    const borrowed = loans.filter((loan) => loan.borrower_id === user.id)
    const lent = loans.filter((loan) => loan.lender_id === user.id)
    return {
      borrowed,
      lent,
      completed: [...borrowed, ...lent].filter((loan, index, all) =>
        loan.status === 'completed' && all.findIndex((item) => item.id === loan.id) === index),
    }
  }, [loans, user])

  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const { error } = await supabase.rpc('create_borrowing_request', {
        p_title: String(form.get('title') ?? ''),
        p_author: String(form.get('author') ?? ''),
        p_isbn: String(form.get('isbn') ?? ''),
        p_description: String(form.get('description') ?? ''),
        p_desired_start_date: String(form.get('desired_start_date') ?? '') || null,
        p_duration_days: Number(form.get('duration_days')) || null,
        p_expected_return_date: String(form.get('expected_return_date') ?? '') || null,
        p_pickup_area: String(form.get('pickup_area') ?? ''),
        p_notes: String(form.get('notes') ?? ''),
      })
      if (error) throw error
      setCreateOpen(false)
      setTab('mine')
      setRefreshKey((value) => value + 1)
      showToast('Đã đăng yêu cầu tìm mượn sách.', 'success')
    } catch (cause) {
      console.error('Unable to create borrowing request', cause)
      showToast('Chưa thể đăng yêu cầu. Kiểm tra lại thông tin nha.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const editRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !editTarget) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_borrowing_request', {
        p_request_id: editTarget.id,
        p_action: 'edit',
        p_title: String(form.get('title') ?? ''),
        p_author: String(form.get('author') ?? ''),
        p_isbn: String(form.get('isbn') ?? ''),
        p_description: String(form.get('description') ?? ''),
        p_desired_start_date: String(form.get('desired_start_date') ?? '') || null,
        p_duration_days: Number(form.get('duration_days')) || null,
        p_expected_return_date: String(form.get('expected_return_date') ?? '') || null,
        p_pickup_area: String(form.get('pickup_area') ?? ''),
        p_notes: String(form.get('notes') ?? ''),
      })
      if (error) throw error
      setEditTarget(null)
      setRefreshKey((value) => value + 1)
      showToast('Đã cập nhật yêu cầu tìm mượn.', 'success')
    } catch (cause) {
      console.error('Unable to edit borrowing request', cause)
      showToast('Chưa thể sửa yêu cầu. Hãy kiểm tra lại thông tin nha.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const manageRequest = async (request: BorrowingRequestRow, action: 'cancel' | 'close' | 'reopen') => {
    if (!supabase) return
    const confirmation = action === 'cancel'
      ? 'Hủy yêu cầu này? Các đề nghị đang chờ sẽ bị hủy.'
      : action === 'close'
        ? 'Đóng yêu cầu đã hoàn tất?'
        : 'Mở lại yêu cầu này?'
    if (!window.confirm(confirmation)) return
    try {
      const { error } = await supabase.rpc('update_borrowing_request', {
        p_request_id: request.id,
        p_action: action,
      })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast(action === 'cancel' ? 'Đã hủy yêu cầu.' : action === 'close' ? 'Đã đóng yêu cầu.' : 'Đã mở lại yêu cầu.', 'success')
    } catch (cause) {
      console.error('Unable to manage borrowing request', cause)
      showToast('Chưa thể cập nhật yêu cầu. Trạng thái hiện tại có thể đã thay đổi.', 'error')
    }
  }

  const offerToLend = async (request: BorrowingRequestRow) => {
    if (!supabase) return
    const start = window.prompt('Nhập ngày có thể bắt đầu cho mượn (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
    if (!start) return
    const end = window.prompt('Nhập ngày dự kiến nhận lại sách (YYYY-MM-DD)')
    if (!end) return
    const message = window.prompt('Lời nhắn cho người yêu cầu (không bắt buộc)', '') ?? ''
    try {
      const { error } = await supabase.rpc('create_borrowing_offer', {
        p_request_id: request.id,
        p_message: message,
        p_start_date: start,
        p_end_date: end,
      })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast('Đã gửi đề nghị cho mượn.', 'success')
    } catch (cause) {
      console.error('Unable to create lending offer', cause)
      showToast('Chưa thể gửi đề nghị. Hãy kiểm tra khoảng thời gian nha.', 'error')
    }
  }

  const acceptOffer = async (offerId: string) => {
    if (!supabase) return
    try {
      const { error } = await supabase.rpc('accept_borrowing_offer', { p_offer_id: offerId })
      if (error) throw error
      setTab('loans')
      setRefreshKey((value) => value + 1)
      showToast('Đã xác nhận đề nghị và tạo phiếu mượn.', 'success')
    } catch (cause) {
      console.error('Unable to accept borrowing offer', cause)
      showToast('Chưa thể xác nhận đề nghị này.', 'error')
    }
  }

  const respondOffer = async (offerId: string, action: 'reject' | 'withdraw') => {
    if (!supabase) return
    if (!window.confirm(action === 'withdraw' ? 'Rút đề nghị cho mượn này?' : 'Từ chối đề nghị cho mượn này?')) return
    try {
      const { error } = await supabase.rpc('respond_borrowing_offer', {
        p_offer_id: offerId,
        p_action: action,
      })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast(action === 'withdraw' ? 'Đã rút đề nghị cho mượn.' : 'Đã từ chối đề nghị cho mượn.', 'success')
    } catch (cause) {
      console.error('Unable to respond to borrowing offer', cause)
      showToast('Chưa thể cập nhật đề nghị.', 'error')
    }
  }

  const markReturned = async (loanId: string) => {
    if (!supabase) return
    try {
      const { error } = await supabase.rpc('mark_loan_returned', { p_loan_id: loanId })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast('Đã đánh dấu trả sách, chờ người cho mượn xác nhận.', 'success')
    } catch (cause) {
      console.error('Unable to mark loan returned', cause)
      showToast('Chưa thể cập nhật trạng thái trả sách.', 'error')
    }
  }

  const confirmReturn = async (loanId: string) => {
    if (!supabase) return
    try {
      const { error } = await supabase.rpc('confirm_loan_return', { p_loan_id: loanId })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast('Đã xác nhận nhận lại sách.', 'success')
    } catch (cause) {
      console.error('Unable to confirm returned loan', cause)
      showToast('Chưa thể xác nhận nhận lại sách.', 'error')
    }
  }

  const requestExtension = async (loanId: string) => {
    if (!supabase) return
    const requestedDate = window.prompt('Nhập ngày trả mới (YYYY-MM-DD)')
    if (!requestedDate) return
    const reason = window.prompt('Lý do gia hạn (không bắt buộc)', '') ?? ''
    try {
      const { error } = await supabase.rpc('request_loan_extension', {
        p_loan_id: loanId,
        p_requested_date: requestedDate,
        p_reason: reason,
      })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast('Đã gửi yêu cầu gia hạn.', 'success')
    } catch (cause) {
      console.error('Unable to request loan extension', cause)
      showToast('Chưa thể gửi gia hạn. Ngày mới phải sau ngày hẹn trả hiện tại.', 'error')
    }
  }

  const respondExtension = async (extensionId: string, accept: boolean) => {
    if (!supabase) return
    try {
      const { error } = await supabase.rpc('respond_loan_extension', {
        p_extension_id: extensionId,
        p_accept: accept,
      })
      if (error) throw error
      setRefreshKey((value) => value + 1)
      showToast(accept ? 'Đã chấp nhận gia hạn.' : 'Đã từ chối gia hạn.', 'success')
    } catch (cause) {
      console.error('Unable to respond to loan extension', cause)
      showToast('Chưa thể cập nhật yêu cầu gia hạn.', 'error')
    }
  }

  const openNotification = async (notification: BorrowingNotificationRow) => {
    if (supabase && !notification.read_at) {
      await supabase
        .from('in_app_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notification.id)
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    )
    setTab('loans')
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">CỘNG ĐỒNG CHIA SẺ</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Tìm mượn sách</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">Đăng yêu cầu, nhận đề nghị cho mượn và theo dõi hạn trả trong Booki.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Send className="h-4 w-4" /> Đăng yêu cầu
        </Button>
      </header>

      {notifications.filter((notification) => !notification.read_at).slice(0, 3).map((notification) => (
        <button
          key={notification.id}
          type="button"
          onClick={() => void openNotification(notification)}
          className="glass-card w-full rounded-2xl border border-accent-yellow/15 p-4 text-left"
        >
          <p className="text-sm font-bold text-text-primary">{notification.title}</p>
          <p className="mt-1 text-sm text-text-muted">{notification.body}</p>
        </button>
      ))}

      {createOpen && (
        <form onSubmit={(event) => void createRequest(event)} className="glass-card grid gap-3 rounded-2xl p-4 sm:grid-cols-2 sm:p-6">
          <label className="text-sm font-medium text-text-primary sm:col-span-2">
            Tên sách <span className="text-accent-rose">*</span>
            <input name="title" required maxLength={200} className="field-control mt-1.5" placeholder="Ví dụ: Nhà giả kim" />
          </label>
          <label className="text-sm text-text-primary">Tác giả<input name="author" maxLength={200} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">ISBN<input name="isbn" maxLength={32} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary sm:col-span-2">Mô tả thêm<textarea name="description" rows={3} maxLength={1000} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Ngày muốn bắt đầu<input name="desired_start_date" type="date" className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Số ngày dự kiến<input name="duration_days" type="number" min={1} max={365} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Ngày dự kiến trả<input name="expected_return_date" type="date" className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Khu vực nhận sách<input name="pickup_area" maxLength={200} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary sm:col-span-2">Ghi chú thêm<textarea name="notes" rows={2} maxLength={1000} className="field-control mt-1.5" /></label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Đang đăng...' : 'Đăng yêu cầu'}</Button>
          </div>
        </form>
      )}

      {editTarget && (
        <form onSubmit={(event) => void editRequest(event)} className="glass-card grid gap-3 rounded-2xl border border-accent-yellow/20 p-4 sm:grid-cols-2 sm:p-6">
          <h2 className="text-lg font-bold text-text-primary sm:col-span-2">Sửa yêu cầu tìm mượn</h2>
          <label className="text-sm font-medium text-text-primary sm:col-span-2">
            Tên sách <span className="text-accent-rose">*</span>
            <input name="title" required maxLength={200} defaultValue={editTarget.title} className="field-control mt-1.5" />
          </label>
          <label className="text-sm text-text-primary">Tác giả<input name="author" maxLength={200} defaultValue={editTarget.author ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">ISBN<input name="isbn" maxLength={32} defaultValue={editTarget.isbn ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary sm:col-span-2">Mô tả thêm<textarea name="description" rows={3} maxLength={1000} defaultValue={editTarget.description ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Ngày muốn bắt đầu<input name="desired_start_date" type="date" defaultValue={editTarget.desired_start_date ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Số ngày dự kiến<input name="duration_days" type="number" min={1} max={365} defaultValue={editTarget.duration_days ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Ngày dự kiến trả<input name="expected_return_date" type="date" defaultValue={editTarget.expected_return_date ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary">Khu vực nhận sách<input name="pickup_area" maxLength={200} defaultValue={editTarget.pickup_area ?? ''} className="field-control mt-1.5" /></label>
          <label className="text-sm text-text-primary sm:col-span-2">Ghi chú thêm<textarea name="notes" rows={2} maxLength={1000} defaultValue={editTarget.notes ?? ''} className="field-control mt-1.5" /></label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Hủy</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(['discover', 'mine', 'loans'] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`filter-chip min-h-10 rounded-xl px-4 py-2 text-sm ${tab === item ? 'is-active' : ''}`}>
            {item === 'discover' ? 'Khám phá' : item === 'mine' ? 'Yêu cầu của tôi' : 'Quản lý mượn/trả'}
          </button>
        ))}
      </div>

      {tab !== 'loans' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="field-control pl-9" placeholder="Tìm theo tên sách hoặc tác giả" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'open' | 'all')} className="field-control sm:w-48">
            <option value="open">Chưa hoàn tất</option>
            <option value="all">Tất cả trạng thái</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <div key={item} className="glass-card h-48 animate-pulse rounded-2xl" />)}</div>
      ) : tab === 'loans' ? (
        <LoanDashboard
          borrowed={myLoanData.borrowed}
          lent={myLoanData.lent}
          completed={myLoanData.completed}
          extensions={loanExtensions}
          onMarkReturned={(id) => void markReturned(id)}
          onConfirmReturn={(id) => void confirmReturn(id)}
          onRequestExtension={(id) => void requestExtension(id)}
          onRespondExtension={(id, accept) => void respondExtension(id, accept)}
        />
      ) : requests.length === 0 ? (
        <EmptyState title="Chưa có yêu cầu phù hợp" description="Thử từ khóa khác hoặc đăng một yêu cầu của riêng bạn." actionLabel="Đăng yêu cầu" onAction={() => setCreateOpen(true)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {requests.map((request) => {
            const own = request.requester_id === user.id
            const requestOffers = offers.filter((offer) => offer.request_id === request.id)
            return (
              <article key={request.id} className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-text-primary">{request.title}</h2>
                    {request.author && <p className="mt-1 text-sm text-text-muted">{request.author}</p>}
                  </div>
                  <span className="rounded-full border border-glass/10 px-2.5 py-1 text-xs text-text-muted">{STATUS_LABELS[request.status]}</span>
                </div>
                {request.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-muted">{request.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-muted">
                  {request.pickup_area && <span className="rounded-lg bg-[rgb(var(--color-interactive-surface)/.7)] px-2 py-1">{request.pickup_area}</span>}
                  {request.expected_return_date && <span className="inline-flex items-center gap-1 rounded-lg bg-[rgb(var(--color-interactive-surface)/.7)] px-2 py-1"><CalendarDays className="h-3 w-3" />Trả trước {formatDate(request.expected_return_date)}</span>}
                  <span className="rounded-lg bg-[rgb(var(--color-interactive-surface)/.7)] px-2 py-1">Cập nhật {formatDate(request.updated_at ?? request.created_at)}</span>
                </div>
                {own && requestOffers.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-glass/10 pt-3">
                    {requestOffers.map((offer) => (
                      <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass/10 p-3">
                        <p className="text-sm text-text-muted">
                          {offer.message || 'Có đề nghị cho mượn sách này.'}<br />
                          <span className="text-xs">{formatDate(offer.offered_start_date)} → {formatDate(offer.offered_end_date)} · {offerStatusLabel(offer.status)}</span>
                        </p>
                        {offer.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => void acceptOffer(offer.id)}>Chấp nhận</Button>
                            <Button size="sm" variant="outline" onClick={() => void respondOffer(offer.id, 'reject')}>Từ chối</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {own && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-glass/10 pt-3">
                    {['searching', 'has_offer'].includes(request.status) && (
                      <Button size="sm" variant="outline" onClick={() => setEditTarget(request)}>Sửa yêu cầu</Button>
                    )}
                    {['searching', 'has_offer', 'confirmed'].includes(request.status) && (
                      <Button size="sm" variant="outline" onClick={() => void manageRequest(request, 'cancel')}>Hủy yêu cầu</Button>
                    )}
                    {['confirmed', 'fulfilled'].includes(request.status) && (
                      <Button size="sm" variant="outline" onClick={() => void manageRequest(request, 'close')}>Đóng yêu cầu</Button>
                    )}
                    {['cancelled', 'closed', 'expired'].includes(request.status) && (
                      <Button size="sm" variant="outline" onClick={() => void manageRequest(request, 'reopen')}>Mở lại</Button>
                    )}
                  </div>
                )}
                {!own && ['searching', 'has_offer'].includes(request.status) && (
                  (() => {
                    const ownOffer = offers.find((offer) => offer.request_id === request.id && offer.lender_id === user.id)
                    return ownOffer ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-glass/10 pt-3">
                        <span className="text-xs text-text-muted">Đề nghị của bạn: {offerStatusLabel(ownOffer.status)}</span>
                        {ownOffer.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => void respondOffer(ownOffer.id, 'withdraw')}>Rút đề nghị</Button>
                        )}
                      </div>
                    ) : (
                      <Button type="button" size="sm" className="mt-4" onClick={() => void offerToLend(request)}>
                        <HandHeart className="h-4 w-4" /> Tôi có thể cho mượn
                      </Button>
                    )
                  })()
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LoanDashboard({
  borrowed,
  lent,
  completed,
  extensions,
  onMarkReturned,
  onConfirmReturn,
  onRequestExtension,
  onRespondExtension,
}: {
  borrowed: LoanRow[]
  lent: LoanRow[]
  completed: LoanRow[]
  extensions: LoanExtensionRow[]
  onMarkReturned: (id: string) => void
  onConfirmReturn: (id: string) => void
  onRequestExtension: (id: string) => void
  onRespondExtension: (id: string, accept: boolean) => void
}) {
  const active = [...borrowed, ...lent].filter((loan) => loan.status !== 'completed')
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="font-bold text-text-primary">Sách đang theo dõi</h2>
        {active.length === 0 ? <p className="mt-3 text-sm text-text-muted">Chưa có phiếu mượn/trả đang hoạt động.</p> : (
          <div className="mt-3 space-y-3">
            {active.map((loan) => {
              const borrowing = borrowed.some((item) => item.id === loan.id)
              const remaining = daysUntil(loan.expected_return_date)
              const pendingExtensions = extensions.filter((extension) =>
                extension.loan_id === loan.id && extension.status === 'pending')
              return (
                <article key={loan.id} className="rounded-xl border border-glass/10 p-3">
                  <p className="text-sm font-semibold text-text-primary">{borrowing ? 'Sách tôi đang mượn' : 'Sách tôi đang cho mượn'}</p>
                  <p className="mt-1 text-xs text-text-muted">Hạn trả: {formatDate(loan.expected_return_date)}</p>
                  {remaining < 0
                    ? <p className="mt-1 text-xs font-semibold text-accent-rose">Đã quá hạn {Math.abs(remaining)} ngày</p>
                    : remaining <= 3
                      ? <p className="mt-1 text-xs font-semibold text-accent-yellow">Còn {remaining} ngày đến hạn trả</p>
                      : null}
                  {borrowing && loan.status === 'active' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onMarkReturned(loan.id)}>Tôi đã trả sách</Button>
                      <Button size="sm" variant="outline" onClick={() => onRequestExtension(loan.id)}>Xin gia hạn</Button>
                    </div>
                  )}
                  {!borrowing && loan.status === 'awaiting_return_confirmation' && <Button size="sm" className="mt-3" onClick={() => onConfirmReturn(loan.id)}>Xác nhận đã nhận lại</Button>}
                  {!borrowing && pendingExtensions.map((extension) => (
                    <div key={extension.id} className="mt-3 rounded-lg border border-accent-yellow/20 bg-accent-yellow/[0.05] p-2">
                      <p className="text-xs text-text-muted">Yêu cầu gia hạn đến {formatDate(extension.requested_return_date)}{extension.reason ? ` · ${extension.reason}` : ''}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => onRespondExtension(extension.id, true)}>Chấp nhận</Button>
                        <Button size="sm" variant="outline" onClick={() => onRespondExtension(extension.id, false)}>Từ chối</Button>
                      </div>
                    </div>
                  ))}
                </article>
              )
            })}
          </div>
        )}
      </section>
      <section className="glass-card rounded-2xl p-4 sm:p-5">
        <h2 className="font-bold text-text-primary">Giao dịch đã hoàn tất</h2>
        {completed.length === 0 ? <p className="mt-3 text-sm text-text-muted">Chưa có giao dịch hoàn tất.</p> : (
          <div className="mt-3 space-y-2">
            {completed.map((loan) => (
              <p key={loan.id} className="rounded-xl border border-glass/10 p-3 text-sm text-text-muted">Hoàn tất ngày {loan.completed_at ? formatDate(loan.completed_at.slice(0, 10)) : '—'}</p>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00+07:00`)
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date)
}

function offerStatusLabel(status: BorrowingOfferRow['status']) {
  const labels: Record<BorrowingOfferRow['status'], string> = {
    pending: 'Đang chờ',
    accepted: 'Đã được chấp nhận',
    rejected: 'Đã bị từ chối',
    withdrawn: 'Đã rút',
    cancelled: 'Đã hủy',
  }
  return labels[status]
}

function daysUntil(value: string) {
  const today = new Date()
  const todayVietnam = new Date(`${today.toISOString().slice(0, 10)}T12:00:00+07:00`).getTime()
  const target = new Date(`${value.slice(0, 10)}T12:00:00+07:00`).getTime()
  return Math.ceil((target - todayVietnam) / 86400000)
}
