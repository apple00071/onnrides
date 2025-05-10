import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

// Cache the reviews for 1 hour
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let cachedReviews: any = null;
let lastFetchTime: number = 0;

// Real customer reviews
const mockReviews = [
  {
    id: '1',
    name: 'KUNTAPALLY ADARSH',
    comment: 'My experience with them has always been good enough for me to recommend them to other people, cars are reasonably priced, offers are available. And madhapur branch manager adil is nice man and good way of taking.'
  },
  {
    id: '2',
    name: 'Ramu Baghela',
    comment: 'I highly recommend Bike rental from this shop for anyone looking to explore a new palace on two wheels whether you\'re a seasoned cyclist or just looking for a leisurely ride they have something for everyone the quality of service and overall experience was top notch and I will definitely be returning for more rentals in the future give it a try and see for yourself the joy of discovering a new place.'
  },
  {
    id: '3',
    name: 'Shiro Yasha',
    comment: 'Had a great experience, hassle free rental, range of bikes to be rented is quite a lot with the cheapest of rates. Overall a great experience in renting from here, will be back for more rentals in future.'
  },
  {
    id: '4',
    name: 'Sneha Reddy',
    comment: 'Best bike rental service in Hyderabad. The vehicles are in great condition and the process is hassle-free. The staff is very helpful and professional.'
  },
  {
    id: '5',
    name: 'Arun Singh',
    comment: 'Excellent service and well-maintained bikes. The booking process was smooth and the staff was very cooperative. Highly recommended!'
  }
];

export async function GET(request: NextRequest) {
  try {
    // Check if we have cached reviews that aren't expired
    const now = Date.now();
    if (cachedReviews && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json(cachedReviews);
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Cache the reviews
    cachedReviews = mockReviews;
    lastFetchTime = now;

    return NextResponse.json(mockReviews);
  } catch (error) {
    logger.error('Error fetching reviews:', error);
    
    // If we have cached reviews, return them as fallback
    if (cachedReviews) {
      return NextResponse.json(cachedReviews);
    }

    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
} 