import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-6xl font-bold text-[#f26e24]">404</h1>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Page Not Found
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          The page you are looking for does not exist.
        </p>
        <div className="mt-5">
          <Link href="/" className="text-[#f26e24] hover:text-[#e05d13] font-medium">
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
} 