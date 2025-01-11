'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '../../../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { signIn } from 'next-auth/react'
import type { SignInResponse } from 'next-auth/react'

interface BookingDetails {
  vehicleId: string
  vehicleName: string
  vehicleImage: string
  price: string
  pickupDate: string
  dropoffDate: string
  pickupTime: string
  dropoffTime: string
  returnUrl?: string
}

export default function BookingSummaryPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)

  useEffect(() => {
    // Get booking details from URL params
    const details: BookingDetails = {
      vehicleId: searchParams.get('vehicleId') || '',
      vehicleName: searchParams.get('vehicleName') || '',
      vehicleImage: searchParams.get('vehicleImage') || '',
      price: searchParams.get('price') || '',
      pickupDate: searchParams.get('pickupDate') || '',
      dropoffDate: searchParams.get('dropoffDate') || '',
      pickupTime: searchParams.get('pickupTime') || '',
      dropoffTime: searchParams.get('dropoffTime') || '',
      returnUrl: searchParams.get('returnUrl') || ''
    }

    if (!details.vehicleId || !details.pickupDate || !details.dropoffDate) {
      toast.error('Missing booking details')
      router.push('/')
      return
    }

    setBookingDetails(details)
  }, [searchParams, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password
      })

      if (!result?.error) {
        toast.success('Logged in successfully')
        setShowLoginForm(false)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (bookingDetails?.returnUrl) {
      router.push(bookingDetails.returnUrl)
    } else {
      setShowLoginForm(false)
    }
  }

  const handleConfirmBooking = async () => {
    if (!user) {
      setShowLoginForm(true)
      return
    }

    if (!bookingDetails) return

    try {
      // First check if user has verified documents
      const docResponse = await fetch(`/api/users/${user.id}/documents`)
      if (!docResponse.ok) {
        throw new Error('Failed to fetch user documents')
      }
      const documents = await docResponse.json()

      if (!documents || !documents.is_approved) {
        toast.error('Please verify your documents before booking')
        router.push('/profile')
        return
      }

      // Calculate total days and amount
      const pickupDate = new Date(bookingDetails.pickupDate)
      const dropoffDate = new Date(bookingDetails.dropoffDate)
      const days = Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24))
      const totalAmount = days * parseFloat(bookingDetails.price)

      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          vehicle_id: bookingDetails.vehicleId,
          pickup_date: bookingDetails.pickupDate,
          dropoff_date: bookingDetails.dropoffDate,
          pickup_time: bookingDetails.pickupTime,
          dropoff_time: bookingDetails.dropoffTime,
          total_amount: totalAmount,
          status: 'pending'
        }),
      })

      if (!bookingResponse.ok) {
        throw new Error('Failed to create booking')
      }

      toast.success('Booking confirmed successfully!')
      router.push('/bookings') // Redirect to bookings list
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm booking')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    )
  }

  if (!bookingDetails) {
    return null
  }

  // Calculate total amount
  const days = Math.ceil((new Date(bookingDetails.dropoffDate).getTime() - new Date(bookingDetails.pickupDate).getTime()) / (1000 * 60 * 60 * 24))
  const totalAmount = days * parseFloat(bookingDetails.price)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-[#f26e24] px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Booking Summary</h1>
          </div>

          <div className="p-6 space-y-8">
            {/* Vehicle Details */}
            <div className="flex gap-6">
              <div className="relative w-48 h-32">
                <Image
                  src={bookingDetails.vehicleImage}
                  alt={bookingDetails.vehicleName}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{bookingDetails.vehicleName}</h2>
                <p className="text-xl font-semibold text-[#f26e24]">₹{bookingDetails.price}/day</p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Trip Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Pickup Date & Time</p>
                  <p className="font-medium">
                    {new Date(bookingDetails.pickupDate).toLocaleDateString()} at {bookingDetails.pickupTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Drop-off Date & Time</p>
                  <p className="font-medium">
                    {new Date(bookingDetails.dropoffDate).toLocaleDateString()} at {bookingDetails.dropoffTime}
                  </p>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900">Price Summary</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Daily Rate</span>
                  <span>₹{bookingDetails.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Number of Days</span>
                  <span>{days} {days === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="flex justify-between font-medium text-lg pt-2 border-t">
                  <span>Total Amount</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Login Form (shown only when needed) */}
            {showLoginForm && !user ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Sign in to Complete Booking</h2>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#f26e24] focus:border-[#f26e24] sm:text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
                    >
                      {isSubmitting ? 'Signing in...' : 'Sign in'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmBooking}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
                >
                  Confirm Booking
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 