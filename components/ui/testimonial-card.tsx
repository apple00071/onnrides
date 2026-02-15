import { FC } from 'react';
import { cn } from '@/lib/utils';

export interface TestimonialAuthor {
  name: string;
  role?: string;
  avatar?: string;
  handle?: string;
}

export interface TestimonialCardProps {
  name?: string;
  comment?: string;
  author?: TestimonialAuthor;
  text?: string;
  className?: string;
}

const TestimonialCard: FC<TestimonialCardProps> = ({
  name,
  comment,
  author,
  text,
  className
}) => {
  const displayName = name || author?.name || 'Customer';
  const displayComment = comment || text || '';
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-md p-8 mx-4",
      "transform transition-all duration-300",
      className
    )}>
      <div className="flex flex-col items-center text-center">
        {/* Review Text */}
        <blockquote className="text-gray-700 text-lg mb-4 italic">
          "{displayComment}"
        </blockquote>

        {/* Name */}
        <footer className="mt-2">
          <cite className="font-semibold text-gray-900 block not-italic">
            {displayName}
          </cite>
        </footer>
      </div>
    </div>
  );
};

export default TestimonialCard; 