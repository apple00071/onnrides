import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { convertDatesInQueryResults } from '@/lib/utils/timezone-config';

type MiddlewareHandler = (req: NextRequest, res: NextResponse) => Promise<NextResponse>;

/**
 * Middleware that processes API responses to ensure consistent timezone handling
 * This automatically converts date fields in the response to IST timezone
 * 
 * @param handler The original API route handler
 * @returns A wrapped handler with timezone processing
 */
export function withTimezoneProcessing(handler: MiddlewareHandler): MiddlewareHandler {
  return async (req: NextRequest, res: NextResponse) => {
    // Call the original handler
    const response = await handler(req, res);
    
    try {
      // Get the response data
      const data = await response.json();
      
      // Process the response if it's successful and has data
      if (data && typeof data === 'object') {
        let processed = data;
        
        // If the response has data property (common pattern)
        if (data.data && Array.isArray(data.data)) {
          // These are common date field names in the application
          const dateFields = [
            'created_at', 'updated_at', 'start_date', 'end_date', 
            'pickup_datetime', 'dropoff_datetime', 'payment_date',
            'booking_date', 'pickup_date', 'dropoff_date'
          ];
          
          // Process date fields in the response data
          processed = {
            ...data,
            data: convertDatesInQueryResults(data.data, dateFields)
          };
        }
        
        // Create a new response with the processed data
        return NextResponse.json(processed, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Timezone-Processed': 'true'
          }
        });
      }
    } catch (error) {
      // If there's an error processing the response, log it but return the original response
      logger.error('Error in timezone middleware:', error);
    }
    
    // Return the original response if we couldn't process it
    return response;
  };
}

/**
 * Usage example:
 * 
 * // In your API route:
 * import { withTimezoneProcessing } from '@/middleware/timezone-middleware';
 * 
 * async function handler(req: NextRequest) {
 *   // Your API logic here
 *   return NextResponse.json({ data: yourData });
 * }
 * 
 * export const GET = withTimezoneProcessing(handler);
 */ 