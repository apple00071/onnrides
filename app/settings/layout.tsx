import Navbar from '../(main)/components/Navbar';
import { Footer } from '@/components/ui/footer';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <Navbar />
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  );
} 