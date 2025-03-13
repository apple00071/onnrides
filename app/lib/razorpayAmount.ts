import logger from '@/lib/logger';

/**
 * Ensures the amount is correctly formatted for Razorpay
 * - If using the amount directly from server response, no conversion needed
 * - If using a raw amount in INR, converts to paise
 * 
 * @param amount The amount to format (in INR if not from server, in paise if from server)
 * @param fromServer Whether the amount is already from the server response
 * @param strict Whether to strictly use the provided amount (ignoring minimums)
 * @returns The amount in paise format ready for Razorpay
 */
export function formatRazorpayAmount(
  amount: number, 
  fromServer: boolean = false,
  strict: boolean = false
): number {
  // If the amount is already from the server response, it's correctly formatted
  if (fromServer) {
    logger.debug('Using server-provided amount:', { amount });
    return amount;
  }
  
  // Convert to paise (multiply by 100)
  const amountInPaise = Math.round(amount * 100);
  logger.debug('Converting amount to paise:', { 
    originalAmount: amount, 
    amountInPaise 
  });
  
  if (strict) {
    // In strict mode, use exactly the calculated amount
    // Note: This might cause issues with Razorpay if amount < 100 paise
    logger.debug('Using strict amount calculation (ignoring minimums):', { amountInPaise });
    return amountInPaise;
  }
  
  // Only enforce minimum if needed for Razorpay technical requirements
  // Razorpay requires minimum 100 paise (₹1)
  if (amountInPaise < 100) {
    logger.warn('Amount too small for Razorpay, adjusting to minimum:', { 
      originalAmountINR: amount,
      originalAmountPaise: amountInPaise,
      adjustedAmount: 100
    });
    return 100;
  }
  
  return amountInPaise;
} 