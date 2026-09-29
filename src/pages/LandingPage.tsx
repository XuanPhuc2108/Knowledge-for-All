import { Navbar } from '../components/Navbar'
import { ScrollProgress } from '../components/ScrollProgress'
import { BookCarousel3DSection } from '../sections/BookCarousel3DSection'
import { CTASection } from '../sections/CTASection'
import { Footer } from '../sections/Footer'
import { HeroSection } from '../sections/HeroSection'
import { HowItWorksSection } from '../sections/HowItWorksSection'
import { LocationSection } from '../sections/LocationSection'
import { SafetySection } from '../sections/SafetySection'
import { UploadPreviewSection } from '../sections/UploadPreviewSection'

export function LandingPage() {
  return (
    <div className="noise-overlay relative overflow-x-clip">
      <ScrollProgress />
      <Navbar variant="landing" />
      <main>
        <HeroSection />
        <BookCarousel3DSection />
        <HowItWorksSection />
        <LocationSection />
        <UploadPreviewSection />
        <SafetySection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
