'use client';

import Image from 'next/image';
import { ReviewCardProps } from './types';

const ReviewCard = ({ customerName, customerImage, rating, review }: ReviewCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full mr-4">
          <Image
            src={customerImage}
            alt={customerName}
            width={48}
            height={48}
            className="rounded-full"
          />
        </div>
        <div>
          <h3 className="font-semibold">{customerName}</h3>
          <div className="flex text-yellow-400">
            {"★".repeat(rating)}
            {"☆".repeat(5 - rating)}
          </div>
        </div>
      </div>
      <p className="text-gray-600">{review}</p>
    </div>
  );
}

export default ReviewCard; 