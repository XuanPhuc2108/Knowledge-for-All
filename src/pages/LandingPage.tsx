import { Navbar } from '../components/Navbar'
import { ScrollProgress } from '../components/ScrollProgress'
import { useBooks } from '../hooks/useBooks'
import { BookCarousel3DSection } from '../sections/BookCarousel3DSection'
import { CTASection } from '../sections/CTASection'
import { Footer } from '../sections/Footer'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { HeroSection } from '../sections/HeroSection'
import { LocationSection } from '../sections/LocationSection'
import { SafetySection } from '../sections/SafetySection'
import { SiteShareSection } from '../sections/SiteShareSection'
import { UploadPreviewSection } from '../sections/UploadPreviewSection'
import { BookiAmbient } from '../components/BookiAmbient'

export function LandingPage() {
  const bookData = useBooks(6)

  return (
    <div className="noise-overlay relative overflow-x-clip">
      <BookiAmbient variant="landing" />
      <ScrollProgress />
      <Navbar variant="landing" />
      <main className="relative z-10">
        <HeroSection />
        <BookCarousel3DSection {...bookData} />
        <HowItWorksSection />
        <LocationSection books={bookData.books} />
        <UploadPreviewSection />
        <SafetySection />
        <CTASection />
        <SiteShareSection />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}
