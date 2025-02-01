import { ReactNode } from 'react'
import Navbar from './components/Navbar'
import { Footer } from '@/components/ui/footer'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow">
        <Navbar />
        <main>{children}</main>
      </div>
      <Footer />
    </div>
  )
} 