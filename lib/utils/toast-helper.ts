import { toast } from "@/components/ui/use-toast";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export const showToast = {
  success: (message: string, options: ToastOptions = {}) => {
    toast({
      variant: "success",
      title: options.title || "Success",
      description: message,
      duration: options.duration || 3000,
    });
  },

  error: (message: string, options: ToastOptions = {}) => {
    toast({
      variant: "destructive",
      title: options.title || "Error",
      description: message,
      duration: options.duration || 4000,
    });
  },

  warning: (message: string, options: ToastOptions = {}) => {
    toast({
      variant: "warning",
      title: options.title || "Warning",
      description: message,
      duration: options.duration || 4000,
    });
  },

  info: (message: string, options: ToastOptions = {}) => {
    toast({
      variant: "info",
      title: options.title || "Info",
      description: message,
      duration: options.duration || 3000,
    });
  },

  // For API error responses
  apiError: (error: any) => {
    const message = error?.response?.data?.error || error?.message || "An error occurred";
    toast({
      variant: "destructive",
      title: "Error",
      description: message,
      duration: 4000,
    });
  },
}; 