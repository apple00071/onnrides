import { Inter } from 'next/font/google'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - OnnRides',
  description: 'Login or register for OnnRides',
}

const inter = Inter({ subsets: ['latin'] })

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}