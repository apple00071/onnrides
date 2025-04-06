// Re-export utility functions
export * from './currency-formatter';
export * from './time-formatter';

// Calculate duration between two dates in hours
export const calculateDuration = (startDate: Date, endDate: Date): number => {
  const diffInMilliseconds = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffInMilliseconds / (1000 * 60 * 60)); // Convert to hours and round up
};

// Check if the environment is serverless
export const isServerless = (): boolean => {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;
}; 