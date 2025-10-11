import express from 'express';
import { WaSenderService } from '../lib/whatsapp/wasender-service';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.WHATSAPP_TEST_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WaSender service
const wasenderService = WaSenderService.getInstance();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Test Server is running!',
    endpoints: {
      'GET /': 'This help message',
      'GET /status': 'Check WaSender session status',
      'POST /send-text': 'Send a text message',
      'POST /send-booking': 'Send booking confirmation',
      'POST /send-payment': 'Send payment confirmation',
      'POST /test-all': 'Run all tests'
    },
    usage: {
      'send-text': {
        method: 'POST',
        body: {
          phone: 'Phone number (e.g., 919182495481)',
          message: 'Text message to send'
        }
      },
      'send-booking': {
        method: 'POST',
        body: {
          customerName: 'Customer name',
          customerPhone: 'Phone number',
          vehicleModel: 'Vehicle model',
          startDate: 'Start date',
          endDate: 'End date',
          bookingId: 'Booking ID',
          totalAmount: 'Total amount'
        }
      }
    }
  });
});

app.get('/status', async (req, res) => {
  try {
    const sessionStatus = await wasenderService.getSessionStatus();
    res.json({
      success: true,
      sessionStatus: sessionStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/send-text', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    const result = await wasenderService.sendTextMessage(phone, message);
    
    res.json({
      success: result,
      message: result ? 'Message sent successfully' : 'Failed to send message'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/send-booking', async (req, res) => {
  try {
    const { customerName, customerPhone, vehicleModel, startDate, endDate, bookingId, totalAmount } = req.body;
    
    if (!customerName || !customerPhone || !vehicleModel || !startDate || !endDate || !bookingId || !totalAmount) {
      return res.status(400).json({
        success: false,
        error: 'All booking fields are required'
      });
    }

    const bookingData = {
      customerName,
      customerPhone,
      vehicleType: 'Bike', // Default
      vehicleModel,
      startDate,
      endDate,
      bookingId,
      totalAmount
    };

    const result = await wasenderService.sendBookingConfirmation(bookingData);
    
    res.json({
      success: result,
      message: result ? 'Booking confirmation sent successfully' : 'Failed to send booking confirmation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/send-payment', async (req, res) => {
  try {
    const { customerName, customerPhone, bookingId, amount, paymentId } = req.body;
    
    if (!customerName || !customerPhone || !bookingId || !amount || !paymentId) {
      return res.status(400).json({
        success: false,
        error: 'All payment fields are required'
      });
    }

    const paymentData = {
      customerName,
      customerPhone,
      bookingId,
      amount,
      paymentId
    };

    const result = await wasenderService.sendPaymentConfirmation(paymentData);
    
    res.json({
      success: result,
      message: result ? 'Payment confirmation sent successfully' : 'Failed to send payment confirmation'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/test-all', async (req, res) => {
  try {
    const testPhone = req.body.phone || process.env.TEST_PHONE_NUMBER || '919182495481';
    const results: any = {};

    // Test 1: Session status
    try {
      const sessionStatus = await wasenderService.getSessionStatus();
      results.sessionStatus = {
        success: !!sessionStatus,
        data: sessionStatus
      };
    } catch (error) {
      results.sessionStatus = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: Text message
    try {
      const textResult = await wasenderService.sendTextMessage(testPhone, `🧪 Test message from OnnRides\nTimestamp: ${new Date().toISOString()}`);
      results.textMessage = {
        success: textResult,
        phone: testPhone
      };
    } catch (error) {
      results.textMessage = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: Booking confirmation
    try {
      const bookingData = {
        customerName: 'Test User',
        customerPhone: testPhone,
        vehicleType: 'Bike',
        vehicleModel: 'Honda Activa 6G',
        startDate: new Date().toLocaleDateString('en-IN'),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
        bookingId: 'TEST-' + Date.now(),
        totalAmount: '500'
      };

      const bookingResult = await wasenderService.sendBookingConfirmation(bookingData);
      results.bookingConfirmation = {
        success: bookingResult,
        bookingId: bookingData.bookingId
      };
    } catch (error) {
      results.bookingConfirmation = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    res.json({
      success: true,
      message: 'All tests completed',
      results: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Test Server is running on port ${PORT}`);
  console.log(`📱 Visit http://localhost:${PORT} for API documentation`);
  console.log(`🔧 Environment variables needed:`);
  console.log(`   - WASENDER_API_KEY (session-specific API key)`);
  console.log(`   - WASENDER_PERSONAL_ACCESS_TOKEN (account-level token)`);
  console.log(`   - WASENDER_WEBHOOK_SECRET (optional, for webhooks)`);
  console.log(`   - TEST_PHONE_NUMBER (optional, defaults to admin phone)`);
  console.log(`\n📋 Quick test commands:`);
  console.log(`   curl -X GET http://localhost:${PORT}/status`);
  console.log(`   curl -X POST http://localhost:${PORT}/send-text -H "Content-Type: application/json" -d '{"phone":"919182495481","message":"Hello from OnnRides!"}'`);
  console.log(`   curl -X POST http://localhost:${PORT}/test-all -H "Content-Type: application/json" -d '{"phone":"919182495481"}'`);
});

export default app;
