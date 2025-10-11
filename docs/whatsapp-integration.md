# WhatsApp Integration with WaSender API

This document explains how to set up and use the WhatsApp integration using the WaSender API service.

## Overview

The OnnRides platform now supports WhatsApp messaging through the WaSender API, which provides a reliable and cost-effective way to send WhatsApp messages to customers for booking confirmations, payment notifications, and other communications.

## Features

- ✅ Send text messages via WhatsApp
- ✅ Booking confirmation messages
- ✅ Payment confirmation messages
- ✅ Session management and status checking
- ✅ Automatic phone number formatting
- ✅ Error handling and retry mechanisms
- ✅ Rate limiting support

## Setup Instructions

### 1. WaSender Account Setup

1. Visit [WaSender API](https://wasenderapi.com)
2. Create an account and verify your email
3. Create a WhatsApp session:
   - Go to Dashboard → WhatsApp Sessions
   - Click "Create New Session"
   - Scan the QR code with your WhatsApp
   - Wait for the session to connect

### 2. Get API Credentials

You'll need two types of credentials:

#### Session-Specific API Key
- Go to your connected WhatsApp session
- Copy the "API Key" (used for sending messages)

#### Personal Access Token (PAT)
- Go to Settings → Personal Access Token
- Generate a new token (used for session management)

#### Webhook Secret (Optional)
- Go to your session settings
- Generate a webhook secret (for receiving webhooks)

### 3. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# WaSender API Configuration
WASENDER_API_KEY="your-wasender-session-api-key"
WASENDER_PERSONAL_ACCESS_TOKEN="your-wasender-personal-access-token"
WASENDER_WEBHOOK_SECRET="your-wasender-webhook-secret"

# Testing Configuration
TEST_PHONE_NUMBER="919182495481"
WHATSAPP_TEST_PORT="3001"
```

## Usage

### Basic Text Message

```typescript
import { WaSenderService } from '@/lib/whatsapp/wasender-service';

const wasenderService = WaSenderService.getInstance();

// Send a simple text message
await wasenderService.sendTextMessage('919182495481', 'Hello from OnnRides!');
```

### Booking Confirmation

```typescript
const bookingData = {
  customerName: 'John Doe',
  customerPhone: '919182495481',
  vehicleType: 'Bike',
  vehicleModel: 'Honda Activa 6G',
  startDate: '2025-01-15',
  endDate: '2025-01-16',
  bookingId: 'BOOK123456',
  totalAmount: '500'
};

await wasenderService.sendBookingConfirmation(bookingData);
```

### Payment Confirmation

```typescript
const paymentData = {
  customerName: 'John Doe',
  customerPhone: '919182495481',
  bookingId: 'BOOK123456',
  amount: '500',
  paymentId: 'PAY789012'
};

await wasenderService.sendPaymentConfirmation(paymentData);
```

## Testing

### 1. Run the Test Script

```bash
npm run test:wasender
```

This will test:
- Session status
- Simple text message
- Booking confirmation
- Payment confirmation

### 2. Start the Test Server

```bash
npm run whatsapp:server
```

The server will start on port 3001 (or the port specified in `WHATSAPP_TEST_PORT`).

### 3. Test Endpoints

#### Check Status
```bash
curl -X GET http://localhost:3001/status
```

#### Send Text Message
```bash
curl -X POST http://localhost:3001/send-text \
  -H "Content-Type: application/json" \
  -d '{"phone":"919182495481","message":"Hello from OnnRides!"}'
```

#### Send Booking Confirmation
```bash
curl -X POST http://localhost:3001/send-booking \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "customerPhone": "919182495481",
    "vehicleModel": "Honda Activa 6G",
    "startDate": "2025-01-15",
    "endDate": "2025-01-16",
    "bookingId": "BOOK123456",
    "totalAmount": "500"
  }'
```

#### Run All Tests
```bash
curl -X POST http://localhost:3001/test-all \
  -H "Content-Type: application/json" \
  -d '{"phone":"919182495481"}'
```

## Integration with Existing Code

### Replace Existing WhatsApp Services

The new `WaSenderService` can be used as a drop-in replacement for existing WhatsApp services:

```typescript
// Old way (using existing services)
import { WhatsAppService } from '@/lib/whatsapp/service';

// New way (using WaSender)
import { WaSenderService } from '@/lib/whatsapp/wasender-service';

const whatsappService = WaSenderService.getInstance();
```

### Update Booking Flow

In your booking confirmation logic:

```typescript
// After successful booking creation
const wasenderService = WaSenderService.getInstance();
await wasenderService.sendBookingConfirmation({
  customerName: booking.customerName,
  customerPhone: booking.phoneNumber,
  vehicleType: vehicle.type,
  vehicleModel: vehicle.model,
  startDate: booking.startDate,
  endDate: booking.endDate,
  bookingId: booking.id,
  totalAmount: booking.totalAmount.toString()
});
```

## Phone Number Format

The service automatically formats phone numbers:
- Removes all non-digit characters
- Adds India country code (91) for 10-digit numbers
- Preserves existing country codes

Examples:
- `9182495481` → `919182495481`
- `+91 9182495481` → `919182495481`
- `91-9182495481` → `919182495481`

## Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const result = await wasenderService.sendTextMessage(phone, message);
  if (result) {
    console.log('Message sent successfully');
  } else {
    console.log('Failed to send message');
  }
} catch (error) {
  console.error('Error:', error);
}
```

## Rate Limiting

The WaSender SDK includes automatic retry mechanisms for rate-limited requests (HTTP 429). The service is configured with:
- Maximum 3 retries
- Exponential backoff
- Respect for `retry_after` headers

## Troubleshooting

### Common Issues

1. **Messages not sending**
   - Check if your WhatsApp session is connected
   - Verify API credentials are correct
   - Ensure phone numbers are properly formatted

2. **Session disconnected**
   - Re-scan QR code in WaSender dashboard
   - Check session status via `/status` endpoint

3. **Rate limiting**
   - The service automatically handles retries
   - Check rate limit information in logs

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Support

For issues related to:
- **WaSender API**: Contact [WaSender Support](https://wasenderapi.com/help)
- **Integration**: Check the logs and test endpoints
- **OnnRides specific**: Contact the development team

## Next Steps

1. Set up webhook endpoints for receiving incoming messages
2. Implement message templates for better formatting
3. Add support for media messages (images, documents)
4. Set up monitoring and alerting for failed messages
