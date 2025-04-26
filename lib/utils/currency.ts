/**
 * Formats a number into INR currency string
 * @param amount - The amount to format
 * @returns Formatted currency string with INR symbol
 */
export const formatCurrency = (amount: number | string): string => {
  // Convert string amount to number if needed
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericAmount);
}; 