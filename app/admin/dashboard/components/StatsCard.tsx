import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  change: string;
  trend: 'up' | 'down';
}

export function StatsCard({ title, value, icon, change, trend }: StatsCardProps) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-gray-50">{icon}</div>
        <div className={`flex items-center text-xs font-medium ${
          trend === 'up' ? 'text-green-600' : 'text-red-600'
        }`}>
          {change}
          <svg
            className={`w-3 h-3 ml-1 ${trend === 'up' ? 'rotate-0' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
} 