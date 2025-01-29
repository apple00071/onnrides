"use client";

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons';
import { TimeSelect } from './time-select';

interface DateTimePickerProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  minDate?: Date;
  className?: string;
}

export function DateTimePicker({
  date,
  setDate,
  minDate,
  className,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    date ?? undefined
  );
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    date ? format(date, 'HH:mm') : undefined
  );

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && selectedTime) {
      const [hours, minutes] = selectedTime.split(':');
      const newDate = new Date(date);
      newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      setDate(newDate);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate && time) {
      const [hours, minutes] = time.split(':');
      const newDate = new Date(selectedDate);
      newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      setDate(newDate);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP HH:mm') : <span>Pick a date and time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
          disabled={(date) =>
            minDate ? date < minDate || date < new Date() : date < new Date()
          }
        />
        <div className="p-3 border-t border-border">
          <TimeSelect
            value={selectedTime}
            onChange={handleTimeSelect}
            interval={60}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
} 