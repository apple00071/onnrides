import logger from '@/lib/logger';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      // If response is not ok, throw error
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      logger.error(`API call failed (attempt ${i + 1}/${retries}):`, {
        url,
        error: lastError.message,
        attempt: i + 1,
        maxRetries: retries
      });

      // If this was the last retry, throw the error
      if (i === retries - 1) {
        throw new Error(
          `Failed after ${retries} retries: ${lastError.message}`
        );
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // This should never be reached due to the throw in the loop
  throw lastError || new Error('Unknown error occurred');
}

export async function fetchJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return response.json();
}

export function handleApiError(error: unknown): { error: string } {
  logger.error('API Error:', error);
  
  if (error instanceof Error) {
    return { error: error.message };
  }
  
  return { error: 'An unexpected error occurred' };
} 