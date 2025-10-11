import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppReminderService } from '../../../../lib/whatsapp/reminder-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    const reminderService = WhatsAppReminderService.getInstance();

    switch (type) {
      case 'pickup':
        await reminderService.sendPickupReminders();
        return NextResponse.json({
          success: true,
          message: 'Pickup reminders sent successfully'
        });

      case 'return':
        await reminderService.sendReturnReminders();
        return NextResponse.json({
          success: true,
          message: 'Return reminders sent successfully'
        });

      case 'all':
        await reminderService.runAllReminders();
        return NextResponse.json({
          success: true,
          message: 'All reminders sent successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid reminder type. Use: pickup, return, or all'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send reminders'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reminderService = WhatsAppReminderService.getInstance();
    await reminderService.runAllReminders();
    
    return NextResponse.json({
      success: true,
      message: 'All reminders processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process reminders'
    }, { status: 500 });
  }
}
