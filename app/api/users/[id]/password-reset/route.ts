import { NextRequest, NextResponse } from 'next/server';
import { usersLogger } from '@/app/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    usersLogger.info('Password reset API called', { userId: id });
    usersLogger.info('Processing password reset', { userId: id });

    return NextResponse.json({
      success: true,
      message: 'Route is working',
      userId: id
    });

  } catch (error) {
    usersLogger.error('Password reset error', { userId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    );
  }
}