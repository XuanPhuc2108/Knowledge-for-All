import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Clock3, MessageCircle, X } from 'lucide-react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import { useToast } from '../hooks/useToast'
import { getAdapter, getAdapterMode } from '../lib/dataAdapter'
import { EXCHANGE_LABELS } from '../lib/constants'
import { userFacingError } from '../lib/userFacingError'
import type { ExchangeRequest } from '../types/book'

const STATUS_LABELS: Record<ExchangeRequest['status'], string> = {
  pending: 'Đang chờ phản hồi',
  accepted: 'Đã đồng ý',
  rejected: 'Chưa thể kết nối',
  cancelled: 'Đã hủy',
  completed: 'Đã hoàn tất',
}

export function RequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ExchangeRequest[]>([])
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set())
  const [reviewCheckFailedIds, setReviewCheckFailedIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [reviewTarget, setReviewTarget] = useState<ExchangeRequest | null>(null)
  const [reviewSaving, setReviewSaving] = useState(false)
  const isSupabase = getAdapterMode() === 'supabase'
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void getAdapter().getExchangeRequests(userId)
      .then(async (result) => {
        if (cancelled) return
        setRequests(result)
        const completed = result.filter((request) => request.status === 'completed')
        const ids = completed.map((request) => request.id)
        let reviewed: string[] = []
        let checkFailed = false
        try {
          reviewed = await getAdapter().getReviewedInteractionIds(ids)
        } catch (cause) {
          checkFailed = true
          console.error('Unable to check the signed-in member’s completed reviews', cause)
        }
        if (!cancelled) {
          setReviewedIds(new Set(reviewed))
          setReviewCheckFailedIds(new Set(checkFailed ? ids : []))
        }
      })
      .catch((cause: unknown) => {
        console.error('Unable to load book requests', cause)
        if (!cancelled) setError(userFacingError(cause, 'Chưa thể tải lời nhắn. Hãy thử lại nha.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [refreshKey, userId])

  const counts = useMemo(() => ({
    pending: requests.filter((request) => request.status === 'pending' && request.ownerId === user?.id).length,
    active: requests.filter((request) => request.status === 'accepted').length,
    completed: requests.filter((request) => request.status === 'completed').length,
  }), [requests, user?.id])

  const runAction = async (
    request: ExchangeRequest,
    action: 'accept' | 'reject' | 'cancel' | 'confirm-completion',
    success: string,
  ) => {
    setBusyId(request.id)
    try {
      await getAdapter().updateExchangeRequest(request.id, action)
      showToast(success, 'success')
      setRefreshKey((current) => current + 1)
    } catch (cause) {
      console.error('Unable to update a book request', cause)
      showToast(userFacingError(cause, 'Chưa thể cập nhật lời nhắn. Hãy thử lại nha.'), 'error')
    } finally {
      setBusyId(null)
    }
  }

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!reviewTarget) return
    const form = new FormData(event.currentTarget)
    const input = {
      interactionId: reviewTarget.id,
      rating: Number(form.get('rating')),
      communicationRating: Number(form.get('communication')),
      reliabilityRating: Number(form.get('reliability')),
      descriptionRating: Number(form.get('description')),
      comment: String(form.get('comment') ?? '').trim(),
    }
    if ([input.rating, input.communicationRating, input.reliabilityRating, input.descriptionRating]
      .some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 5)) {
      showToast('Chọn điểm từ 1 đến 5 cho từng tiêu chí nha.', 'error')
      return
    }
    setReviewSaving(true)
    try {
      await getAdapter().createExchangeReview(input)
      setReviewedIds((current) => new Set(current).add(reviewTarget.id))
      setReviewTarget(null)
      showToast('Cảm ơn bạn đã gửi phản hồi!', 'success')
    } catch (cause) {
      console.error('Unable to submit community feedback', cause)
      showToast(userFacingError(cause, 'Chưa thể gửi đánh giá. Hãy thử lại nha.'), 'error')
    } finally {
      setReviewSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">KẾT NỐI CỘNG ĐỒNG</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Lời nhắn & đề nghị</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          Theo dõi lời đề nghị, trò chuyện về cuốn sách và xác nhận khi hai bên đã hoàn tất.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3" aria-label="Tổng quan lời đề nghị">
        <Summary label="Đang chờ bạn" value={counts.pending} />
        <Summary label="Đang kết nối" value={counts.active} />
        <Summary label="Đã hoàn tất" value={counts.completed} />
      </section>

      {getAdapterMode() === 'local' && (
        <p className="rounded-xl border border-accent-yellow/20 bg-accent-yellow/[0.06] p-3 text-sm text-text-muted">
          Đang ở chế độ lưu trên thiết bị. Lời đề nghị chỉ có trên trình duyệt này; nhắn tin và đánh giá cộng đồng cần kết nối Supabase.
        </p>
      )}

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Đang tải lời nhắn">
          {[0, 1, 2].map((item) => <div key={item} className="glass-card h-40 animate-pulse rounded-2xl" />)}
        </div>
      ) : error ? (
        <EmptyState title="Chưa mở được lời nhắn" description={error} actionLabel="Thử lại" onAction={() => { setError(null); setLoading(true); setRefreshKey((current) => current + 1) }} />
      ) : requests.length === 0 ? (
        <EmptyState
          title="Chưa có lời nhắn nào nè"
          description="Khi bạn gửi hoặc nhận đề nghị về một cuốn sách, cuộc trò chuyện sẽ hiện ở đây."
          actionLabel="Khám phá sách"
          onAction={() => navigate('/app')}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const isOwner = request.ownerId === user.id
            const ownCompletion = isOwner ? request.ownerCompletedAt : request.requesterCompletedAt
            const otherCompletion = isOwner ? request.requesterCompletedAt : request.ownerCompletedAt
            const otherName = isOwner ? request.requesterName : request.ownerName
            return (
              <article key={request.id} className="glass-card rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-text-primary">{request.bookTitle ?? 'Bài đăng sách'}</h2>
                      <span className="rounded-full border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.8)] px-2.5 py-1 text-xs text-text-muted">
                        {STATUS_LABELS[request.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-muted">
                      {isOwner ? 'Đề nghị từ' : 'Bạn đã gửi đến'} <strong className="text-text-primary">{otherName ?? 'thành viên'}</strong>
                      {request.exchangeType && ` · ${EXCHANGE_LABELS[request.exchangeType]}`}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt))}
                  </span>
                </div>
                {request.message && (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.55)] p-3 text-sm leading-relaxed text-text-primary">
                    {request.message}
                  </p>
                )}
                {request.status === 'accepted' && isSupabase && (
                  <p className="mt-3 text-xs text-text-muted">
                    {ownCompletion
                      ? otherCompletion
                        ? 'Cả hai đã xác nhận; đang cập nhật hoàn tất.'
                        : 'Bạn đã xác nhận xong. Chờ người còn lại xác nhận để ghi nhận hoàn tất.'
                      : otherCompletion
                        ? 'Người còn lại đã xác nhận hoàn tất. Nếu đã xong, bạn xác nhận giúp nha.'
                        : 'Khi hai bên thống nhất đã xong, mỗi người xác nhận một lần.'}
                  </p>
                )}
                {reviewTarget?.id === request.id && (
                  <form onSubmit={(event) => void submitReview(event)} className="mt-4 grid gap-3 rounded-xl border border-accent-yellow/20 bg-accent-yellow/[0.04] p-4 sm:grid-cols-2">
                    <label className="text-sm text-text-primary">
                      Đánh giá chung
                      <select name="rating" defaultValue="5" className="field-control mt-1.5 px-3 py-2 text-sm">
                        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
                      </select>
                    </label>
                    <RatingSelect name="communication" label="Giao tiếp" />
                    <RatingSelect name="reliability" label="Độ tin cậy" />
                    <RatingSelect name="description" label="Đúng mô tả" />
                    <label className="text-sm text-text-primary sm:col-span-2">
                      Chia sẻ thêm (không bắt buộc)
                      <textarea name="comment" maxLength={600} rows={3} className="field-control mt-1.5 px-3 py-2 text-sm" placeholder="Giữ nội dung lịch sự và tập trung vào trải nghiệm nha." />
                    </label>
                    <div className="flex justify-end gap-2 sm:col-span-2">
                      <Button type="button" size="sm" variant="outline" disabled={reviewSaving} onClick={() => setReviewTarget(null)}>Để sau</Button>
                      <Button type="submit" size="sm" disabled={reviewSaving}>{reviewSaving ? 'Đang gửi...' : 'Gửi đánh giá'}</Button>
                    </div>
                  </form>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-glass/10 pt-3">
                  {request.chatId && ['pending', 'accepted', 'completed'].includes(request.status) && (
                    <Link to={`/app/messages/${request.chatId}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent-yellow px-3.5 py-2 text-sm font-semibold text-dark hover:brightness-105">
                      <MessageCircle aria-hidden="true" className="h-4 w-4" /> Mở cuộc trò chuyện
                    </Link>
                  )}
                  <Link to={`/app/books/${request.bookId}`} className="filter-chip inline-flex min-h-10 items-center rounded-xl px-3.5 py-2 text-sm">
                    Xem sách
                  </Link>
                  {isOwner && request.status === 'pending' && (
                    <>
                      <Button size="sm" disabled={busyId === request.id} onClick={() => void runAction(request, 'accept', 'Đã đồng ý kết nối.')}>
                        <Check aria-hidden="true" className="h-4 w-4" /> Đồng ý
                      </Button>
                      <Button size="sm" variant="outline" disabled={busyId === request.id} onClick={() => void runAction(request, 'reject', 'Đã cập nhật lời đề nghị.')}>
                        <X aria-hidden="true" className="h-4 w-4" /> Từ chối
                      </Button>
                    </>
                  )}
                  {!isOwner && request.status === 'pending' && (
                    <Button size="sm" variant="outline" disabled={busyId === request.id} onClick={() => void runAction(request, 'cancel', 'Đã hủy lời đề nghị.')}>
                      Hủy đề nghị
                    </Button>
                  )}
                  {request.status === 'accepted' && isSupabase && !ownCompletion && (
                    <Button size="sm" variant="outline" disabled={busyId === request.id} onClick={() => void runAction(request, 'confirm-completion', 'Đã ghi nhận xác nhận của bạn.')}>
                      Xác nhận đã hoàn tất
                    </Button>
                  )}
                  {request.status === 'completed' && isSupabase && !reviewedIds.has(request.id) && !reviewCheckFailedIds.has(request.id) && (
                    <Button size="sm" variant="outline" onClick={() => setReviewTarget(request)}>
                      Gửi phản hồi
                    </Button>
                  )}
                  {request.status === 'completed' && reviewedIds.has(request.id) && (
                    <span className="text-xs text-accent-teal">Bạn đã gửi phản hồi</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-3 sm:rounded-2xl sm:p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-text-primary sm:text-2xl">{value}</p>
    </div>
  )
}

function RatingSelect({ name, label }: { name: string; label: string }) {
  return (
    <label className="text-sm text-text-primary">
      {label}
      <select name={name} defaultValue="5" className="field-control mt-1.5 px-3 py-2 text-sm">
        {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
      </select>
    </label>
  )
}
