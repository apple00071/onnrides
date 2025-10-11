import { NextRequest, NextResponse } from 'next/server';
import { WaSenderService } from '../../../../../lib/whatsapp/wasender-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, phone, message, data } = body;

    if (!type || !phone) {
      return NextResponse.json(
        { success: false, error: 'Type and phone are required' },
        { status: 400 }
      );
    }

    const wasenderService = WaSenderService.getInstance();
    let result = false;

    switch (type) {
      case 'text':
        if (!message) {
          return NextResponse.json(
            { success: false, error: 'Message is required for text type' },
            { status: 400 }
          );
        }
        result = await wasenderService.sendTextMessage(phone, message);
        break;

      case 'booking':
        if (!data || !data.customerName || !data.vehicleModel || !data.bookingId) {
          return NextResponse.json(
            { success: false, error: 'Booking data is incomplete' },
            { status: 400 }
          );
        }
        result = await wasenderService.sendBookingConfirmation({
          customerName: data.customerName,
          customerPhone: phone,
          vehicleType: data.vehicleType || 'Vehicle',
          vehicleModel: data.vehicleModel,
          startDate: data.startDate,
          endDate: data.endDate,
          bookingId: data.bookingId,
          totalAmount: data.totalAmount
        });
        break;

      case 'payment':
        if (!data || !data.customerName || !data.bookingId || !data.amount) {
          return NextResponse.json(
            { success: false, error: 'Payment data is incomplete' },
            { status: 400 }
          );
        }
        result = await wasenderService.sendPaymentConfirmation({
          customerName: data.customerName,
          customerPhone: phone,
          bookingId: data.bookingId,
          amount: data.amount,
          paymentId: data.paymentId || 'N/A'
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid message type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message: result ? 'Message sent successfully' : 'Failed to send message'
    });

  } catch (error) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
