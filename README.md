# OnnRides Vehicle Rental Platform

OnnRides is a modern web application for renting bikes, scooters, and other vehicles in Hyderabad, India. The platform offers hourly, daily, and weekly rental options with multiple pickup/dropoff locations.

## Key Features

- Vehicle search with real-time availability checking
- Online booking and payment processing (Razorpay integration)
- User account management with secure document verification
- Admin dashboard for fleet and booking management
- WhatsApp and email notifications for bookings and updates

## Technical Architecture

### Database Connection Management

The application uses both Prisma ORM and direct PostgreSQL queries via the `pg` package. To ensure reliable database access, we've implemented:

#### Connection Pooling

- **Main PostgreSQL Pool**: Configured in `lib/db.ts` with optimal settings for production environments
- **Prisma Connection**: Singleton pattern implementation in `lib/prisma.ts`

#### Error Handling and Resilience

- **Retry Logic**: All database operations include automatic retry with exponential backoff for transient errors
- **Connection Validation**: Pool health monitoring with periodic checks
- **Error Logging**: Comprehensive logging of database errors with context for easier debugging

#### Graceful Shutdown

The application uses a centralized `ShutdownManager` (in `lib/shutdown-manager.ts`) to ensure proper closure of all connections during server shutdown:

1. **Shutdown Phases**:
   - `web`: Close HTTP server first
   - `services`: Terminate background services
   - `databases`: Close database connections last
   - `final`: Final cleanup operations

2. **Benefits**:
   - Prevents "Connection already closed" errors
   - Ensures all queries complete before shutdown
   - Properly releases system resources
   - Maintains order of operations for dependent systems

## Development

### Prerequisites

- Node.js (v18+)
- PostgreSQL database (or Neon serverless PostgreSQL)
- Razorpay account for payment processing
- SMTP server for email notifications
- UltraMsg account for WhatsApp notifications

### Environment Setup

Configure the following environment variables in `.env`:

```
# Database Configuration
DATABASE_URL="postgresql://user:password@host:port/database"
DIRECT_URL="postgresql://user:password@host:port/database"

# PostgreSQL Connection Pool Configuration
PG_POOL_MAX=20
PG_POOL_IDLE_TIMEOUT=30000
PG_POOL_CONNECTION_TIMEOUT=10000

# Other services configuration
# ...
```

### Running the Application

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start the development server
npm run dev
```

## Troubleshooting Database Connections

If you encounter database connection errors like `Error { kind: Closed, cause: None }`, try the following:

1. **Test Connection**: Run `npm run test:db` to diagnose connection issues
2. **Check Pool Settings**: Adjust `PG_POOL_*` variables for your environment
3. **Verify Network**: Ensure network stability between the application and database
4. **Monitor Connection Count**: Use the database dashboard to check for connection limit issues

## License

Copyright © 2024 OnnRides. All rights reserved.
