import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-4xl font-bold text-gray-900">404 - Page Not Found</h1>
        
        <div className="space-y-2">
          <p className="text-gray-600">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/">
            <Button className="bg-[#f26e24] hover:bg-[#e05d13] text-white">
              Return to home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 