import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Site Maintenance - OnnRides',
  description: 'Our site is currently undergoing scheduled maintenance. Please check back soon.',
};

export default function MaintenancePage() {
  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md py-8 px-8 bg-white rounded-lg shadow-lg text-center">
          <div className="flex justify-center mb-6">
            <Image 
              src="/logo.png" 
              alt="OnnRides Logo" 
              width={90} 
              height={60} 
              className="h-auto w-auto max-w-[90px]" 
              priority
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-3">
            We&apos;re Down for Maintenance
          </h1>
          
          <div className="w-16 h-1 bg-orange-500 mx-auto mb-6"></div>
          
          <p className="text-gray-600 mb-8">
            We&apos;re working to make OnnRides even better for you. 
            Our site is currently undergoing scheduled maintenance 
            and will be back soon.
          </p>
          
          <div className="flex justify-center space-x-6 mb-6">
            <a href="mailto:support@onnrides.com" className="text-orange-500 hover:text-orange-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/onnridesrentals/" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          
          <p className="text-sm text-gray-500">
            We&apos;ll be back as soon as possible. Thank you for your patience.
          </p>
        </div>
        
        <div className="mt-8 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} OnnRides
        </div>
      </div>
    </>
  );
} 