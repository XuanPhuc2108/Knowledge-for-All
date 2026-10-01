import { LocateFixed } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { FadeIn } from '../components/FadeIn'
import { NearbyRadar } from '../components/NearbyRadar'
import type { Book } from '../types/book'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuthState'
import { useGeolocation } from '../hooks/useGeolocation'
import { userFacingError } from '../lib/userFacingError'

export function LocationSection({ books }: { books: Book[] }) {
  const { user, updateProfile } = useAuth()
  const { requestLocation, latitude, longitude, loading } = useGeolocation()
  const { showToast } = useToast()
  const [enabled, setEnabled] = useState(user?.locationEnabled ?? false)

  const handleEnable = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để lưu vị trí', 'info')
      return
    }
    try {
      const pos = await requestLocation()
      await updateProfile({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationAccuracy: pos.coords.accuracy,
        locationEnabled: true,
      })
      setEnabled(true)
      showToast('Đã bật định vị thành công', 'success')
    } catch (e) {
      console.error('Unable to enable location for nearby book discovery', e)
      showToast(userFacingError(e, 'Chưa bật được định vị. Hãy thử lại hoặc kiểm tra quyền truy cập vị trí của trình duyệt.'), 'error')
    }
  }

  const userLat = latitude ?? user?.latitude
  const userLng = longitude ?? user?.longitude

  return (
    <section id="location" className="px-5 py-20 sm:px-8 md:py-32 lg:px-16">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <FadeIn>
          <h2
            className="mb-6 font-black text-text-primary"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
          >
            Tìm sách ở gần bạn hơn
          </h2>
          <p className="mb-8 text-lg text-text-muted">
            Bật định vị để xem sách ở gần bạn. Booki chỉ hiển thị khoảng cách ước tính; bạn vẫn có thể lướt sách mà không chia sẻ vị trí.
          </p>
          <Button onClick={() => void handleEnable()} disabled={loading}>
            <LocateFixed className="h-4 w-4" />
            {loading ? 'Đang xác định...' : enabled ? 'Đã bật định vị' : 'Bật định vị'}
          </Button>
          <p className="mt-6 text-xs text-text-muted">
            Vị trí chính xác của bạn không hiện cho người khác đâu.
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="glass-card flex items-center justify-center rounded-card-lg p-8">
            <NearbyRadar
              books={books}
              userLat={userLat ?? undefined}
              userLng={userLng ?? undefined}
            />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
