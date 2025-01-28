'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@radix-ui/react-icons';

interface TimeSelectProps {
  value?: string;
  onChange: (value: string) => void;
  interval?: number;
}

export function TimeSelect({ value, onChange, interval = 30 }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    const totalMinutes = 24 * 60;
    for (let i = 0; i < totalMinutes; i += interval) {
      const hours = Math.floor(i / 60);
      const minutes = i % 60;
      const time = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
      slots.push(time);
    }
    return slots;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const timeSlots = generateTimeSlots();

  return (
    <div className="relative w-[180px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 py-2 text-sm rounded-md border border-input bg-background flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {value || "Select time"}
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 