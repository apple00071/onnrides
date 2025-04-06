/**
 * Check if the application is running in a serverless environment
 * @returns boolean indicating if running in serverless environment
 */
export function isServerless(): boolean {
  return process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined;
} 