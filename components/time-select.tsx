'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimeSelectProps {
  value?: string;
  onChange: (value: string) => void;
  interval?: number;
}

export function TimeSelect({ value, onChange, interval = 30 }: TimeSelectProps) {
  const generateTimeSlots = () => {
    const slots = [];
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

  const timeSlots = generateTimeSlots();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {timeSlots.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 