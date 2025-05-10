import { FC } from 'react';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
  name: string;
  comment: string;
  className?: string;
}

const TestimonialCard: FC<TestimonialCardProps> = ({
  name,
  comment,
  className
}) => {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-md p-8 mx-4",
      "transform transition-all duration-300",
      className
    )}>
      <div className="flex flex-col items-center text-center">
        {/* Review Text */}
        <blockquote className="text-gray-700 text-lg mb-4 italic">
          "{comment}"
        </blockquote>

        {/* Name */}
        <footer className="mt-2">
          <cite className="font-semibold text-gray-900 block not-italic">
            {name}
          </cite>
        </footer>
      </div>
    </div>
  );
};

export default TestimonialCard; 