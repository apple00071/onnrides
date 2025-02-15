# WhatsApp Service for OnnRides

A microservice that handles WhatsApp messaging functionality for OnnRides, including booking confirmations, cancellations, and payment notifications.

## Features

- WhatsApp message sending using whatsapp-web.js
- SQLite database for message logging and rate limiting
- Express.js REST API with authentication
- Docker support for easy deployment
- TypeScript for type safety
- Winston logging

## Prerequisites

- Node.js 18 or later
- SQLite3
- Chrome/Chromium (for WhatsApp Web)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Update the environment variables in `.env`

## Development

Start the development server:
```bash
npm run dev
```

## Production Build

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Docker Deployment

Build the Docker image:
```bash
docker build -t whatsapp-service .
```

Run the container:
```bash
docker run -p 3001:3001 -v $(pwd)/data:/app/data --env-file .env whatsapp-service
```

## API Endpoints

### Authentication

All endpoints require an API key to be sent in the `x-api-key` header.

### Available Endpoints

- `GET /health` - Health check endpoint
- `GET /whatsapp/init` - Initialize WhatsApp and get QR code if needed
- `GET /whatsapp/status` - Get WhatsApp connection status
- `POST /whatsapp/send` - Send a WhatsApp message
- `POST /whatsapp/booking/confirm` - Send booking confirmation
- `POST /whatsapp/booking/cancel` - Send booking cancellation
- `POST /whatsapp/payment/confirm` - Send payment confirmation

For detailed API documentation, see the request/response examples below.

### Example Requests

#### Send Message
```json
POST /whatsapp/send
{
  "to": "919876543210",
  "message": "Hello from OnnRides!",
  "bookingId": "optional-booking-id"
}
```

#### Booking Confirmation
```json
POST /whatsapp/booking/confirm
{
  "phone": "919876543210",
  "userName": "John Doe",
  "vehicleDetails": "Honda Activa",
  "bookingDate": "2024-03-15 10:00 AM",
  "bookingId": "booking-123"
}
```

#### Booking Cancellation
```json
POST /whatsapp/booking/cancel
{
  "phone": "919876543210",
  "userName": "John Doe",
  "vehicleDetails": "Honda Activa",
  "bookingId": "booking-123"
}
```

#### Payment Confirmation
```json
POST /whatsapp/payment/confirm
{
  "phone": "919876543210",
  "userName": "John Doe",
  "amount": "500",
  "bookingId": "booking-123"
}
```

## Directory Structure

```
whatsapp-service/
├── src/
│   ├── server.ts      # Main Express server
│   ├── service.ts     # WhatsApp service implementation
│   ├── config.ts      # WhatsApp client configuration
│   ├── logger.ts      # Winston logger configuration
│   └── init.ts        # Directory initialization
├── data/              # SQLite database and WhatsApp auth
├── logs/              # Application logs
├── dist/              # Compiled TypeScript
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env
```

## Error Handling

The service includes comprehensive error handling:
- Input validation for all endpoints
- WhatsApp connection error handling
- Database error handling
- Rate limiting
- Logging of all errors with stack traces

## Logging

Logs are stored in the `logs` directory:
- `error.log` - Error level logs
- `combined.log` - All logs

In development, logs are also printed to the console with colors.

## Security

- API key authentication required for all endpoints
- CORS configuration with allowed origins
- No sensitive data logged
- Environment variables for configuration
- Docker security best practices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is proprietary and confidential. 