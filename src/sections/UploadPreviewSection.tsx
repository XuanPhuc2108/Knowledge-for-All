import { Camera, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { Magnetic } from '../components/Magnetic'
import { useAuth } from '../hooks/useAuthState'

const BULLETS = [
  'Chụp hình bìa hoặc tải ảnh có sẵn.',
  'Ghi tên sách, tác giả với tình trạng thiệt nha.',
  'Chọn tặng, cho mượn hay đổi sách.',
  'Muốn sửa hay gỡ bài thì quản lý trong Sách của tôi.',
]

export function UploadPreviewSection() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAddBook = () => {
    navigate(user ? '/app/add-book' : '/register')
  }

  return (
    <section
      id="upload"
      className="main-wrapper relative overflow-x-clip px-5 py-20 sm:px-8 md:py-32 lg:px-16"
      style={{
        background: `
          radial-gradient(circle at 18% 22%, rgba(255,215,77,.1), transparent 36%),
          radial-gradient(circle at 86% 8%, rgba(255,255,255,.035), transparent 34%)
        `,
      }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <FadeIn>
          <h2
            className="mb-6 font-black uppercase tracking-tighter text-text-primary"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Chụp bìa một cái,{' '}
            <span className="text-gold-gradient">share liền tay</span>
          </h2>
          <AnimatedText
            text="Chụp bìa, ghi vài dòng cho rõ rồi chọn cách chia sẻ. Có sách hay thì chuyền tay nhau đọc nghen."
            scrollReveal
            className="mb-8 text-base leading-relaxed text-text-muted"
          />
          <ul className="space-y-4">
            {BULLETS.map((bullet, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-text-muted transition-colors duration-200 hover:text-text-primary"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-yellow/30 bg-accent-yellow/10 text-xs font-bold text-accent-yellow">
                  {i + 1}
                </span>
                {bullet}
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div style={{ perspective: '1200px' }}>
            <div
              className="upload-preview-card glass-card rounded-[1.75rem] p-4 sm:p-6"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="mb-4 flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-dashed border-glass/20 bg-[rgb(var(--color-interactive-surface)/.55)]"
                style={{ transform: 'translateZ(24px)' }}
              >
                <Camera className="h-12 w-12 text-accent-yellow" />
              </div>

              {['Tên sách của bạn', 'Tác giả', 'Mô tả ngắn'].map((placeholder) => (
                <div
                  key={placeholder}
                  className="mb-3 flex h-11 items-center rounded-xl border border-glass/10 bg-[rgb(var(--color-interactive-surface)/.78)] px-4 py-2 text-sm text-text-muted"
                  style={{ transform: 'translateZ(12px)' }}
                >
                  {placeholder}
                </div>
              ))}

              <div style={{ transform: 'translateZ(32px)' }}>
                <Magnetic strength={6} className="mt-4 w-full">
                  <GradientButton
                    onClick={handleAddBook}
                    className="w-full"
                    icon={<Upload className="h-4 w-4" />}
                  >
                    {user ? 'Đăng sách ngay' : 'Đăng ký & đăng sách'}
                  </GradientButton>
                </Magnetic>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
