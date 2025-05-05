import { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ErrorProps {
  statusCode?: number;
  message?: string;
}

const Error: NextPage<ErrorProps> = ({ statusCode, message }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 p-8 max-w-lg">
        <h1 className="text-4xl font-bold text-gray-900">
          {statusCode ? `Error ${statusCode}` : 'An Error Occurred'}
        </h1>
        
        <p className="text-lg text-gray-600">
          {message || 'Sorry, something went wrong. Please try again later.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          
          <Link href="/" passHref>
            <Button className="w-full sm:w-auto">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 