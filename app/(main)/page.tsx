import HeroSection from '@/components/ui/HeroSection';
import ServicesSection from '@/components/ui/ServicesSection';
import TestimonialsSection from '@/components/ui/TestimonialsSection';
import FleetSection from '@/components/ui/FleetSection';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FleetSection />
      <ServicesSection />
      <TestimonialsSection />
    </main>
  );
} 