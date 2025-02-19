import { ReactNode } from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

export function QuickActionCard({ title, description, icon, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-center space-x-4">
        <div className="p-2 rounded-lg bg-[#f26e24] bg-opacity-10">
          <div className="text-[#f26e24]">{icon}</div>
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </button>
  );
} 