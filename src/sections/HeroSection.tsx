import { BookOpen, Camera, MapPin, Users } from 'lucide-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { GsapMorphText } from '../components/GsapMorphText'
import { Magnetic } from '../components/Magnetic'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuthState'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { APP_NAME, APP_TAGLINE } from '../lib/constants'
import { ILLUSTRATIONS } from '../lib/images'

const HERO_FEATURES = [
  { icon: BookOpen, label: 'Sách hợp gu', position: 'left-2 top-[17%] sm:left-4' },
  { icon: Camera, label: 'Đăng sách nhanh', position: 'right-2 top-[25%] sm:right-4' },
  { icon: MapPin, label: 'Tìm quanh đây', position: 'left-2 bottom-[22%] sm:left-4' },
  { icon: Users, label: 'Kết nối người đọc', position: 'right-2 bottom-[14%] sm:right-4' },
]

export function HeroSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const visualRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced || !visualRef.current) return
    const ctx = gsap.context(() => {
      gsap.from('.hero-card', {
        opacity: 0,
        y: 40,
        scale: 0.9,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.3,
      })
    }, visualRef)
    return () => ctx.revert()
  }, [reduced])

  const handleAddBook = () => navigate(user ? '/app/add-book' : '/register')

  return (
    <section className="main-wrapper relative flex min-h-[100svh] items-center overflow-x-clip bg-hero-mesh px-5 pt-24 sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-blob absolute -left-20 top-20 h-72 w-72 rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="hero-blob absolute -right-20 top-32 h-80 w-80 rounded-full bg-accent-yellow/[0.08] blur-3xl" />
        <div className="hero-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/[0.035] blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div>
          <FadeIn delay={0.1} y={20}>
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-accent-yellow/90">
              {APP_TAGLINE}
            </p>
          </FadeIn>

          <GsapMorphText
            as="h1"
            text={APP_NAME}
            splitBy="word"
            reveal="mount"
            morph={false}
            className="mb-6 block font-black uppercase leading-[0.92] tracking-tighter text-[clamp(2.5rem,9vw,6rem)]"
          />

          <FadeIn delay={0.35} y={20}>
            <AnimatedText
              text="Có sách hay thì share liền tay. Booki giúp mình kiếm, cho mượn với đổi sách dễ dàng hơn nghen."
              scrollReveal={false}
              className="mb-8 max-w-lg text-lg leading-relaxed text-text-muted"
            />
          </FadeIn>

          <FadeIn delay={0.45} y={20}>
            <div className="flex flex-wrap gap-4">
              <Magnetic strength={5}>
                <GradientButton onClick={handleAddBook}>Share sách của bạn</GradientButton>
              </Magnetic>
              <Button variant="outline" size="lg" onClick={() => navigate(user ? '/app' : '/explore')}>
                Tìm sách thôi
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.55} y={10}>
            <p className="mt-8 text-xs text-text-muted">
              Thấy cuốn hợp gu thì mình coi tình trạng với cách liên hệ liền nha.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.4} className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div ref={visualRef} className="relative h-[420px] w-full rounded-[2rem] border border-accent-yellow/15 bg-[radial-gradient(circle_at_50%_42%,rgb(var(--color-accent)/.12),transparent_48%),rgb(var(--color-dark-secondary)/.35)] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06),0_24px_70px_rgb(0_0_0_/_0.18)]">
            <div className="pointer-events-none absolute inset-6 rounded-[1.5rem] border border-white/[0.06]" aria-hidden="true" />
            <div className="hero-artwork absolute inset-0" aria-label="Minh họa cách Booki kết nối người đọc" role="img">
              <ImageWithSkeleton
                src={ILLUSTRATIONS.heroBooks}
                alt="Thư viện sách"
                width={800}
                height={1024}
                sizes="(max-width: 480px) 144px, 184px"
                wrapperClassName="hero-card hero-book-cover absolute left-1/2 top-1/2 h-56 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl sm:h-72 sm:w-52"
                className="h-full w-full rounded-2xl border border-glass/20 object-cover shadow-[0_32px_80px_rgb(0_0_0_/_0.42)]"
                loading="eager"
                fetchPriority="high"
              />
              {HERO_FEATURES.map(({ icon: Icon, label, position }, index) => (
                <div key={label} className={`hero-feature hero-card absolute ${position}`} style={{ '--feature-index': index } as React.CSSProperties}>
                  <Icon className="h-4 w-4 shrink-0 text-accent-yellow" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <ImageWithSkeleton
              src={ILLUSTRATIONS.reading}
              alt="Đọc sách"
              width={96}
              height={96}
              sizes="96px"
              wrapperClassName="hero-card absolute -bottom-2 right-0 hidden h-24 w-24 rounded-xl sm:block"
              className="h-full w-full rounded-xl border-2 border-accent-yellow/30 object-cover shadow-lg"
              loading="lazy"
            />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-accent-yellow/15 bg-dark/60 px-3 py-1 text-center text-[11px] font-medium text-text-muted backdrop-blur-md">
              Kiếm sách hợp gu · kết nối quanh mình
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
