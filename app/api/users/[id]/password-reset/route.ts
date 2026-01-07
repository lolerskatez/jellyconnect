import { NextRequest, NextResponse } from 'next/server';
import { userLogger } from '@/app/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    userLogger.info('Password reset API called', { userId: id });
    const { id } = await params;
    userLogger.info('Processing password reset', { userId: id });

    return NextResponse.json({
      success: true,
      message: 'Route is working',
      userId: id
    });

  } catch (error) {
    userLogger.error('Password reset error', { userId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    );
  }
}