import { BookOpen, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AnimatedText } from '../components/AnimatedText'
import { FadeIn } from '../components/FadeIn'
import { GradientButton } from '../components/GradientButton'
import { ImageWithSkeleton } from '../components/ImageWithSkeleton'
import { GsapMorphText } from '../components/GsapMorphText'
import { Magnetic } from '../components/Magnetic'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuthState'
import { APP_NAME, APP_TAGLINE } from '../lib/constants'

export function HeroSection() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleAddBook = () => navigate(user ? '/app/add-book' : '/register')

  return (
    <section className="main-wrapper booki-hero-ambient relative flex min-h-[100svh] items-center overflow-x-clip bg-hero-mesh px-5 pt-24 sm:px-8 lg:px-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="hero-blob absolute -left-20 top-20 h-72 w-72 rounded-full bg-accent-yellow/20 blur-3xl" />
        <div className="hero-blob absolute -right-20 top-32 h-80 w-80 rounded-full bg-accent-yellow/[0.08] blur-3xl" />
        <div className="hero-blob absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-white/[0.035] blur-3xl" />
      </div>

      <div className="booki-hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid w-full min-w-0 max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="min-w-0">
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
              text="Có sách hay thì share liền tay. Booki giúp bạn tìm, cho mượn và đổi sách dễ dàng hơn."
              scrollReveal={false}
              className="mb-8 max-w-lg break-words text-lg leading-relaxed text-text-muted"
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
              Thấy cuốn hợp gu? Xem tình trạng và cách liên hệ ngay.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.4} className="relative mx-auto w-full min-w-0 max-w-lg lg:max-w-none">
          <div className="hero-composition" role="group" aria-label="Khám phá sách, đọc và chia sẻ cùng Booki">
            <div className="hero-composition-glow" aria-hidden="true" />
            <div className="hero-composition-orbit hero-composition-orbit-one" aria-hidden="true" />
            <div className="hero-composition-orbit hero-composition-orbit-two" aria-hidden="true" />
            <div className="hero-composition-kicker">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
              <span>BOOK DISCOVERY</span>
            </div>

            <div className="hero-photo hero-photo-main">
              <ImageWithSkeleton
                src="/hero/library-main.webp"
                alt="Lối đi ấm áp giữa những kệ sách trong thư viện"
                width={1000}
                height={1250}
                sizes="(max-width: 639px) 58vw, (max-width: 1023px) 48vw, 25vw"
                wrapperClassName="hero-photo-image"
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
              <div className="hero-photo-caption">
                <span>BOOKI / 01</span>
                <span>Tìm cuốn tiếp theo</span>
              </div>
            </div>

            <FadeIn delay={0.12} className="hero-photo-slot hero-photo-shelves-slot">
              <div className="hero-photo hero-photo-shelves">
                <ImageWithSkeleton
                  src="/hero/library-aisle.webp"
                  alt="Những hàng sách xếp kín trên kệ gỗ"
                  width={620}
                  height={760}
                  sizes="(max-width: 639px) 42vw, (max-width: 1023px) 34vw, 18vw"
                  wrapperClassName="hero-photo-image"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </FadeIn>

            <FadeIn delay={0.23} className="hero-photo-slot hero-photo-books-slot">
              <div className="hero-photo hero-photo-books">
                <ImageWithSkeleton
                  src="/hero/book-stack.webp"
                  alt="Những cuốn sách xếp cạnh nhau"
                  width={440}
                  height={520}
                  sizes="(max-width: 639px) 30vw, (max-width: 1023px) 26vw, 15vw"
                  wrapperClassName="hero-photo-image"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </FadeIn>

            <div className="hero-composition-note">
              <span>Đọc</span>
              <span aria-hidden="true">·</span>
              <span>Chia sẻ</span>
              <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-accent-yellow" aria-hidden="true" />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
