import { Camera, Upload } from 'lucide-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { Magnetic } from '../components/Magnetic'
import { useAuth } from '../hooks/useAuthState'
import { useReducedMotion } from '../hooks/useReducedMotion'

const BULLETS = [
  'Chụp bằng camera hoặc tải ảnh.',
  'Thêm tên sách, tác giả, tình trạng.',
  'Chọn chia sẻ, trao đổi hoặc cho mượn.',
  'Quản lý sách đã đăng trong trang cá nhân.',
]

export function UploadPreviewSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleAddBook = () => {
    navigate(user ? '/app/add-book' : '/register')
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card || reduced) return

    const onMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      gsap.to(card, {
        rotateY: x * 14,
        rotateX: -y * 10,
        duration: 0.5,
        ease: 'power2.out',
        transformPerspective: 1200,
      })
    }

    const onLeave = () => {
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.8,
        ease: 'power2.out',
      })
    }

    card.addEventListener('mousemove', onMove)
    card.addEventListener('mouseleave', onLeave)
    return () => {
      card.removeEventListener('mousemove', onMove)
      card.removeEventListener('mouseleave', onLeave)
    }
  }, [reduced])

  return (
    <section
      id="upload"
      className="main-wrapper relative overflow-x-clip px-5 py-20 sm:px-8 md:py-32 lg:px-16"
      style={{
        background: `
          radial-gradient(circle at 20% 20%, rgba(255,215,77,.12), transparent 35%),
          radial-gradient(circle at 80% 10%, rgba(192,192,192,.08), transparent 35%),
          #0C0C0C
        `,
      }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <FadeIn>
          <h2
            className="mb-6 font-black uppercase tracking-tighter text-[#F7F2E8]"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Chụp ảnh sách,{' '}
            <span className="text-gold-gradient">đăng ngay</span>
          </h2>
          <AnimatedText
            text="Vài thao tác đơn giản — chụp bìa, điền thông tin, chia sẻ với cộng đồng đọc sách quanh bạn."
            scrollReveal
            className="mb-8 text-base leading-relaxed text-[#A8A29E]"
          />
          <ul className="space-y-4">
            {BULLETS.map((bullet, i) => (
              <li
                key={i}
                className="flex items-center gap-3 text-[#A8A29E] transition-colors duration-500 ease-awwwards hover:text-[#F7F2E8]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#FFD84D]/30 bg-[#FFD84D]/10 text-xs font-bold text-[#FFD84D]">
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
              ref={cardRef}
              className="rounded-3xl p-6 transition-all duration-500 ease-awwwards"
              style={{
                background: 'rgba(20, 20, 20, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="mb-4 flex aspect-[4/3] items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-[#0C0C0C]/50"
                style={{ transform: 'translateZ(24px)' }}
              >
                <Camera className="h-12 w-12 text-[#FFD84D]" />
              </div>

              {['Tên sách của bạn', 'Tác giả', 'Mô tả ngắn'].map((placeholder) => (
                <div
                  key={placeholder}
                  className="mb-3 h-10 rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-[#A8A29E]"
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
