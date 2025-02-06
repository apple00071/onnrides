interface BookingDetails {
  id: string;
  vehicle?: {
    name: string;
  };
  start_date: string | Date;
  end_date: string | Date;
  total_amount: number;
  pickup_location?: string;
}

export function createBookingConfirmationEmail(booking: BookingDetails) {
  return {
    subject: `Booking Confirmation - #${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f26e24; text-align: center;">Booking Confirmed!</h1>
        
        <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #333;">Booking Details</h2>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Vehicle:</strong> ${booking.vehicle?.name || 'N/A'}</p>
          <p><strong>Start Date:</strong> ${new Date(booking.start_date).toLocaleDateString()}</p>
          <p><strong>End Date:</strong> ${new Date(booking.end_date).toLocaleDateString()}</p>
          ${booking.pickup_location ? `<p><strong>Pickup Location:</strong> ${booking.pickup_location}</p>` : ''}
          <p><strong>Total Amount:</strong> ₹${booking.total_amount}</p>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #333;">Important Information</h3>
          <ul style="padding-left: 20px;">
            <li>Please carry a valid driving license</li>
            <li>Maintain the vehicle in good condition</li>
            <li>Follow all traffic rules and regulations</li>
            <li>Keep the vehicle clean and tidy</li>
            <li>Return the vehicle with the same fuel level</li>
          </ul>
        </div>

        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #f26e24; margin-top: 0;">Need Help?</h3>
          <p style="margin-bottom: 0;">
            If you have any questions or need assistance, please contact our support team:
            <br />
            Email: support@onnrides.com
            <br />
            Phone: +91 XXXXXXXXXX
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p>Thank you for choosing ONNRIDES!</p>
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    `,
  };
}

export function createPasswordResetEmail(resetUrl: string) {
  return {
    subject: 'Reset Your Password - ONNRIDES',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f26e24; text-align: center;">Reset Your Password</h1>
        
        <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>You have requested to reset your password. Click the button below to proceed:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #f26e24; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="margin-bottom: 0;">This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    `,
  };
}

export function createWelcomeEmail(name: string) {
  return {
    subject: 'Welcome to ONNRIDES! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f26e24; text-align: center;">Welcome to ONNRIDES!</h1>
        
        <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hi ${name},</p>
          <p>Thank you for joining ONNRIDES! We're excited to have you on board.</p>
          
          <h3 style="color: #333;">What's Next?</h3>
          <ul style="padding-left: 20px;">
            <li>Browse our collection of vehicles</li>
            <li>Book your first ride</li>
            <li>Explore special offers</li>
          </ul>
        </div>

        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #f26e24; margin-top: 0;">Need Help?</h3>
          <p style="margin-bottom: 0;">
            Our support team is always here to help you:
            <br />
            Email: support@onnrides.com
            <br />
            Phone: +91 XXXXXXXXXX
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p>Happy riding!</p>
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    `,
  };
} 