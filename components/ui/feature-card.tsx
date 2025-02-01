'use client';

import Image from 'next/image';
import { FeatureCardProps } from './types';

const FeatureCard = ({ icon, title, description, iconBgColor = 'bg-primary', iconSize = 32 }: FeatureCardProps) => {
  const isImageIcon = icon.startsWith('/');

  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        <div className={`w-16 h-16 ${iconBgColor} rounded-full flex items-center justify-center`}>
          {isImageIcon ? (
            <Image
              src={icon}
              alt={title}
              width={iconSize}
              height={iconSize}
            />
          ) : (
            <span className="text-2xl font-bold text-primary">{icon}</span>
          )}
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

export default FeatureCard; 