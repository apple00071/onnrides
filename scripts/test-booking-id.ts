import { generateBookingId, formatBookingId, isValidBookingId } from '../lib/utils/booking-id';
import logger from '../lib/logger';

function testBookingIdGenerator() {
  console.log('Testing booking ID generator...');
  
  // Generate multiple booking IDs to ensure uniqueness
  const ids = [];
  for (let i = 0; i < 10; i++) {
    const bookingId = generateBookingId();
    const isValid = isValidBookingId(bookingId);
    
    ids.push({
      bookingId,
      isValid,
      formatted: formatBookingId(bookingId)
    });
  }
  
  console.log('Generated booking IDs:');
  ids.forEach((id, index) => {
    console.log(`  ${index + 1}. ${id.bookingId} (valid: ${id.isValid})`);
  });
  
  // Test with an invalid booking ID
  const invalidId = 'XX123';
  console.log(`\nTesting invalid booking ID: ${invalidId}`);
  console.log(`  Valid: ${isValidBookingId(invalidId)}`);
  
  // Test with a correct format booking ID
  const validId = 'OR123';
  console.log(`\nTesting valid booking ID: ${validId}`);
  console.log(`  Valid: ${isValidBookingId(validId)}`);
}

testBookingIdGenerator(); 