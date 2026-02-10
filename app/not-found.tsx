import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
            <div className="text-center space-y-6 max-w-lg">
                <h1 className="text-6xl font-bold text-[#f26e24]">404</h1>
                <h2 className="text-3xl font-semibold text-gray-900">Page Not Found</h2>

                <p className="text-gray-600">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                <div className="pt-4">
                    <Link href="/">
                        <Button className="bg-[#f26e24] hover:bg-[#e05d13] text-white px-8">
                            Back to Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
