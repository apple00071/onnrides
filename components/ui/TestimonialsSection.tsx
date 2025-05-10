'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import TestimonialCard from './testimonial-card';
import logger from '@/lib/logger';

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  profilePhotoUrl: string;
  createTime: string;
}

export default function TestimonialsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Failed to fetch reviews');
        const data = await response.json();
        setReviews(data);
        setError(null);
      } catch (err) {
        logger.error('Error fetching reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const nextReview = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex + 1 >= reviews.length ? 0 : prevIndex + 1
    );
  };

  const previousReview = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex - 1 < 0 ? reviews.length - 1 : prevIndex - 1
    );
  };

  // Auto-rotate testimonials every 5 seconds
  useEffect(() => {
    if (reviews.length <= 1) return;

    const interval = setInterval(nextReview, 5000);
    return () => clearInterval(interval);
  }, [reviews.length]);

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied customers about their experience with OnnRides.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          {reviews.length > 1 && (
            <>
              <button
                onClick={previousReview}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-10"
                aria-label="Previous review"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextReview}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 transition-colors z-10"
                aria-label="Next review"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="overflow-hidden">
            <div className="flex transition-transform duration-500 ease-in-out">
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className="w-full flex-shrink-0"
                  style={{
                    transform: `translateX(-${currentIndex * 100}%)`,
                  }}
                >
                  <TestimonialCard {...review} />
                </div>
              ))}
            </div>
          </div>

          {reviews.length > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex
                      ? 'bg-[#f26e24]'
                      : 'bg-gray-300'
                  }`}
                  aria-label={`Go to review ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 