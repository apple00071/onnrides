import { Inter } from 'next/font/google'
import { ReactNode } from 'react'
import Navbar from './components/Navbar'
import '../globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap'
})

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className={inter.className}>
      <Navbar />
      <main>{children}</main>
    </div>
  )
} 