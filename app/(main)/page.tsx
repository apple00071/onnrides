import HeroSection from '@/components/ui/HeroSection';
import ServicesSection from '@/components/ui/ServicesSection';
import FleetSection from '@/components/ui/FleetSection';
import TestimonialsSection from '@/components/ui/TestimonialsSection';

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ServicesSection />
      <FleetSection />
      <TestimonialsSection />
    </main>
  );
} 