'use client';

import * as React from 'react';

interface TimeOption {
  time: string;
  display: string;
}

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  minTime?: string;
}

export function TimePicker({ value, onChange, minTime }: TimePickerProps) {
  // Generate time options with 1-hour intervals
  const generateTimeOptions = (): TimeOption[] => {
    const options: TimeOption[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      const display = `${displayHour}:00 ${period}`;
      
      // Skip times before minTime if provided
      if (minTime && time < minTime) continue;
      
      options.push({ time, display });
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded-lg text-gray-900 bg-white hover:border-[#f26e24] focus:ring-2 focus:ring-[#f26e24] focus:border-transparent transition-colors duration-200"
    >
      <option value="">Select time</option>
      {timeOptions.map(({ time, display }) => (
        <option key={time} value={time}>
          {display}
        </option>
      ))}
    </select>
  );
} 