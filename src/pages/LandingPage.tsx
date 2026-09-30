import { Navbar } from '../components/Navbar'
import { ScrollProgress } from '../components/ScrollProgress'
import { BookCarousel3DSection } from '../sections/BookCarousel3DSection'
import { Footer } from '../sections/Footer'
import { HeroSection } from '../sections/HeroSection'

export function LandingPage() {
  return (
    <div className="noise-overlay relative overflow-x-clip">
      <ScrollProgress />
      <Navbar variant="landing" />
      <main>
        <HeroSection />
        <BookCarousel3DSection />
      </main>
      <Footer />
    </div>
  )
}
