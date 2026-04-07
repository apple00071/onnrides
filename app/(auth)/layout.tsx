import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Authentication - Mister Rides',
  description: 'Login or register for Mister Rides',
}

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
