import { BookOpen, Camera, MapPin, Users } from 'lucide-react'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { GsapMorphText } from '../components/GsapMorphText'
import { Magnetic } from '../components/Magnetic'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuthState'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { APP_NAME, APP_TAGLINE } from '../lib/constants'
import { ILLUSTRATIONS } from '../lib/images'

const ABSTRACT_CARDS = [
  { icon: BookOpen, color: 'from-accent-yellow to-accent-orange', rotate: '-12deg', z: 0 },
  { icon: Camera, color: 'from-accent-rose to-accent-purple', rotate: '8deg', z: 1 },
  { icon: MapPin, color: 'from-accent-blue to-accent-teal', rotate: '-6deg', z: 2 },
  { icon: Users, color: 'from-accent-purple to-accent-rose', rotate: '-4deg', z: 4 },
]

export function HeroSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const blobRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (reduced || !blobRef.current) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    const blobs = blobRef.current.querySelectorAll('.hero-blob')
    let frame = 0
    const onMove = (e: MouseEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const x = (e.clientX / window.innerWidth - 0.5) * 30
        const y = (e.clientY / window.innerHeight - 0.5) * 30
        blobs.forEach((blob, i) => {
          gsap.to(blob, {
            x: x * (i + 1) * 0.3,
            y: y * (i + 1) * 0.3,
            duration: 0.8,
            ease: 'power2.out',
            overwrite: 'auto',
          })
        })
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [reduced])

  useEffect(() => {
    if (reduced || !subtitleRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        subtitleRef.current,
        { backgroundPosition: '0% center' },
        { backgroundPosition: '200% center', duration: 5, ease: 'none', repeat: -1 },
      )
    })
    return () => ctx.revert()
  }, [reduced])

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
      <div ref={blobRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-blob absolute -left-20 top-20 h-72 w-72 rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="hero-blob absolute -right-20 top-32 h-80 w-80 rounded-full bg-accent-purple/20 blur-3xl" />
        <div className="hero-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent-teal/15 blur-3xl" />
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
            <p
              ref={subtitleRef}
              className="mb-4 text-sm font-semibold uppercase tracking-widest"
              style={{
                background: 'linear-gradient(90deg, #A8A29E, #FFD84D, #FFFFFF, #C0C0C0, #A8A29E)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {APP_TAGLINE}
            </p>
          </FadeIn>

          <GsapMorphText
            as="h1"
            text={APP_NAME}
            splitBy="char"
            reveal="mount"
            morph
            wave
            className="mb-6 block font-black uppercase leading-[0.92] tracking-tighter text-[clamp(2.5rem,9vw,6rem)]"
          />

          <FadeIn delay={0.35} y={20}>
            <AnimatedText
              text="Trao sách cũ, nhận tri thức mới — đăng sách bạn muốn chia sẻ, tìm người ở gần và trao đổi dễ dàng hơn bằng định vị."
              scrollReveal={false}
              className="mb-8 max-w-lg text-lg leading-relaxed text-text-muted"
            />
          </FadeIn>

          <FadeIn delay={0.45} y={20}>
            <div className="flex flex-wrap gap-4">
              <Magnetic strength={5}>
                <GradientButton onClick={handleAddBook}>Đăng sách ngay</GradientButton>
              </Magnetic>
              <Button variant="outline" size="lg" onClick={() => navigate(user ? '/app/nearby' : '/login')}>
                Tìm sách gần bạn
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.55} y={10}>
            <p className="mt-8 text-xs text-text-muted">
              Dữ liệu hiển thị dựa trên sách thật do người dùng đăng.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.4} className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div ref={visualRef} className="relative h-[420px] w-full">
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: '1200px' }}>
              <img
                src={ILLUSTRATIONS.heroBooks}
                alt="Thư viện sách"
                className="hero-card absolute left-1/2 top-1/2 h-56 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 object-cover shadow-2xl shadow-accent-yellow/20"
                style={{ transform: 'translate(-50%, -50%) rotate(-3deg)' }}
                loading="eager"
              />
              {ABSTRACT_CARDS.map((card, i) => {
                const Icon = card.icon
                const positions = [
                  { left: '8%', top: '12%' },
                  { left: '72%', top: '8%' },
                  { left: '78%', top: '58%' },
                  { left: '5%', top: '62%' },
                  { left: '42%', top: '78%' },
                ]
                const pos = positions[i]
                return (
                  <div key={i} className="hero-card absolute" style={pos}>
                    <Magnetic strength={6} padding={80}>
                      <div
                        className={`flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br ${card.color} p-3 shadow-xl ring-1 ring-white/20`}
                        style={{ transform: `rotate(${card.rotate})` }}
                      >
                        <Icon className="h-6 w-6 text-white drop-shadow" />
                      </div>
                    </Magnetic>
                  </div>
                )
              })}
            </div>
            <img
              src={ILLUSTRATIONS.reading}
              alt="Đọc sách"
              className="hero-card absolute -bottom-2 right-0 hidden h-24 w-24 rounded-xl border-2 border-accent-yellow/30 object-cover shadow-lg sm:block"
              loading="lazy"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
