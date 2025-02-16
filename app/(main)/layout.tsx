'use client';

import { ReactNode, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import Navbar from './components/Navbar'
import { Footer } from '@/components/ui/footer'
import logger from '@/lib/logger'
import { useRouter } from 'next/navigation'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()

  useEffect(() => {
    let isConnecting = false

    const connectWebSocket = () => {
      if (!session?.user || isConnecting) return

      isConnecting = true
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || window.location.origin.replace('http', 'ws')}/ws?userId=${session.user.id}`
      logger.debug('Connecting to WebSocket:', wsUrl)

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'connection' && data.status === 'connected') {
              logger.debug('WebSocket connection confirmed')
            } else if (data.type === 'user_status') {
              if (data.action === 'blocked') {
                toast.error('Your account has been blocked by an administrator')
                await handleSignOut()
              } else if (data.action === 'deleted') {
                toast.error('Your account has been deleted by an administrator')
                await handleSignOut(true)
              }
            }
          } catch (error) {
            logger.error('Error processing WebSocket message:', error)
          }
        }

        ws.onopen = () => {
          logger.debug('WebSocket connection established')
          isConnecting = false
        }

        ws.onerror = (error) => {
          logger.error('WebSocket error:', error)
          isConnecting = false
        }

        ws.onclose = () => {
          logger.debug('WebSocket connection closed')
          isConnecting = false
          wsRef.current = null

          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
        }
      } catch (error) {
        logger.error('Error creating WebSocket connection:', error)
        isConnecting = false
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [session])

  const handleSignOut = async (isDeleted: boolean = false) => {
    try {
      // Clear all WebSocket connections
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // Clear all stored data
      localStorage.clear()
      sessionStorage.clear()

      // If user was deleted, remove all cookies
      if (isDeleted) {
        document.cookie.split(';').forEach(cookie => {
          document.cookie = cookie
            .replace(/^ +/, '')
            .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
        });
      }

      // Sign out and redirect
      await signOut({ 
        redirect: false 
      })
      
      // Force reload to clear any cached state
      window.location.href = '/auth/signin'
    } catch (error) {
      logger.error('Error during sign out:', error)
      // Force reload as fallback
      window.location.reload()
    }
  }

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