import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookForm } from '../components/BookForm'
import { CameraCapture } from '../components/CameraCapture'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuthState'
import { useMyBooks } from '../hooks/useBooks'
import { userFacingError } from '../lib/userFacingError'
import type { CreateBookInput } from '../types/book'

export function AddBookPage() {
  const { user } = useAuth()
  const { createBook } = useMyBooks(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [submissionStage, setSubmissionStage] = useState<'uploading-cover' | 'saving-record'>('saving-record')
  const submissionLock = useRef(false)

  const handleImageCapture = (url: string) => {
    setImageUrls([url])
  }

  const handleImageRemove = () => {
    setImageUrls([])
  }

  const handleSubmit = async (data: CreateBookInput) => {
    if (!user || submissionLock.current) return

    const form = document.querySelector('form')
    const useLocation = (form?.querySelector('[name="useLocation"]') as HTMLInputElement)?.checked

    submissionLock.current = true
    setSubmissionStage(imageUrls.some((url) => url.startsWith('data:')) ? 'uploading-cover' : 'saving-record')
    setSaving(true)
    try {
      const book = await createBook(user.fullName, {
        ...data,
        imageUrls,
        ...(useLocation && user.locationEnabled && user.latitude && user.longitude
          ? { latitude: user.latitude, longitude: user.longitude }
          : {}),
      }, setSubmissionStage)
      showToast(
        book.moderationStatus === 'needs_review'
          ? 'Booki đang xem lại bài đăng xíu nha. Sách chưa hiển thị công khai trong lúc này.'
          : 'Đã đăng sách thành công.',
        book.moderationStatus === 'needs_review' ? 'info' : 'success',
      )
      navigate('/app/my-books')
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Booki] Add Book: submission failed', e)
      showToast(userFacingError(e, 'Chưa thể đăng sách. Hãy thử lại nha.'), 'error')
    } finally {
      submissionLock.current = false
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="mb-7">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent-yellow">CHIA SẺ TRI THỨC</p>
        <h1 className="text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Đăng sách mới</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">Thêm thông tin rõ ràng để mọi người tìm thấy và kết nối với bạn.</p>
      </header>
      <div className="glass-card max-w-2xl rounded-[1.5rem] p-4 sm:p-7">
        <BookForm
          imageUrls={imageUrls}
          onImageCapture={handleImageCapture}
          locationEnabled={user?.locationEnabled}
          onSubmit={handleSubmit}
          isSubmitting={saving}
          submitLabel={saving
            ? submissionStage === 'uploading-cover' ? 'Đang tải ảnh lên...' : 'Đang lưu bài đăng...'
            : 'Đăng sách'}
          cameraSlot={(
            <CameraCapture
              onImageCapture={handleImageCapture}
              onImageRemove={handleImageRemove}
              disabled={saving}
            />
          )}
        />
      </div>
    </div>
  )
}
