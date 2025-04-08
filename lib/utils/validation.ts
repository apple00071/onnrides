import logger from '../logger';

/**
 * Validates an Indian phone number
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, or XXXXXXXXXX (10 digits)
 */
export function isValidIndianPhone(phone: string | null): boolean {
  if (!phone) return false;

  // Remove any spaces, dashes, or other separators
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Check for valid Indian phone number formats
  const phoneRegex = /^(?:\+?91)?[6789]\d{9}$/;
  
  if (!phoneRegex.test(cleanPhone)) {
    return false;
  }
  
  // Check for suspicious patterns (all same digits, sequential numbers)
  const last10Digits = cleanPhone.slice(-10);
  
  // Check if all digits are the same (e.g., 9999999999)
  if (/^(\d)\1{9}$/.test(last10Digits)) {
    logger.warn('Blocked suspicious phone number with repeated digits:', { phone });
    return false;
  }
  
  // Check for sequential numbers (e.g., 1234567890, 9876543210)
  if (/^(?:0123456789|1234567890|9876543210)$/.test(last10Digits)) {
    logger.warn('Blocked suspicious phone number with sequential digits:', { phone });
    return false;
  }
  
  return true;
}

/**
 * Validates an email address with additional checks
 * - Basic email format validation
 * - Common disposable email domains check
 * - Common fake email patterns check
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  // Convert email to lowercase for checking
  const lowerEmail = email.toLowerCase();

  // Expanded list of disposable email domains
  const disposableDomains = [
    'tempmail.com',
    'throwawaymail.com',
    'mailinator.com',
    'guerrillamail.com',
    'sharklasers.com',
    'gmi.omd', // Suspicious domain from your example
    'temp-mail.org',
    'fakeinbox.com',
    'tempinbox.com',
    'yopmail.com',
    'emailfake.com',
    'dispostable.com',
    '10minutemail.com',
    'mintemail.com',
    'mailmetrash.com',
    'filzmail.com',
    'mailnesia.com',
    'mailcatch.com',
    'tempmail.net',
    'discard.email',
    'maildrop.cc',
    'gsg.com', // From the example you showed
    'qq.com',
    'grr.la',
    'trashmail.com',
    'mailnull.com',
    'spamgourmet.com',
    'jetable.org',
    'fakemailgenerator.com',
    'emailondeck.com',
    'anonbox.net',
    'trash-mail.com',
    'getairmail.com',
    'abcdefg.com',
    'test.com',
    'example.com',
    'fake.com',
    'temporary.net',
    'dropmail.me',
    'sharklasers.com',
    'armyspy.com',
    'cuvox.de',
    'dayrep.com',
    'einrot.com',
    'fleckens.hu',
    'gustr.com',
    'jourrapide.com',
    'rhyta.com',
    'superrito.com',
    'teleworm.us',
  ];

  // Enhanced list of suspicious patterns
  const suspiciousPatterns = [
    /^[0-9]+@/,  // Starts with numbers
    /qe[0-9]+@/, // Pattern like qe59979022@
    /test[0-9]*@/,
    /temp[0-9]*@/,
    /fake[0-9]*@/,
    /dummy[0-9]*@/,
    /^user[0-9]*@/,
    /^admin[0-9]*@/,
    /^guest[0-9]*@/,
    /^info@/,
    /^noreply@/,
    /^[a-z]{1,4}@/, // Very short usernames like a@, ab@, abc@, abcd@
    /^[a-z]+\d{4,}@/, // Letters followed by many numbers
    /^[a-z]{1,4}\.[a-z]{1,4}@/, // Very simple first.last patterns
    /fser@/, // From the example you showed
  ];

  // Check domain validity stronger
  const domain = lowerEmail.split('@')[1];
  
  // Check against disposable domains
  if (disposableDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
    logger.warn('Blocked registration attempt with disposable email domain:', { email, domain });
    return false;
  }

  // Check against suspicious patterns
  if (suspiciousPatterns.some(pattern => pattern.test(lowerEmail))) {
    logger.warn('Blocked registration attempt with suspicious email pattern:', { email });
    return false;
  }
  
  // Check for unlikely TLDs that might be fake (added filtering)
  const unlikelyTLDs = ['xyz', 'top', 'gq', 'tk', 'ml', 'cf', 'ga'];
  const tld = domain.split('.').pop();
  if (tld && unlikelyTLDs.includes(tld)) {
    logger.warn('Blocked registration with suspicious TLD:', { email, tld });
    return false;
  }

  return true;
}

/**
 * Formats a phone number to standard Indian format
 * @param phone The phone number to format
 * @returns Formatted phone number or null if invalid
 */
export function formatIndianPhone(phone: string | null): string | null {
  if (!phone) return null;

  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Check if it's a valid Indian phone number
  if (!isValidIndianPhone(digits)) return null;

  // Remove country code if present and take last 10 digits
  const last10Digits = digits.slice(-10);
  
  return last10Digits;
} 