import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accessibility, Bell, BookOpen, ChevronRight, CircleUserRound, Eye, EyeOff, Gauge, History, ImagePlus, LockKeyhole, MapPin, Monitor, Moon, Palette, ShieldCheck, Smartphone, Sparkles, Sun, Trash2, Volume2, VolumeX, Zap } from 'lucide-react'
import { useAuth } from '../hooks/useAuthState'
import { useToast } from '../hooks/useToast'
import { useGeolocation } from '../hooks/useGeolocation'
import { usePwaInstall } from '../hooks/pwaContext'
import { useAppSettings } from '../hooks/useAppSettings'
import type { AppTheme, MotionPreference } from '../hooks/appSettingsTypes'
import { getAdapterMode } from '../lib/dataAdapter'
import { isValidEmail, isValidPhone, validatePassword } from '../lib/validation'
import { userFacingError } from '../lib/userFacingError'
import { Button } from '../components/Button'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { compressImage } from '../lib/imageCompression'

const fieldClass = 'field-control px-3.5 py-2.5 text-sm'

export function SettingsPage() {
  const { user, updateProfile, logout, deleteAccount, changePassword } = useAuth()
  const { showToast } = useToast()
  const { requestLocation, loading: locationLoading } = useGeolocation()
  const { canInstall, installed, isIOS, install } = usePwaInstall()
  const { settings, effectiveMotion, setSettings } = useAppSettings()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.fullName ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [phone, setPhone] = useState(user?.contactPhone ?? '')
  const [contactEmail, setContactEmail] = useState(user?.contactEmail ?? '')
  const [area, setArea] = useState(user?.areaLabel ?? '')
  const [showPhone, setShowPhone] = useState(user?.showContactPhone ?? false)
  const [showEmail, setShowEmail] = useState(user?.showContactEmail ?? false)
  const [showArea, setShowArea] = useState(user?.showArea ?? false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [permission, setPermission] = useState(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [recentBooksCount, setRecentBooksCount] = useState(readRecentBooksCount)

  if (!user) return null

  const updateAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setProfileError('Ảnh đại diện cần ở định dạng JPG, PNG, WebP hoặc AVIF.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setProfileError('Ảnh đại diện cần nhỏ hơn 8 MB.')
      return
    }
    setProfileError(null)
    setAvatarSaving(true)
    try {
      const avatarUrl = await compressImage(file, 512, 0.78)
      await updateProfile({ avatarUrl })
      setNotice('Đã cập nhật ảnh đại diện.')
      showToast('Đã cập nhật ảnh đại diện', 'success')
    } catch (cause) {
      console.error('Unable to update profile avatar', cause)
      setProfileError(userFacingError(cause, 'Chưa thể cập nhật ảnh đại diện. Hãy thử lại nha.'))
    } finally {
      setAvatarSaving(false)
    }
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileError(null)
    if (name.trim().length < 2) {
      setProfileError('Tên hiển thị cần có ít nhất 2 ký tự.')
      return
    }
    if (bio.length > 300 || area.length > 100) {
      setProfileError('Tiểu sử tối đa 300 ký tự, khu vực tối đa 100 ký tự.')
      return
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setProfileError('Số điện thoại liên hệ không hợp lệ.')
      return
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      setProfileError('Email liên hệ không hợp lệ.')
      return
    }

    setProfileSaving(true)
    try {
      await updateProfile({
        fullName: name.trim(),
        bio: bio.trim(),
        contactPhone: phone.trim(),
        contactEmail: contactEmail.trim().toLowerCase(),
        areaLabel: area.trim(),
        showContactPhone: showPhone && Boolean(phone.trim()),
        showContactEmail: showEmail && Boolean(contactEmail.trim()),
        showArea: showArea && Boolean(area.trim()),
      })
      setNotice('Đã lưu thông tin hồ sơ và quyền hiển thị.')
      showToast('Đã lưu hồ sơ', 'success')
    } catch (error) {
      console.error('Unable to save account profile and privacy settings', error)
      setProfileError(userFacingError(error, 'Chưa thể lưu hồ sơ. Hãy thử lại nha.'))
    } finally {
      setProfileSaving(false)
    }
  }

  const toggleLocation = async () => {
    try {
      if (user.locationEnabled) {
        await updateProfile({ locationEnabled: false })
        showToast('Đã tắt định vị', 'info')
        return
      }
      const position = await requestLocation()
      await updateProfile({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationAccuracy: position.coords.accuracy,
        locationEnabled: true,
      })
      showToast('Đã bật định vị', 'success')
    } catch (error) {
      console.error('Unable to update account location preference', error)
      showToast(userFacingError(error, 'Chưa thể cập nhật định vị. Hãy thử lại nha.'), 'error')
    }
  }

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setPermission('denied')
      return
    }
    try {
      const result = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission()
      setPermission(result)
      if (result === 'granted') {
        setSettings((current) => ({ ...current, notificationsEnabled: true }))
      }
    } catch (error) {
      console.error('Unable to request browser notification permission', error)
      showToast(userFacingError(error, 'Chưa thể yêu cầu quyền thông báo.'), 'error')
    }
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError(null)
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setPasswordError(passwordError)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showToast('Đã cập nhật mật khẩu', 'success')
    } catch (error) {
      console.error('Unable to change the account password', error)
      setPasswordError(userFacingError(error, 'Chưa thể đổi mật khẩu. Hãy thử lại nha.'))
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Unable to sign out from settings', error)
      showToast(userFacingError(error, 'Chưa thể đăng xuất. Hãy thử lại nha.'), 'error')
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'XOA') return
    setDeleting(true)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Unable to delete the account', error)
      showToast(userFacingError(error, 'Chưa thể xóa tài khoản. Hãy thử lại nha.'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  const installApp = async () => {
    try {
      const accepted = await install()
      if (accepted) showToast('Đã bắt đầu cài đặt ứng dụng', 'success')
    } catch (error) {
      console.error('Unable to open the app installation prompt', error)
      showToast(userFacingError(error, 'Chưa thể mở lời nhắc cài đặt.'), 'error')
    }
  }

  const clearRecentlyViewed = () => {
    if (recentBooksCount === 0) return
    if (!window.confirm('Xóa lịch sử sách đã xem trên thiết bị này?')) return
    try {
      localStorage.removeItem('booki_recent_books')
      setRecentBooksCount(0)
      showToast('Đã xóa lịch sử sách đã xem trên thiết bị này.', 'success')
    } catch (error) {
      console.error('Unable to clear locally stored recently viewed books', error)
      showToast('Không thể xóa lịch sử trên thiết bị này.', 'error')
    }
  }

  const settingsSections = [
    { href: '#account', label: 'Tài khoản', icon: CircleUserRound },
    { href: '#personal', label: 'Hồ sơ cá nhân', icon: BookOpen },
    { href: '#privacy', label: 'Quyền riêng tư', icon: ShieldCheck },
    { href: '#location', label: 'Định vị', icon: MapPin },
    { href: '#notifications', label: 'Thông báo', icon: Bell },
    { href: '#sound', label: 'Âm thanh', icon: Volume2 },
    { href: '#theme', label: 'Giao diện', icon: Palette },
    { href: '#motion', label: 'Hiệu ứng chuyển động', icon: Sparkles },
    { href: '#install', label: 'Cài ứng dụng', icon: Smartphone },
    { href: '#security', label: 'Bảo mật', icon: LockKeyhole },
  ]

  return (
    <div className="settings-page mx-auto max-w-6xl">
      <header className="settings-hero">
        <div className="settings-hero-icon"><Palette aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <p className="settings-eyebrow">KHÔNG GIAN CỦA BẠN</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">Cài đặt</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            Quản lý tài khoản, quyền riêng tư và trải nghiệm Booki trên thiết bị này.
          </p>
        </div>
        <div className="hidden rounded-full border border-accent-yellow/20 bg-accent-yellow/[0.08] px-3.5 py-2 text-xs font-semibold text-accent-yellow sm:block">
          Tài khoản cá nhân
        </div>
      </header>

      <div className="settings-layout mt-7">
        <aside className="settings-sidebar">
          <p className="settings-sidebar-label">CÀI ĐẶT</p>
          <nav aria-label="Mục cài đặt" className="settings-nav-list">
            {settingsSections.map(({ href, label, icon: Icon }) => (
              <a key={href} href={href} className="settings-nav-link">
                <Icon aria-hidden="true" className="h-[17px] w-[17px]" />
                <span>{label}</span>
                <ChevronRight aria-hidden="true" className="settings-nav-chevron" />
              </a>
            ))}
          </nav>
          <div className="settings-sidebar-note">
            <span className="settings-status-dot" />
            <span>Cài đặt thiết bị được lưu riêng tư</span>
          </div>
        </aside>

        <main className="settings-sections space-y-4">

      <section id="account" className="settings-panel">
        <SectionHeading title="Tài khoản" detail="Địa chỉ dùng để đăng nhập và nhận xác nhận." />
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <ReadOnlyValue label="Tên" value={user.fullName} />
          <ReadOnlyValue label="Email đăng nhập" value={user.email} />
          <ReadOnlyValue label="Chế độ lưu trữ" value={getAdapterMode() === 'supabase' ? 'Supabase' : 'Chỉ trên thiết bị'} />
        </dl>
      </section>

      <section id="personal" className="settings-panel">
        <SectionHeading title="Thông tin cá nhân & liên hệ" detail="Thông tin tùy chọn; email đăng nhập không bị thay đổi tại đây." />
        {notice && <p className="mt-4 rounded-lg bg-accent-teal/10 p-3 text-sm text-accent-teal" role="status">{notice}</p>}
        {profileError && <p className="mt-4 rounded-lg bg-accent-rose/10 p-3 text-sm text-accent-rose" role="alert">{profileError}</p>}
        <form onSubmit={(event) => void saveProfile(event)} className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {user.avatarUrl ? (
              <ImageWithSkeleton
                src={user.avatarUrl}
                alt=""
                width={72}
                height={72}
                loading="lazy"
                wrapperClassName="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl"
                className="h-full w-full rounded-2xl border border-glass/10 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-2xl border border-accent-yellow/20 bg-accent-yellow/10 text-2xl font-bold text-accent-yellow">
                {user.fullName.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(event) => void updateAvatar(event)}
                className="sr-only"
                aria-label="Chọn ảnh đại diện"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={avatarSaving}
                onClick={() => avatarInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {avatarSaving ? 'Đang cập nhật ảnh...' : 'Đổi ảnh đại diện'}
              </Button>
              <p className="mt-1.5 text-xs text-text-muted">Ảnh được tự động thu nhỏ trước khi tải lên.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="display-name" label="Tên hiển thị" value={name} onChange={setName} required maxLength={100} autoComplete="name" />
            <TextField id="contact-phone" label="Số điện thoại liên hệ" value={phone} onChange={setPhone} type="tel" placeholder="Để trống nếu không muốn lưu" autoComplete="tel" />
            <TextField id="contact-email" label="Email liên hệ" value={contactEmail} onChange={setContactEmail} type="email" placeholder="Để trống nếu không muốn lưu" autoComplete="email" />
            <TextField id="area-label" label="Khu vực (không phải địa chỉ)" value={area} onChange={setArea} maxLength={100} placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">Giới thiệu</label>
            <textarea id="bio" rows={3} maxLength={300} value={bio} onChange={(event) => setBio(event.target.value)} className={fieldClass} />
            <p className="mt-1 text-right text-xs text-text-muted">{bio.length}/300</p>
          </div>
          <Button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </Button>
        </form>
      </section>

      <section id="privacy" className="settings-panel">
        <SectionHeading title="Quyền riêng tư" detail="Thông tin công khai được giới hạn ở hồ sơ rút gọn và tùy chọn bên dưới." />
        <div className="mt-3 divide-y divide-white/5">
          <PrivacyToggle label="Hiển thị điện thoại liên hệ công khai" checked={showPhone} onChange={setShowPhone} disabled={!phone.trim()} />
          <PrivacyToggle label="Hiển thị email liên hệ công khai" checked={showEmail} onChange={setShowEmail} disabled={!contactEmail.trim()} />
          <PrivacyToggle label="Hiển thị khu vực trên hồ sơ sách" checked={showArea} onChange={setShowArea} disabled={!area.trim()} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Các tùy chọn có hiệu lực sau khi bấm “Lưu hồ sơ”. Vị trí chính xác và email đăng nhập không được đưa vào hồ sơ công khai.
        </p>
        <div className="mt-5 flex flex-col gap-3 border-t border-glass/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <History aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text-primary">Lịch sử sách đã xem</p>
              <p className="mt-1 text-xs text-text-muted">
                {recentBooksCount > 0
                  ? `${recentBooksCount} sách được lưu riêng trên thiết bị này.`
                  : 'Chưa có lịch sử xem trên thiết bị này.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={recentBooksCount === 0}
            onClick={clearRecentlyViewed}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Xóa lịch sử
          </Button>
        </div>
      </section>

      <section id="location" className="settings-panel">
        <SectionHeading title="Định vị" detail={user.locationEnabled ? 'Đang bật; chỉ dùng để xếp sách theo khoảng cách.' : 'Đang tắt; không lưu tọa độ.'} />
        <Button className="mt-4" variant="outline" disabled={locationLoading} onClick={() => void toggleLocation()}>
          {locationLoading ? 'Đang xác định...' : user.locationEnabled ? 'Tắt định vị và xóa tọa độ' : 'Bật định vị'}
        </Button>
      </section>

      <section id="notifications" className="settings-panel">
        <SectionHeading title="Thông báo" detail="Quyền thông báo của trình duyệt trên thiết bị hiện tại." />
        <p className="mt-3 text-sm text-text-muted">
          Trạng thái: <span className="font-medium text-text-primary">{notificationLabel(permission)}</span>
        </p>
        <p className="mt-1 text-xs text-text-muted">Ứng dụng chưa có dịch vụ gửi thông báo nền cho hoạt động sách.</p>
        {permission !== 'granted' && permission !== 'unsupported' && (
          <Button className="mt-3" variant="outline" onClick={() => void enableNotifications()}>
            Cho phép thông báo trên trình duyệt
          </Button>
        )}
        {permission === 'granted' && (
          <Button
            className="mt-3"
            variant="ghost"
            onClick={() => setSettings((current) => ({
              ...current,
              notificationsEnabled: !current.notificationsEnabled,
            }))}
          >
            {settings.notificationsEnabled ? 'Tắt tùy chọn thông báo' : 'Bật tùy chọn thông báo'}
          </Button>
        )}
      </section>

      <section id="theme" className="settings-panel">
        <SectionHeading title="Giao diện" detail="Lựa chọn được lưu riêng trên thiết bị này." />
        <fieldset className="mt-4">
          <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Chủ đề</legend>
          <div className="theme-options" role="radiogroup" aria-label="Chủ đề giao diện">
            {([
              { value: 'dark', label: 'Tối', description: 'Dịu mắt khi thiếu sáng', icon: Moon },
              { value: 'light', label: 'Sáng', description: 'Rõ nét trong ban ngày', icon: Sun },
              { value: 'aurora', label: 'Aurora', description: 'Sắc lam tím có chiều sâu', icon: Sparkles },
              { value: 'system', label: 'Theo thiết bị', description: 'Tự động theo hệ thống', icon: Monitor },
            ] as const).map((theme) => {
              const selected = settings.theme === theme.value
              const ThemeIcon = theme.icon
              return (
                <label key={theme.value} className={`theme-option ${selected ? 'theme-option-selected' : ''}`}>
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={selected}
                    onChange={() => setSettings((current) => ({ ...current, theme: theme.value as AppTheme }))}
                    className="sr-only"
                  />
                  <span className="theme-option-icon" aria-hidden="true"><ThemeIcon /></span>
                  <span className="theme-option-copy">
                    <span className="theme-option-label">{theme.label}</span>
                    <span className="theme-option-description">{theme.description}</span>
                  </span>
                  <span className="theme-option-indicator" aria-hidden="true" />
                </label>
              )
            })}
          </div>
        </fieldset>
      </section>

      <section id="sound" className="settings-panel">
        <SectionHeading
          title="Âm thanh"
          detail="Âm chào và tiếng chạm ngắn, được lưu riêng trên thiết bị này."
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {settings.soundEnabled
              ? <Volume2 className="mt-0.5 h-5 w-5 text-accent-yellow" aria-hidden="true" />
              : <VolumeX className="mt-0.5 h-5 w-5 text-text-muted" aria-hidden="true" />}
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {settings.soundEnabled ? 'Âm thanh đang bật' : 'Âm thanh đang tắt'}
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-muted">
                Trình duyệt chỉ cho phép phát sau tương tác đầu tiên; Booki dùng âm tổng hợp rất nhỏ, không tải tệp âm thanh.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-sound="off"
            aria-pressed={settings.soundEnabled}
            onClick={() => setSettings((current) => ({ ...current, soundEnabled: !current.soundEnabled }))}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-glass/15 bg-[rgb(var(--color-interactive-surface)/.7)] px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-[rgb(var(--color-interactive-hover)/.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
          >
            {settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          </button>
        </div>
        <label className="mt-5 flex max-w-xl flex-col gap-2 text-sm text-text-primary">
          <span className="flex items-center justify-between gap-4">
            <span className="font-medium">Âm lượng</span>
            <span className="text-xs tabular-nums text-text-muted">{Math.round(settings.soundVolume * 100)}%</span>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.soundVolume}
            onChange={(event) => {
              const soundVolume = Number(event.currentTarget.value)
              setSettings((current) => ({ ...current, soundVolume }))
            }}
            aria-label="Âm lượng hiệu ứng âm thanh"
            className="w-full accent-[rgb(var(--color-accent))]"
          />
        </label>
      </section>

      <section id="motion" className="settings-panel">
        <SectionHeading
          title="Hiệu ứng & chuyển động"
          detail="Tự điều chỉnh theo khả năng thiết bị, hoặc chọn mức chuyển động bạn muốn."
        />
        <fieldset className="mt-4">
          <legend className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">Mức hiệu ứng</legend>
          <div className="motion-options" role="radiogroup" aria-label="Mức hiệu ứng và chuyển động">
            {([
              { value: 'auto', label: 'Tự động', description: `Đề xuất cho thiết bị này: ${motionLabel(effectiveMotion)}`, icon: Gauge },
              { value: 'reduced', label: 'Tối giản', description: 'Tắt chuyển động không cần thiết', icon: Accessibility },
              { value: 'subtle', label: 'Nhẹ nhàng', description: 'Chuyển cảnh và hover ngắn', icon: Sparkles },
              { value: 'full', label: 'Đầy đủ', description: 'Hiệu ứng và chuyển động phong phú', icon: Zap },
            ] as const).map((motion) => {
              const selected = settings.motion === motion.value
              const MotionIcon = motion.icon
              return (
                <label key={motion.value} className={`motion-option ${selected ? 'motion-option-selected' : ''}`}>
                  <input
                    type="radio"
                    name="motion"
                    value={motion.value}
                    checked={selected}
                    onChange={() => setSettings((current) => ({ ...current, motion: motion.value as MotionPreference }))}
                    className="sr-only"
                  />
                  <span className="motion-option-icon" aria-hidden="true"><MotionIcon /></span>
                  <span className="theme-option-copy">
                    <span className="theme-option-label">{motion.label}</span>
                    <span className="theme-option-description">{motion.description}</span>
                  </span>
                  <span className="theme-option-indicator" aria-hidden="true" />
                </label>
              )
            })}
          </div>
        </fieldset>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Chế độ tự động xét hỗ trợ tiết kiệm dữ liệu và tài nguyên thiết bị nếu trình duyệt cung cấp. Cài đặt “Giảm chuyển động” của hệ điều hành luôn được ưu tiên.
        </p>
        <p className="mt-2 text-xs text-accent-yellow" role="status">
          Mức hiệu ứng hiện tại: {motionLabel(effectiveMotion)}
        </p>
      </section>

      <section id="install" className="settings-panel">
        <SectionHeading title="Cài ứng dụng" detail="Thêm Booki vào màn hình chính để mở nhanh." />
        {installed ? (
          <p className="mt-3 text-sm text-accent-teal">Ứng dụng đã được cài trên thiết bị này.</p>
        ) : canInstall ? (
          <Button className="mt-3" onClick={() => void installApp()}>Cài ứng dụng</Button>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {isIOS
              ? 'Trên iPhone/iPad: mở trang bằng Safari, chạm Chia sẻ rồi chọn “Thêm vào Màn hình chính”.'
              : 'Nếu trình duyệt hỗ trợ cài đặt, hãy mở menu trình duyệt và chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”. Cần dùng HTTPS (localhost được hỗ trợ).'}
          </p>
        )}
      </section>

      <section id="security" className="settings-panel">
        <SectionHeading title="Bảo mật" detail="Đổi mật khẩu cần xác minh mật khẩu hiện tại." />
        <form onSubmit={(event) => void updatePassword(event)} className="mt-4 max-w-xl space-y-3">
          <TextField id="current-password" label="Mật khẩu hiện tại" value={currentPassword} onChange={setCurrentPassword} type="password" required autoComplete="current-password" />
          <TextField id="new-password" label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} type="password" required minLength={6} autoComplete="new-password" />
          <TextField id="confirm-password" label="Nhập lại mật khẩu mới" value={confirmPassword} onChange={setConfirmPassword} type="password" required minLength={6} autoComplete="new-password" />
          {passwordError && <p className="text-sm text-accent-rose" role="alert">{passwordError}</p>}
          <Button type="submit" variant="outline" disabled={passwordSaving}>
            {passwordSaving ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </Button>
        </form>
      </section>

      <section className="settings-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-text-primary">Phiên đăng nhập</h2>
          <p className="mt-1 text-sm text-text-muted">Đăng xuất khỏi tài khoản trên thiết bị này.</p>
        </div>
        <Button variant="outline" onClick={() => void handleLogout()}>Đăng xuất</Button>
      </section>

      <section className="rounded-2xl border border-accent-rose/25 bg-accent-rose/[0.045] p-5 shadow-[0_12px_32px_rgb(0_0_0_/_0.08)]">
        <h2 className="font-bold text-accent-rose">Xóa tài khoản</h2>
        <p className="mt-1 text-sm text-text-muted">
          Xóa vĩnh viễn hồ sơ, sách đã đăng và dữ liệu liên quan. Không thể hoàn tác.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setShowDelete(true)}>Xóa tài khoản</Button>
      </section>
        </main>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-dark/85 p-4" role="presentation">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="glass-card w-full max-w-md rounded-card p-5 sm:p-6"
          >
            <h2 id="delete-account-title" className="text-lg font-bold text-text-primary">Xác nhận xóa tài khoản</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              Thao tác sẽ xóa tài khoản Supabase và các dữ liệu gắn với tài khoản theo chính sách cơ sở dữ liệu.
              Nhập <strong className="text-accent-rose">XOA</strong> để xác nhận.
            </p>
            <label htmlFor="delete-confirmation" className="mt-4 block text-sm font-medium">Mã xác nhận</label>
            <input
              id="delete-confirmation"
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" disabled={deleting} onClick={() => { setShowDelete(false); setDeleteConfirmation('') }}>
                Hủy
              </Button>
              <Button variant="danger" disabled={deleting || deleteConfirmation !== 'XOA'} onClick={() => void handleDeleteAccount()}>
                {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function readRecentBooksCount(): number {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('booki_recent_books') ?? '[]')
    return Array.isArray(value) ? value.length : 0
  } catch (error) {
    console.warn('Unable to read locally stored recently viewed book count', error)
    return 0
  }
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <>
      <h2 className="text-base font-bold tracking-tight text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{detail}</p>
    </>
  )
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.72)] px-3.5 py-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium text-text-primary">{value}</dd>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  maxLength,
  minLength,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  maxLength?: number
  minLength?: number
  autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  const inputType = type === 'password' && visible ? 'text' : type

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          autoComplete={autoComplete}
          spellCheck={type === 'email' ? false : undefined}
          className={`${fieldClass} ${type === 'password' ? 'pr-12' : ''}`}
        />
        {type === 'password' && (
          <button
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-yellow"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  )
}

function PrivacyToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className={disabled ? 'text-text-muted/60' : 'text-text-primary'}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-accent-yellow"
      />
    </label>
  )
}

function notificationLabel(permission: string): string {
  if (permission === 'granted') return 'Được cho phép'
  if (permission === 'denied') return 'Bị chặn trong cài đặt trình duyệt'
  if (permission === 'unsupported') return 'Trình duyệt này không hỗ trợ'
  return 'Chưa được cho phép'
}

function motionLabel(motion: string): string {
  if (motion === 'full') return 'Đầy đủ'
  if (motion === 'subtle') return 'Nhẹ nhàng'
  return 'Tối giản'
}
