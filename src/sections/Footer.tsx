import { BookOpen } from 'lucide-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { Magnetic } from '../components/Magnetic'
import { APP_NAME } from '../lib/constants'
import { useReducedMotion } from '../hooks/useReducedMotion'

const TEAM_LEAD = { name: 'Nguyễn Xuân Phúc', role: 'Trưởng nhóm' }

export function Footer() {
  const footerRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || !footerRef.current) return

    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.to(titleRef.current, {
          backgroundPosition: '200% center',
          duration: 6,
          ease: 'none',
          repeat: -1,
        })
      }
    }, footerRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <footer
      ref={footerRef}
      className="main-wrapper relative overflow-x-clip border-t border-white/5 bg-[#0C0C0C] px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,215,77,0.45), rgba(192,192,192,0.35), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <Magnetic strength={5} padding={60}>
            <Link
              to="/"
              className="group flex items-center gap-3 transition-all duration-500 ease-awwwards"
            >
              <BookOpen className="h-7 w-7 text-[#FFD84D] transition-transform duration-500 ease-awwwards group-hover:scale-110" />
              <span className="text-lg font-black uppercase tracking-tighter text-[#F7F2E8]">
                {APP_NAME}
              </span>
            </Link>
          </Magnetic>

          <AnimatedText
            text="Nền tảng chia sẻ sách quanh bạn — dữ liệu thật từ cộng đồng, kết nối tri thức không biên giới."
            scrollReveal
            className="max-w-xl text-sm leading-relaxed text-[#A8A29E] md:text-base"
          />
        </div>

        <div className="mb-20 text-center">
          <h2
            ref={titleRef}
            className="mb-3 font-black uppercase leading-[0.92] tracking-tighter text-[clamp(2.5rem,8vw,7rem)]"
            style={{
              background:
                'linear-gradient(90deg, #FFF7CC 0%, #FFD84D 25%, #FFFFFF 50%, #C0C0C0 75%, #B7791F 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tri thức không biên giới
          </h2>
          <p className="text-silver-gradient text-[clamp(1rem,2.5vw,1.5rem)] font-medium tracking-wide">
            Knowledge for All
          </p>
        </div>

        <div className="mb-20 flex justify-center px-2">
          <div className="w-full max-w-md">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-[#A8A29E]">
              Đội ngũ phát triển
            </p>
            <div
              className="glass-panel rounded-2xl px-6 py-8 text-center transition-all duration-500 ease-awwwards hover:border-white/12 hover:bg-[#141414]/90"
              style={{
                background: 'rgba(20, 20, 20, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-gold-gradient text-xl font-black tracking-tight md:text-2xl">
                {TEAM_LEAD.name}
              </p>
              <p className="mt-1 text-sm text-[#A8A29E]">{TEAM_LEAD.role}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#A8A29E] md:text-left">
          © {new Date().getFullYear()} {APP_NAME}. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </footer>
  )
}
