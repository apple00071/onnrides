# OnnRides - Vehicle Rental Service

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Gmail account for email notifications
- WhatsApp Business API for notifications
- Razorpay account for payments

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=your_database_url

# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
SMTP_FROM="ONNRIDES <your_email@gmail.com>"

# WhatsApp Configuration
WHATSAPP_API_URL=http://34.45.239.220:3001
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_INSTANCE_ID_1=onnrides_customer
WHATSAPP_INSTANCE_ID_2=onnrides_admin
ADMIN_PHONE=your_admin_phone_number

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/onnrides.git
cd onnrides
```

2. Install dependencies
```bash
npm install
```

3. Run database migrations
```bash
npm run migrate
```

4. Start the development server
```bash
npm run dev
```

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
