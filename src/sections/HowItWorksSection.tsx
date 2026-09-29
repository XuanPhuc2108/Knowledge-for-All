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
    gradient: 'from-accent-yellow to-accent-orange',
  },
  {
    num: '02',
    title: 'Bật định vị',
    desc: 'Cho phép website xác định vị trí tương đối để gợi ý sách ở gần bạn.',
    icon: MapPin,
    gradient: 'from-accent-blue to-accent-teal',
  },
  {
    num: '03',
    title: 'Chụp ảnh & đăng sách',
    desc: 'Chụp ảnh bìa sách, nhập mô tả và chọn hình thức chia sẻ.',
    icon: Camera,
    gradient: 'from-accent-rose to-accent-purple',
  },
  {
    num: '04',
    title: 'Kết nối & trao đổi',
    desc: 'Liên hệ qua số điện thoại hoặc email trên bài đăng và trao sách an toàn.',
    icon: HeartHandshake,
    gradient: 'from-accent-teal to-accent-lime',
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
      className="rounded-t-[48px] bg-cream px-5 py-20 sm:rounded-t-[60px] sm:px-8 md:py-32 lg:rounded-t-[72px] lg:px-16"
    >
      <FadeIn className="mb-16 text-center">
        <h2
          className="font-black text-dark"
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
                className={`step-card sticky top-24 rounded-card-lg bg-gradient-to-br ${step.gradient} p-8 text-dark shadow-xl md:top-32`}
                style={{ top: `${96 + i * 28}px` }}
              >
                <div className="flex items-start gap-6">
                  <span className="text-5xl font-black opacity-30 md:text-7xl">{step.num}</span>
                  <div>
                    <div className="mb-3 flex items-center gap-3">
                      <Icon className="h-6 w-6" />
                      <h3 className="text-xl font-bold">{step.title}</h3>
                    </div>
                    <p className="text-dark/80">{step.desc}</p>
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
