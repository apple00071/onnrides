'use client';

import { format, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import logger from '@/lib/logger';

interface DateTimePickerProps {
  date: Date | null;
  setDate: (date: Date | null) => void;
  minDate?: Date;
  className?: string;
}

const DateTimePicker = ({ date, setDate, minDate, className }: DateTimePickerProps) => {
  const formatDate = (date: Date | null) => {
    if (!date || !isValid(date)) return '';
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      logger.error('Error formatting date:', error);
      return '';
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date || !isValid(date)) return '';
    try {
      return format(date, 'HH:mm');
    } catch (error) {
      logger.error('Error formatting time:', error);
      return '';
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newDate = e.target.value ? new Date(e.target.value) : null;
      if (newDate && isValid(newDate)) {
        // Preserve the time if there was a previous date
        if (date && isValid(date)) {
          newDate.setHours(date.getHours(), date.getMinutes());
        }
        setDate(newDate);
      } else {
        setDate(null);
      }
    } catch (error) {
      logger.error('Error handling date change:', error);
      setDate(null);
    }
  };

  const handleTimeChange = (time: string) => {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = date && isValid(date) ? new Date(date) : new Date();
      newDate.setHours(hours, minutes);
      
      if (isValid(newDate)) {
        setDate(newDate);
      }
    } catch (error) {
      logger.error('Error handling time change:', error);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={formatDate(date)}
          min={minDate ? formatDate(minDate) : undefined}
          onChange={handleDateChange}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
        />
        <Select
          value={formatTime(date)}
          onValueChange={handleTimeChange}
          disabled={!date || !isValid(date)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select time" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 48 }, (_, i) => {
              const hour = Math.floor(i / 2);
              const minute = (i % 2) * 30;
              const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
              return (
                <SelectItem key={timeValue} value={timeValue}>
                  {timeValue}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default DateTimePicker;