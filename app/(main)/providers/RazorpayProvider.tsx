'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
    razorpayInstance: any; // Track the current instance
  }
}

interface PaymentOptions {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  bookingId: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

const isBrowserSupported = () => {
  try {
    const ua = window.navigator.userAgent.toLowerCase();
    const vendor = window.navigator.vendor?.toLowerCase() || '';
    const platform = window.navigator.platform?.toLowerCase() || '';
    
    logger.info('Browser detection:', { 
      userAgent: ua,
      vendor,
      platform,
      language: window.navigator.language,
      cookiesEnabled: window.navigator.cookieEnabled,
      isSecureContext: window.isSecureContext
    });
    
    // Check for mobile browsers
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini|silk|webos|windows phone/i.test(ua);
    
    // For mobile devices, be extremely permissive
    if (isMobile) {
      // Allow almost all mobile browsers
      const isModernMobile = /chrome|safari|firefox|edge|opera|samsung|ucbrowser|miui|huawei|vivo|oppo|xiaomi|webview|wv/i.test(ua);
      
      logger.info('Mobile browser check:', { 
        isMobile: true, 
        isModernMobile,
        browserType: ua.match(/chrome|safari|firefox|edge|opera|samsung|ucbrowser|miui|huawei|vivo|oppo|xiaomi|webview|wv/i)?.[0],
        vendor,
        platform
      });
      
      // Special handling for WebView browsers - be more permissive
      if (/(webview|wv)/i.test(ua)) {
        logger.info('WebView detected:', {
          userAgent: ua,
          isChrome: /chrome/i.test(ua),
          isSafari: /safari/i.test(ua),
          isWebKit: /webkit/i.test(ua)
        });
        // Allow any WebView that's based on a modern browser engine
        return /webkit|chrome|safari|firefox/i.test(ua);
      }
      
      // If it's a mobile browser but not recognized as modern,
      // still allow it but log for monitoring
      if (!isModernMobile) {
        logger.warn('Unrecognized mobile browser allowed:', {
          userAgent: ua,
          vendor,
          platform
        });
      }
      
      // Allow all mobile browsers
      return true;
    }

    // For desktop, be very permissive with browser support
    const isModernDesktop = /chrome|firefox|safari|edge|opera|chromium|webkit|gecko/i.test(ua);
    
    logger.info('Desktop browser check:', { 
      isMobile: false, 
      isModernDesktop,
      browserType: ua.match(/chrome|firefox|safari|edge|opera|chromium|webkit|gecko/i)?.[0],
      vendor,
      platform
    });

    // If it's a desktop browser but not recognized as modern,
    // still allow it but log for monitoring
    if (!isModernDesktop) {
      logger.warn('Unrecognized desktop browser allowed:', {
        userAgent: ua,
        vendor,
        platform
      });
    }

    // Allow all desktop browsers
    return true;

  } catch (error) {
    logger.error('Error in browser detection:', {
      error,
      navigator: {
        userAgent: window.navigator.userAgent,
        vendor: window.navigator.vendor,
        platform: window.navigator.platform
      }
    });
    // If there's any error in detection, allow the browser
    return true;
  }
};

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  return new Promise((resolve, reject) => {
    try {
      // Clean up any existing Razorpay instance
      if (window.razorpayInstance) {
        logger.info('Cleaning up existing Razorpay instance');
        try {
          window.razorpayInstance.close();
          window.razorpayInstance = null;
        } catch (cleanupError) {
          logger.warn('Error cleaning up previous Razorpay instance:', cleanupError);
        }
      }

      // Always log browser info when payment is initialized
      const ua = window.navigator.userAgent.toLowerCase();
      logger.info('Payment initialization browser info:', {
        userAgent: ua,
        vendor: window.navigator.vendor,
        platform: window.navigator.platform,
        language: window.navigator.language,
        cookiesEnabled: window.navigator.cookieEnabled,
        isSecureContext: window.isSecureContext,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        razorpayAvailable: !!window.Razorpay,
        existingInstance: !!window.razorpayInstance
      });

      // Wait for Razorpay to be available with better error handling
      let attempts = 0;
      const maxAttempts = 10;
      const checkRazorpay = () => {
        logger.info('Checking Razorpay availability:', { 
          attempt: attempts + 1, 
          maxAttempts,
          razorpayExists: !!window.Razorpay 
        });

        if (window.Razorpay) {
          logger.info('Razorpay found, initializing payment');
          initializePayment();
        } else if (attempts < maxAttempts) {
          attempts++;
          logger.info('Razorpay not found, retrying...', { attempt: attempts });
          setTimeout(checkRazorpay, Math.min(1000 * Math.pow(1.5, attempts), 5000));
        } else {
          const error = new Error('Payment system failed to load. Please try refreshing the page.');
          logger.error('Max attempts reached waiting for Razorpay:', {
            attempts,
            scriptLoaded: document.querySelector('script[src*="razorpay"]') !== null
          });
          reject(error);
          toast.error(error.message);
        }
      };

      const initializePayment = () => {
        if (!options.bookingId) {
          throw new Error('Booking ID is required');
        }

        try {
          // Create new Razorpay instance
          window.razorpayInstance = new window.Razorpay({
            key: options.key,
            amount: options.amount,
            currency: options.currency,
            name: 'OnnRides',
            description: `Booking ID: ${options.bookingId}`,
            order_id: options.orderId,
            prefill: options.prefill,
            notes: {
              booking_id: options.bookingId
            },
            handler: async function (response: any) {
              try {
                // Clear the instance after successful payment
                window.razorpayInstance = null;

                logger.info('Payment successful, verifying...', {
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  bookingId: options.bookingId
                });

                const verifyResponse = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    booking_id: options.bookingId
                  }),
                });

                const verifyData = await verifyResponse.json();
                
                if (!verifyResponse.ok || !verifyData.success) {
                  throw new Error(verifyData.error || 'Payment verification failed');
                }

                toast.success('Payment successful!');
                resolve(verifyData);
              } catch (error) {
                window.razorpayInstance = null; // Clear instance on error
                logger.error('Payment verification error:', {
                  error,
                  bookingId: options.bookingId,
                  orderId: response.razorpay_order_id
                });
                toast.error('Payment verification failed. Please contact support.');
                reject(error);
              }
            },
            modal: {
              ondismiss: function() {
                // Clear the instance when modal is dismissed
                window.razorpayInstance = null;
                logger.info('Payment modal dismissed by user');
                toast.error('Payment cancelled');
                reject(new Error('Payment cancelled by user'));
              },
              confirm_close: true,
              escape: false,
              backdropclose: false,
              animation: true // Enable animations
            },
            theme: {
              color: '#f26e24',
            },
            retry: {
              enabled: true,
              max_count: 3
            }
          });

          logger.info('Opening Razorpay modal');
          window.razorpayInstance.open();
        } catch (error) {
          window.razorpayInstance = null; // Clear instance on error
          logger.error('Error creating Razorpay instance:', error);
          toast.error('Failed to initialize payment. Please refresh and try again.');
          reject(error);
        }
      };

      // Start checking for Razorpay
      checkRazorpay();
    } catch (error) {
      window.razorpayInstance = null; // Clear instance on any error
      logger.error('Failed to initialize Razorpay:', error);
      toast.error('Failed to initialize payment. Please refresh and try again.');
      reject(error);
    }
  });
};

export default function RazorpayProvider() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Cleanup function to clear any existing instance
    return () => {
      if (window.razorpayInstance) {
        try {
          window.razorpayInstance.close();
          window.razorpayInstance = null;
        } catch (error) {
          logger.warn('Error cleaning up Razorpay instance:', error);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (scriptLoaded) {
      logger.info('Razorpay script loaded successfully');
    }
  }, [scriptLoaded]);

  return (
    <Script
      id="razorpay-script"
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
      async
      defer
      onLoad={() => {
        logger.info('Razorpay script loaded event triggered');
        setScriptLoaded(true);
      }}
      onError={(e: Error) => {
        logger.error('Failed to load Razorpay script:', e);
        toast.error('Failed to load payment system. Please refresh the page.');
      }}
    />
  );
} 