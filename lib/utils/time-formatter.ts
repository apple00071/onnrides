import { parseISO, isValid, isFuture } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export function getCurrentIST(): Date {
  return new Date();
}

export function isDateInFuture(dateStr: string): boolean {
  try {
    const date = parseISO(dateStr);
    return isFuture(date);
  } catch (error) {
    console.error('Error checking if date is in future:', error);
    return false;
  }
}

export function formatIST(date: Date | string): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) {
      return '—';
    }
    return formatInTimeZone(parsedDate, TIMEZONE, 'dd/MM/yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '—';
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return '—';
    }
    return formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr || '—';
  }
}

export function formatDateTimeIST(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return '—';
    }
    return formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr || '—';
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return '—';
    }
    return formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr || '—';
  }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return '—';
    }
    return formatInTimeZone(date, TIMEZONE, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return dateStr || '—';
  }
}

export function formatDuration(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (minutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
} 