import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '../components/Button'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import { useToast } from '../hooks/useToast'
import { getAdapter } from '../lib/dataAdapter'
import { userFacingError } from '../lib/userFacingError'
import type { BookConversation, ChatMessage } from '../types/book'

export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.id
  const { showToast } = useToast()
  const [conversation, setConversation] = useState<BookConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatId || !userId) return
    let cancelled = false
    void Promise.all([
      getAdapter().getConversation(chatId, userId),
      getAdapter().getChatMessages(chatId),
    ])
      .then(([context, chatMessages]) => {
        if (cancelled) return
        if (!context) {
          setError('Cuộc trò chuyện không tồn tại hoặc bạn không có quyền xem.')
          return
        }
        setConversation(context)
        setMessages(chatMessages)
        setError(null)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load book conversation', cause)
        if (!cancelled) setError(userFacingError(cause, 'Chưa thể mở cuộc trò chuyện. Hãy thử lại nha.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [chatId, userId])

  useEffect(() => {
    if (!chatId || !conversation) return
    return getAdapter().subscribeToChatMessages(chatId, (message) => {
      setMessages((current) => current.some((entry) => entry.id === message.id)
        ? current
        : [...current, message])
    })
  }, [chatId, conversation])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    messageEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' })
  }, [messages])

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!chatId || !user || !draft.trim()) return
    if (draft.trim().length > 2000) {
      showToast('Tin nhắn tối đa 2000 ký tự.', 'error')
      return
    }
    setSending(true)
    try {
      const message = await getAdapter().sendChatMessage(chatId, user.id, draft)
      setMessages((current) => current.some((entry) => entry.id === message.id)
        ? current
        : [...current, message])
      setDraft('')
    } catch (cause) {
      console.error('Unable to send a book conversation message', cause)
      showToast(userFacingError(cause, 'Chưa gửi được tin nhắn. Kiểm tra kết nối rồi thử lại nha.'), 'error')
    } finally {
      setSending(false)
    }
  }

  if (!chatId || !user) {
    return <EmptyState title="Không tìm thấy cuộc trò chuyện" description="Đường dẫn này chưa có mã cuộc trò chuyện hợp lệ." actionLabel="Về lời nhắn" onAction={() => navigate('/app/requests')} />
  }
  if (loading) {
    return <div className="mx-auto max-w-3xl space-y-3 py-12" role="status" aria-label="Đang mở cuộc trò chuyện"><div className="glass-card h-20 animate-pulse rounded-2xl" /><div className="glass-card h-[50vh] animate-pulse rounded-2xl" /></div>
  }
  if (!conversation || error) {
    return <EmptyState title="Chưa mở được cuộc trò chuyện" description={error ?? 'Cuộc trò chuyện không tồn tại.'} actionLabel="Về lời nhắn" onAction={() => navigate('/app/requests')} />
  }

  const otherName = conversation.ownerId === user.id ? conversation.requesterName : conversation.ownerName

  return (
    <section className="mx-auto flex h-[calc(100dvh-11rem)] min-h-[30rem] max-w-3xl flex-col overflow-hidden rounded-2xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.7)] shadow-[0_24px_64px_rgb(0_0_0_/_0.18)]">
      <header className="flex items-center gap-3 border-b border-glass/10 p-4 sm:p-5">
        <Link to="/app/requests" aria-label="Quay lại lời nhắn" className="filter-chip grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-bold text-text-primary">{otherName}</h1>
          <p className="truncate text-xs text-text-muted">Trao đổi về <Link to={`/app/books/${conversation.book.id}`} className="font-medium text-accent-yellow hover:underline">{conversation.book.title}</Link></p>
        </div>
      </header>

      <div className="border-b border-glass/10 bg-[rgb(var(--color-interactive-surface)/.4)] px-4 py-3 text-xs text-text-muted sm:px-5">
        Giữ trao đổi lịch sự, không gửi mật khẩu hoặc thông tin nhạy cảm trong tin nhắn.
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5" aria-live="polite" aria-label="Tin nhắn">
        {messages.length === 0 ? (
          <div className="grid min-h-full place-items-center">
            <p className="max-w-sm text-center text-sm text-text-muted">Chưa có tin nhắn trong cuộc trò chuyện. Bạn có thể bắt đầu trao đổi về cuốn sách này.</p>
          </div>
        ) : messages.map((message) => {
          const mine = message.senderId === user.id
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <article className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${mine ? 'rounded-br-md bg-accent-yellow text-dark' : 'rounded-bl-md border border-glass/10 bg-[rgb(var(--color-interactive-hover)/.85)] text-text-primary'}`}>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                <time dateTime={message.createdAt} className={`mt-1 block text-right text-[10px] ${mine ? 'text-dark/65' : 'text-text-muted'}`}>
                  {new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }).format(new Date(message.createdAt))}
                </time>
              </article>
            </div>
          )
        })}
        <div ref={messageEndRef} />
      </div>

      <form onSubmit={(event) => void submitMessage(event)} className="flex items-end gap-2 border-t border-glass/10 p-3 sm:gap-3 sm:p-4">
        <label className="sr-only" htmlFor="message-draft">Tin nhắn của bạn</label>
        <textarea
          id="message-draft"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Viết tin nhắn..."
          className="field-control max-h-36 min-h-11 flex-1 resize-y px-3 py-2.5 text-sm"
        />
        <Button type="submit" disabled={sending || !draft.trim()} aria-label="Gửi tin nhắn" className="h-11 w-11 shrink-0 !px-0">
          <Send aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>
    </section>
  )
}
