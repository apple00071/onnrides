import { validateBookingDates, calculateBookingDuration } from '../lib/utils/booking-validator';
import { formatIST, getCurrentIST } from '../lib/utils/time-formatter';
import logger from '../lib/logger';

function testBookingValidator() {
  console.log('Testing booking validator...');
  
  const now = getCurrentIST();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoHoursLater = new Date(now);
  twoHoursLater.setHours(twoHoursLater.getHours() + 2);
  
  const thirtyMinutesLater = new Date(now);
  thirtyMinutesLater.setMinutes(thirtyMinutesLater.getMinutes() + 30);
  
  // Test cases
  const testCases = [
    {
      name: 'Valid booking (tomorrow)',
      booking: {
        pickupDate: tomorrow,
        dropoffDate: new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000) // 4 hours later
      }
    },
    {
      name: 'Invalid booking (past pickup)',
      booking: {
        pickupDate: yesterday,
        dropoffDate: tomorrow
      }
    },
    {
      name: 'Invalid booking (dropoff before pickup)',
      booking: {
        pickupDate: tomorrow,
        dropoffDate: now
      }
    },
    {
      name: 'Invalid booking (too short duration)',
      booking: {
        pickupDate: twoHoursLater,
        dropoffDate: new Date(twoHoursLater.getTime() + 30 * 60 * 1000) // 30 minutes later
      }
    },
    {
      name: 'Valid booking (same day, future)',
      booking: {
        pickupDate: twoHoursLater,
        dropoffDate: new Date(twoHoursLater.getTime() + 4 * 60 * 60 * 1000) // 4 hours later
      }
    }
  ];
  
  console.log(`Current time: ${formatIST(now)}\n`);
  
  // Run tests
  testCases.forEach(testCase => {
    const { name, booking } = testCase;
    const result = validateBookingDates(booking);
    const duration = calculateBookingDuration(booking);
    
    console.log(`Test case: ${name}`);
    console.log(`  Pickup: ${formatIST(booking.pickupDate)}`);
    console.log(`  Dropoff: ${formatIST(booking.dropoffDate)}`);
    console.log(`  Duration: ${duration !== null ? `${duration.toFixed(2)} hours` : 'Invalid duration'}`);
    console.log(`  Valid: ${result.isValid}`);
    
    if (!result.isValid && result.errors.length > 0) {
      console.log('  Errors:');
      result.errors.forEach(error => {
        console.log(`    - ${error.code}: ${error.message}`);
      });
    }
    
    console.log('');
  });
}

testBookingValidator(); 