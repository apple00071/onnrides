import { ReactNode } from 'react'
import Navbar from './components/Navbar'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
    </div>
  )
} 