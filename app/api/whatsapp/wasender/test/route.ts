import { NextRequest, NextResponse } from 'next/server';
import { WaSenderService } from '../../../../../lib/whatsapp/wasender-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;
    
    const testPhone = phone || process.env.TEST_PHONE_NUMBER || '919182495481';
    const wasenderService = WaSenderService.getInstance();
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
      const textResult = await wasenderService.sendTextMessage(
        testPhone, 
        `🧪 Test message from OnnRides Admin Panel\nTimestamp: ${new Date().toISOString()}\n\nThis is a test to verify WhatsApp integration is working correctly.`
      );
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

    // Test 4: Payment confirmation
    try {
      const paymentData = {
        customerName: 'Test User',
        customerPhone: testPhone,
        bookingId: 'TEST-' + Date.now(),
        amount: '500',
        paymentId: 'PAY-' + Date.now()
      };

      const paymentResult = await wasenderService.sendPaymentConfirmation(paymentData);
      results.paymentConfirmation = {
        success: paymentResult,
        paymentId: paymentData.paymentId
      };
    } catch (error) {
      results.paymentConfirmation = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'All tests completed',
      testPhone: testPhone,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('WhatsApp test API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
