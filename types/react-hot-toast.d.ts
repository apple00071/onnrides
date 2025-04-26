declare module 'react-hot-toast' {
  export interface ToastOptions {
    id?: string;
    icon?: React.ReactNode;
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    style?: React.CSSProperties;
    className?: string;
    ariaProps?: {
      role?: string;
      'aria-live'?: 'assertive' | 'off' | 'polite';
      'aria-atomic'?: 'true' | 'false';
    };
  }

  export interface Toast {
    id: string;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    message: string | React.ReactNode;
    icon?: React.ReactNode;
    duration?: number;
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    style?: React.CSSProperties;
    className?: string;
    ariaProps?: {
      role?: string;
      'aria-live'?: 'assertive' | 'off' | 'polite';
      'aria-atomic'?: 'true' | 'false';
    };
    visible: boolean;
    height?: number;
  }

  export type ToastType = 'success' | 'error' | 'loading' | 'blank' | 'custom';

  export function toast(
    message: string | React.ReactNode,
    options?: ToastOptions
  ): string;

  export namespace toast {
    function success(
      message: string | React.ReactNode,
      options?: ToastOptions
    ): string;
    function error(
      message: string | React.ReactNode,
      options?: ToastOptions
    ): string;
    function loading(
      message: string | React.ReactNode,
      options?: ToastOptions
    ): string;
    function custom(
      message: string | React.ReactNode,
      options?: ToastOptions
    ): string;
    function dismiss(toastId?: string): void;
    function remove(toastId?: string): void;
    function promise<T>(
      promise: Promise<T>,
      msgs: {
        loading: string | React.ReactNode;
        success: string | React.ReactNode | ((data: T) => string | React.ReactNode);
        error: string | React.ReactNode | ((error: any) => string | React.ReactNode);
      },
      opts?: ToastOptions
    ): Promise<T>;
  }

  export function useToaster(): {
    toasts: Toast[];
    handlers: {
      startPause: () => void;
      endPause: () => void;
      updateHeight: (toastId: string, height: number) => void;
      updateToast: (toast: Toast) => void;
    };
  };

  export interface ToasterProps {
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    toastOptions?: ToastOptions;
    reverseOrder?: boolean;
    gutter?: number;
    containerStyle?: React.CSSProperties;
    containerClassName?: string;
    children?: (toast: Toast) => React.ReactNode;
  }

  export function Toaster(props?: ToasterProps): JSX.Element;

  export default toast;
} 