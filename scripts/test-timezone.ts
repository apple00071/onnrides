import { formatInTimeZone } from 'date-fns-tz';
import { toIST, formatDateTimeIST, formatDateIST, formatTimeIST, formatISOWithTZ } from '../lib/utils/timezone';
import { formatBookingDateTime } from '../lib/utils';
import { formatIST, formatISTDateOnly, formatISTTimeOnly } from '../lib/utils/time-formatter';

// Test dates in different timezones
const testDates = [
  new Date('2024-03-24T00:00:00Z'), // UTC midnight
  new Date('2024-03-24T00:00:00+05:30'), // IST midnight
  new Date('2024-03-24T12:00:00Z'), // UTC noon
  new Date('2024-03-24T12:00:00+05:30'), // IST noon
  new Date('2024-03-24T18:30:00Z'), // UTC evening
  new Date('2024-03-24T18:30:00+05:30'), // IST evening
];

console.log('Timezone Test Results:');
console.log('======================\n');

testDates.forEach((date, index) => {
  console.log(`Test Case ${index + 1}:`);
  console.log('Input Date:', date.toISOString());
  console.log('UTC Time:', date.toUTCString());
  console.log('Local Time:', date.toString());
  
  // Test timezone.ts functions
  const istDate = toIST(date);
  console.log('\nTimezone.ts Functions:');
  console.log('toIST:', istDate?.toISOString());
  console.log('formatDateTimeIST:', formatDateTimeIST(date));
  console.log('formatDateIST:', formatDateIST(date));
  console.log('formatTimeIST:', formatTimeIST(date));
  console.log('formatISOWithTZ:', formatISOWithTZ(date));
  
  // Test time-formatter.ts functions
  console.log('\nTime-formatter.ts Functions:');
  console.log('formatIST:', formatIST(date));
  console.log('formatISTDateOnly:', formatISTDateOnly(date));
  console.log('formatISTTimeOnly:', formatISTTimeOnly(date));
  
  // Test utils.ts functions
  console.log('\nUtils.ts Functions:');
  console.log('formatBookingDateTime:', formatBookingDateTime(date));
  
  // Test direct formatInTimeZone
  console.log('\nDirect formatInTimeZone:');
  console.log('Full format:', formatInTimeZone(date, 'Asia/Kolkata', 'PPP p'));
  console.log('ISO format:', formatInTimeZone(date, 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ssXXX"));
  
  console.log('\n-------------------\n');
});

// Test edge cases
console.log('Edge Cases:');
console.log('===========\n');

// Test null/undefined
console.log('Null/Undefined Tests:');
console.log('toIST(null):', toIST(null));
console.log('formatDateTimeIST(null):', formatDateTimeIST(null));
console.log('formatBookingDateTime(null):', formatBookingDateTime(null));

// Test invalid dates
console.log('\nInvalid Date Tests:');
console.log('toIST("invalid"):', toIST('invalid'));
console.log('formatDateTimeIST("invalid"):', formatDateTimeIST('invalid'));
console.log('formatBookingDateTime("invalid"):', formatBookingDateTime('invalid'));

// Test DST transition dates (India doesn't observe DST, but good to test)
const dstDates = [
  new Date('2024-03-10T02:00:00Z'), // US DST start
  new Date('2024-03-31T01:00:00Z'), // EU DST start
];

console.log('\nDST Transition Tests:');
dstDates.forEach((date, index) => {
  console.log(`\nDST Test ${index + 1}:`);
  console.log('Input Date:', date.toISOString());
  console.log('formatDateTimeIST:', formatDateTimeIST(date));
  console.log('formatInTimeZone:', formatInTimeZone(date, 'Asia/Kolkata', 'PPP p'));
}); 