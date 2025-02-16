'use client';

import { ReactNode, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import Navbar from './components/Navbar'
import { Footer } from '@/components/ui/footer'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws?userId=${session.user.id}`)

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'user_status') {
            if (data.action === 'blocked') {
              toast.error('Your account has been blocked by an administrator')
              signOut({ callbackUrl: '/' })
            } else if (data.action === 'deleted') {
              toast.error('Your account has been deleted by an administrator')
              signOut({ callbackUrl: '/' })
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      return () => {
        ws.close()
      }
    }
  }, [session])

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