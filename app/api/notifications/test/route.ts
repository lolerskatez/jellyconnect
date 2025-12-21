import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/app/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const { userId, subject, message } = await request.json();

    if (!userId || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, subject, message' },
        { status: 400 }
      );
    }

    await sendNotification({
      userId,
      subject,
      message,
      type: 'custom'
    });

    return NextResponse.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}