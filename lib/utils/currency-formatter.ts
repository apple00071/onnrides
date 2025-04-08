/**
 * Format a number as Indian Rupees (INR)
 * @param amount - The amount to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  options: Intl.NumberFormatOptions = {}
): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };

  try {
    return new Intl.NumberFormat('en-IN', mergedOptions).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback format
    return `₹${amount.toFixed(0)}`;
  }
};

/**
 * Parse a currency string back to a number
 * @param currencyString - The currency string to parse (e.g., "₹1,000")
 * @returns number
 */
export const parseCurrencyString = (currencyString: string): number => {
  try {
    // Remove currency symbol, commas and spaces
    const cleanString = currencyString.replace(/[₹,\s]/g, '');
    return parseFloat(cleanString);
  } catch (error) {
    console.error('Error parsing currency string:', error);
    return 0;
  }
}; 