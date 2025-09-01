import { parseISO, isValid } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Kolkata';

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      return '—';
    }
    return formatInTimeZone(date, TIMEZONE, 'dd MMM yyyy hh:mm aa');
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
    return formatInTimeZone(date, TIMEZONE, 'dd MMM yyyy hh:mm aa');
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
    return formatInTimeZone(date, TIMEZONE, 'dd MMM yyyy');
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
    return formatInTimeZone(date, TIMEZONE, 'hh:mm aa');
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