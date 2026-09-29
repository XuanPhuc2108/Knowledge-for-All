import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Camera, HeartHandshake, MapPin, UserPlus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { FadeIn } from '../components/FadeIn'
import { useReducedMotion } from '../hooks/useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  {
    num: '01',
    title: 'Tạo tài khoản',
    desc: 'Đăng ký nhanh để quản lý sách và yêu cầu trao đổi.',
    icon: UserPlus,
    tone: 'bg-accent-yellow/[0.13] border-accent-yellow/20',
  },
  {
    num: '02',
    title: 'Bật định vị',
    desc: 'Cho phép website xác định vị trí tương đối để gợi ý sách ở gần bạn.',
    icon: MapPin,
    tone: 'bg-[rgb(var(--color-interactive-surface)/.82)] border-glass/10',
  },
  {
    num: '03',
    title: 'Chụp ảnh & đăng sách',
    desc: 'Chụp ảnh bìa sách, nhập mô tả và chọn hình thức chia sẻ.',
    icon: Camera,
    tone: 'bg-[rgb(var(--color-interactive-surface)/.82)] border-glass/10',
  },
  {
    num: '04',
    title: 'Kết nối & trao đổi',
    desc: 'Liên hệ qua số điện thoại hoặc email trên bài đăng và trao sách an toàn.',
    icon: HeartHandshake,
    tone: 'bg-accent-yellow/[0.13] border-accent-yellow/20',
  },
]

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced || !sectionRef.current) return

    const cards = sectionRef.current.querySelectorAll('.step-card')
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            end: 'top 50%',
            scrub: 1,
          },
          scale: 0.92 + i * 0.02,
          opacity: 0.6,
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [reduced])

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="rounded-t-[2rem] border-y border-glass/5 bg-cream px-5 py-20 sm:rounded-t-[2.75rem] sm:px-8 md:py-28 lg:rounded-t-[3.5rem] lg:px-16"
    >
      <FadeIn className="mb-16 text-center">
        <h2
          className="font-black text-text-primary"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
        >
          Chia sẻ sách chỉ trong vài bước
        </h2>
      </FadeIn>

      <div className="mx-auto max-w-2xl space-y-6">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <FadeIn key={step.num} delay={i * 0.1}>
              <article
                className={`step-card sticky top-24 rounded-[1.5rem] border p-6 text-text-primary shadow-[0_24px_64px_rgb(0_0_0_/_0.13)] backdrop-blur-sm sm:p-8 md:top-32 ${step.tone}`}
                style={{ top: `${96 + i * 28}px` }}
              >
                <div className="flex items-start gap-6">
                  <span className="text-4xl font-black tracking-[-0.08em] text-accent-yellow/50 md:text-6xl">{step.num}</span>
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-text-muted">{step.desc}</p>
                  </div>
                </div>
              </article>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}
