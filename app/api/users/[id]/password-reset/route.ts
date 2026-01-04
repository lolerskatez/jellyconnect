import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Password reset API called');
    const { id } = await params;
    console.log('User ID:', id);

    return NextResponse.json({
      success: true,
      message: 'Route is working',
      userId: id
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed' },
      { status: 500 }
    );
  }
}