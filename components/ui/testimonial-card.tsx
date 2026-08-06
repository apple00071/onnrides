import { FC } from 'react';
import { cn } from '@/lib/utils';
import { Star, Quote } from 'lucide-react';

export interface TestimonialAuthor {
  name: string;
  role?: string;
  avatar?: string;
  handle?: string;
}

export interface TestimonialCardProps {
  name?: string;
  comment?: string;
  rating?: number;
  author?: TestimonialAuthor;
  text?: string;
  className?: string;
}

const TestimonialCard: FC<TestimonialCardProps> = ({
  name,
  comment,
  rating = 5,
  author,
  text,
  className
}) => {
  const displayName = name || author?.name || 'Happy Rider';
  const displayComment = comment || text || 'Great experience renting bikes from Mister Rides! Very smooth process and responsive customer support.';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={cn(
      "bg-gradient-to-b from-white to-orange-50/30 rounded-2xl shadow-xl border border-orange-100 p-8 md:p-10 mx-4 relative overflow-hidden",
      "transform transition-all duration-300 hover:shadow-2xl",
      className
    )}>
      <Quote className="absolute top-4 right-6 w-16 h-16 text-orange-200/40 pointer-events-none" />

      <div className="flex flex-col items-center text-center relative z-10">
        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-5 h-5 fill-current",
                i < (rating || 5) ? "text-amber-400" : "text-gray-200"
              )}
            />
          ))}
        </div>

        {/* Review Text */}
        <blockquote className="text-gray-800 text-base md:text-lg mb-6 leading-relaxed font-medium max-w-2xl">
          "{displayComment}"
        </blockquote>

        {/* Avatar & Name */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#f26e24] to-amber-400 text-white font-bold text-lg flex items-center justify-center shadow-md">
            {initial}
          </div>
          <div className="text-left">
            <cite className="font-bold text-gray-900 block not-italic text-sm">
              {displayName}
            </cite>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              ✓ Verified Customer • Hyderabad
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard; 
