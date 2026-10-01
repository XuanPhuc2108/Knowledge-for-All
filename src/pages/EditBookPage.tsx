import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BookForm } from '../components/BookForm'
import { CameraCapture } from '../components/CameraCapture'
import { EmptyState } from '../components/EmptyState'
import { useAuth } from '../hooks/useAuthState'
import { useToast } from '../hooks/useToast'
import { getAdapter } from '../lib/dataAdapter'
import { userFacingError } from '../lib/userFacingError'
import type { Book, CreateBookInput } from '../types/book'

export function EditBookPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    void getAdapter().getBookById(id)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setError('Không tìm thấy bài đăng.')
          return
        }
        if (result.ownerId !== user?.id) {
          setError('Bạn không có quyền chỉnh sửa bài đăng này.')
          return
        }
        setBook(result)
        setImageUrls(result.imageUrls)
      })
      .catch((cause: unknown) => {
        console.error('Unable to load a book listing for editing', cause)
        if (!cancelled) setError(userFacingError(cause, 'Chưa thể tải bài đăng. Vui lòng thử lại.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id, user?.id])

  const save = async (data: CreateBookInput) => {
    if (!user || !book) return
    setSaving(true)
    try {
      await getAdapter().updateBook(book.id, user.id, {
        ...data,
        author: data.author ?? '',
        contactPhone: data.contactPhone ?? '',
        contactEmail: data.contactEmail ?? '',
      })
      showToast('Đã cập nhật bài đăng.', 'success')
      navigate(`/app/books/${book.id}`, { replace: true })
    } catch (cause) {
      console.error('Unable to save an edited book listing', cause)
      showToast(userFacingError(cause, 'Chưa thể cập nhật bài đăng. Vui lòng thử lại.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!id) return <EmptyState title="Không tìm thấy bài đăng" description="Mã sách không hợp lệ." actionLabel="Quay lại sách của tôi" onAction={() => navigate('/app/my-books')} />
  if (loading) return <div className="py-20 text-center text-text-muted" role="status">Đang tải bài đăng...</div>
  if (error || !book) return <EmptyState title="Không thể chỉnh sửa bài đăng" description={error ?? 'Không tìm thấy sách.'} actionLabel="Quay lại sách của tôi" onAction={() => navigate('/app/my-books')} />

  return (
    <div>
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">QUẢN LÝ BÀI ĐĂNG</p>
        <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Chỉnh sửa bài đăng</h1>
        <p className="mt-2 text-sm text-text-muted">Thay đổi chỉ áp dụng cho bài đăng này.</p>
      </header>
      <div className="glass-card max-w-2xl rounded-[1.5rem] p-4 sm:p-7">
        <BookForm
          initial={book}
          imageUrls={imageUrls}
          onImageCapture={(url) => setImageUrls([url])}
          onSubmit={save}
          submitLabel={saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          isSubmitting={saving}
          cameraSlot={<CameraCapture onImageCapture={(url) => setImageUrls([url])} />}
        />
      </div>
    </div>
  )
}
