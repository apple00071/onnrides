import crypto from 'crypto';
import logger from '@/lib/logger';

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  try {
    if (!signature) {
      logger.warn('No signature provided for webhook verification');
      return false;
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      logger.error('WhatsApp app secret not configured');
      return false;
    }

    // Get the signature from the header
    const [algorithm, expectedHash] = signature.split('=');
    
    if (algorithm !== 'sha256') {
      logger.warn('Invalid signature algorithm');
      return false;
    }

    // Calculate the hash of the body using your app secret
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(rawBody);
    const calculatedHash = hmac.digest('hex');

    // Compare the calculated hash with the expected hash
    const isValid = expectedHash === calculatedHash;
    
    if (!isValid) {
      logger.warn('Invalid webhook signature');
    }

    return isValid;
  } catch (error) {
    logger.error('Error verifying webhook signature:', error);
    return false;
  }
} 