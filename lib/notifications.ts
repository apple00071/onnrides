import toast from 'react-hot-toast';
import logger from './logger';

interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

const defaultOptions: NotificationOptions = {
  duration: 5000,
  position: 'bottom-center',
};

export const notify = {
  success: (message: string, options?: NotificationOptions) => {
    logger.info('Success notification:', message);
    return toast.success(message, {
      ...defaultOptions,
      ...options,
      style: {
        background: '#363636',
        color: '#fff',
      },
      iconTheme: {
        primary: '#22c55e',
        secondary: '#fff',
      },
    } as any);
  },

  error: (message: string, options?: NotificationOptions) => {
    logger.error('Error notification:', message);
    return toast.error(message, {
      ...defaultOptions,
      duration: 6000, // Errors shown longer by default
      ...options,
      style: {
        background: '#363636',
        color: '#fff',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
    } as any);
  },

  loading: (message: string, options?: NotificationOptions) => {
    logger.info('Loading notification:', message);
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
      style: {
        background: '#363636',
        color: '#fff',
      },
    });
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  promise: async <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: NotificationOptions
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        ...defaultOptions,
        ...options,
        style: {
          background: '#363636',
          color: '#fff',
        },
      }
    );
  },
}; 