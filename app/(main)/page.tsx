import HeroSection from '@/components/ui/HeroSection'
import ServicesSection from '@/components/ui/ServicesSection'
import TestimonialsSection from '@/components/ui/TestimonialsSection'

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ServicesSection />
      <TestimonialsSection />
    </main>
  )
} 