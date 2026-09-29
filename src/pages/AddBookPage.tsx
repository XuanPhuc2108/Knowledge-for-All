import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookForm } from '../components/BookForm'
import { CameraCapture } from '../components/CameraCapture'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuthState'
import { useMyBooks } from '../hooks/useBooks'
import type { CreateBookInput } from '../types/book'

export function AddBookPage() {
  const { user } = useAuth()
  const { createBook } = useMyBooks(user?.id)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const handleImageCapture = (url: string) => {
    setImageUrls([url])
  }

  const handleSubmit = async (data: CreateBookInput) => {
    if (!user) return

    const form = document.querySelector('form')
    const useLocation = (form?.querySelector('[name="useLocation"]') as HTMLInputElement)?.checked

    try {
      await createBook(user.fullName, {
        ...data,
        imageUrls,
        ...(useLocation && user.locationEnabled && user.latitude && user.longitude
          ? { latitude: user.latitude, longitude: user.longitude }
          : {}),
      })
      showToast('Đã đăng sách thành công.', 'success')
      navigate('/app/my-books')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Không thể đăng sách', 'error')
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-black text-text-primary">Đăng sách mới</h1>
      <div className="max-w-2xl">
        <BookForm
          imageUrls={imageUrls}
          onImageCapture={handleImageCapture}
          locationEnabled={user?.locationEnabled}
          onSubmit={handleSubmit}
          cameraSlot={<CameraCapture onImageCapture={handleImageCapture} />}
        />
      </div>
    </div>
  )
}
