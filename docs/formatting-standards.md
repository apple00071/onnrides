# OnnRides Formatting Standards

This document outlines the standardized formatting rules used throughout the OnnRides application.

## Booking IDs

All booking IDs should follow this format:
- Format: `OR` + 3 alphanumeric characters
- Example: `OR735`, `ORZX9`, `OR1AB`

### Implementation

Use the `generateBookingId()` function from `lib/utils/booking-id.ts`:

```typescript
import { generateBookingId } from '@/lib/utils/booking-id';

// Generate a new booking ID
const bookingId = generateBookingId();
```

## Date and Time Formatting

All dates should be formatted in Indian Standard Time (IST) with the following format:
- Format: `DD MMM YYYY, h:mm a` (e.g., "15 Mar 2025, 7:56 AM")

### Implementation

Use the `formatIST()` function from `lib/utils/time-formatter.ts`:

```typescript
import { formatIST, getCurrentIST } from '@/lib/utils/time-formatter';

// Format a date
const formattedDate = formatIST(new Date());

// Format a date string
const formattedDateString = formatIST('2025-03-15T08:30:00');

// Get the current time in IST
const nowIST = getCurrentIST();
const formattedNow = formatIST(nowIST);
```

## Other Date-related Utilities

### Date-only Formatting
For dates without time:
- Format: `DD MMM YYYY` (e.g., "15 Mar 2025")
- Function: `formatISTDateOnly()`

### Time-only Formatting
For times without dates:
- Format: `h:mm a` (e.g., "7:56 AM")
- Function: `formatISTTimeOnly()`

### Duration Formatting
For durations:
- Format: `X.XX hours` or `X hour(s) Y minute(s)`
- Function: `formatDuration()`

## WhatsApp Notifications

When sending WhatsApp notifications, ensure dates are formatted using the standard format by:

```typescript
import { formatIST } from '@/lib/utils/time-formatter';

// Format dates before sending
const formattedStartDate = formatIST(startDate);
const formattedEndDate = formatIST(endDate);

// Then use in WhatsApp service
await whatsappService.sendBookingConfirmation({
  // ...other fields
  startDate: formattedStartDate,
  endDate: formattedEndDate,
  // ...other fields
});
```

## Email Notifications

Email notifications should also use the standard date formatting:

```typescript
import { formatIST } from '@/lib/utils/time-formatter';

// Format dates before sending
const formattedDate = formatIST(date);

// Use in email service
await emailService.sendBookingConfirmation(
  email,
  {
    // ...other fields
    startDate: formattedDate,
    // ...other fields
  }
);
```

## Testing Formats

Use the provided test script to verify formatting consistency:

```bash
npm run test:notifications
```

This will generate messages with standardized formats across all notification channels. 