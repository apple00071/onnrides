# OnnRides - Vehicle Rental Platform

## Overview

OnnRides is a vehicle rental platform that allows users to rent bikes and other vehicles. The platform includes user authentication, booking management, payment processing via Razorpay, and administrative features.

## Deployment Instructions

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- Vercel account (for deployment)

### Environment Variables

Ensure the following environment variables are set in your Vercel project:

```
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/dbname
POSTGRES_URL=postgresql://user:password@host:port/dbname

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# Razorpay Integration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=465
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="Your App <noreply@yourdomain.com>"

# WhatsApp Integration
WHATSAPP_API_URL=your-whatsapp-api-url
WHATSAPP_API_KEY=your-whatsapp-api-key
ADMIN_PHONE=your-admin-phone-number

# Base URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Database Setup

The application includes migration scripts to set up your database. These migrations will run automatically during the build process.

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure the environment variables
3. Set the Node.js version to 18.x
4. Deploy the application

### Database Column Name Requirements

The application supports both camelCase (e.g., "updatedAt") and snake_case (e.g., "updated_at") column naming conventions. For optimal compatibility, we use:

1. snake_case conventions in the database
2. Prisma mappings to translate between formats
3. Compatibility views for queries that need to work with both formats

### Build Process

The build process performs the following steps:

1. Runs database compatibility scripts to ensure queries work with both naming conventions
2. Generates Prisma client based on the schema
3. Builds the Next.js application

### Troubleshooting

If you encounter database-related errors during build or deployment:

1. Ensure your database is accessible from the Vercel environment
2. Check that the PostgreSQL user has proper permissions
3. Verify that the database schema matches the expected column names
4. Run the migration scripts manually if needed

## Local Development

1. Clone the repository
2. Create a `.env` file with the required environment variables
3. Run `npm install` to install dependencies
4. Run `npm run migrate` to set up the database
5. Run `npm run dev` to start the development server

## Support

For additional support, contact the development team at support@onnrides.com.

## Features

- Vehicle rental booking system
- Real-time availability tracking
- Secure payment processing with Razorpay
- Email notifications for bookings and updates
- WhatsApp notifications for important updates
- Admin dashboard for managing rentals

## API Documentation

### WhatsApp Notifications

The application uses a custom WhatsApp Business API for sending notifications. The following types of notifications are supported:

1. Booking Confirmations
2. Payment Confirmations
3. Booking Cancellations
4. Admin Notifications

Example usage:
```typescript
const whatsapp = WhatsAppService.getInstance();

// Send booking confirmation
await whatsapp.sendBookingConfirmation({
  customerName: "John Doe",
  customerPhone: "919876543210",
  vehicleType: "Bike",
  vehicleModel: "Honda Activa",
  startDate: "2024-03-20 10:00 AM",
  endDate: "2024-03-21 10:00 AM",
  bookingId: "OR123",
  totalAmount: "₹500",
  pickupLocation: "Hyderabad"
});
```

## Recent Updates

### Admin PWA Support

The admin dashboard now supports installation as a Progressive Web App (PWA). Administrators can install the dashboard as a standalone app on desktop and mobile devices.

See [Admin PWA Documentation](docs/admin-pwa.md) for more details.

### URL Consistency

The application now consistently redirects `/home` to the root URL (`/`) to ensure:
- Consistent user experience
- Better SEO (no duplicate content)
- Reliable maintenance mode behavior
- Accurate analytics

See [URL Consistency Documentation](docs/url-consistency.md) for more details.

### Maintenance Mode

The maintenance mode feature allows administrators to temporarily disable public access to the site during maintenance or updates. 

See [Maintenance Mode Documentation](docs/maintenance-mode.md) for more details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
