import { LocateFixed, Shield } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/Button'
import { GradientButton } from '../components/GradientButton'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../hooks/useAuthState'
import { useGeolocation } from '../hooks/useGeolocation'
import { getAdapterMode } from '../lib/dataAdapter'

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { requestLocation, loading: geoLoading } = useGeolocation()
  const { showToast } = useToast()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [saving, setSaving] = useState(false)

  if (!user) return null

  const handleSaveName = async () => {
    setSaving(true)
    try {
      await updateProfile({ fullName: fullName.trim() })
      showToast('Đã cập nhật hồ sơ', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Cập nhật thất bại', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleLocation = async () => {
    if (user.locationEnabled) {
      await updateProfile({ locationEnabled: false })
      showToast('Đã tắt định vị', 'info')
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
      showToast('Đã bật định vị', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Không thể bật định vị', 'error')
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-8 text-2xl font-black text-text-primary">Hồ sơ cá nhân</h1>

      <div className="glass-card space-y-6 rounded-card-lg p-6">
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">Họ tên</label>
          <input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-glass bg-white/5 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <p className="text-text-muted">{user.email}</p>
        </div>

        <GradientButton onClick={() => void handleSaveName()} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </GradientButton>
      </div>

      <div className="glass-card mt-6 space-y-4 rounded-card-lg p-6">
        <div className="flex items-center gap-3">
          <LocateFixed className="h-5 w-5 text-accent-blue" />
          <div>
            <p className="font-medium">Định vị</p>
            <p className="text-sm text-text-muted">
              {user.locationEnabled ? 'Đang bật' : 'Đang tắt'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => void handleToggleLocation()}
          disabled={geoLoading}
        >
          {user.locationEnabled ? 'Tắt định vị' : 'Bật định vị'}
        </Button>
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-glass bg-white/5 p-4 text-sm text-text-muted">
        <Shield className="h-5 w-5 shrink-0 text-accent-teal" />
        <p>
          Không chia sẻ vị trí chính xác của bạn cho người khác. Chỉ hiển thị khoảng cách tương đối.
          Chế độ lưu trữ: <strong className="text-text-primary">{getAdapterMode()}</strong>.
        </p>
      </div>
    </div>
  )
}
