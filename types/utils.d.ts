declare module '@/lib/utils/currency-formatter' {
  export function formatCurrency(amount: number): string;
  export function formatCurrencyWithDecimals(amount: number): string;
  export function formatCurrencyWithCustomDecimals(amount: number, decimals: number): string;
}

declare module '@/lib/utils/time-formatter' {
  export function formatDateTime(date: string | Date): string;
  export function formatDate(date: string | Date): string;
  export function formatTime(date: string | Date): string;
  export function formatIST(date: string | Date): string;
}

declare module '@/components/ui/use-toast' {
  export interface Toast {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }

  export function toast(props: Toast): void;
  export function useToast(): { toast: (props: Toast) => void };
}

declare module '@/components/ui/toast' {
  export { toast } from '@/components/ui/use-toast';
}

declare module './ViewBookingModal' {
  import { type bookings } from '@prisma/client';
  
  interface ViewBookingModalProps {
    booking: bookings;
    isOpen: boolean;
    onClose: () => void;
  }

  export function ViewBookingModal(props: ViewBookingModalProps): JSX.Element;
}

declare module './ViewHistoryModal' {
  import { type bookings } from '@prisma/client';
  
  interface ViewHistoryModalProps {
    booking: bookings;
    isOpen: boolean;
    onClose: () => void;
  }

  export function ViewHistoryModal(props: ViewHistoryModalProps): JSX.Element;
} 