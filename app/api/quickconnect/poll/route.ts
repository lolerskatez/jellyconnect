import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { quickConnectSchema } from '@/app/lib/validation';
import { quickConnectLogger } from '@/app/lib/logger';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate input
  const validationResult = quickConnectSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validationResult.error.issues },
      { status: 400 }
    );
  }

  const { code: secret } = validationResult.data;

  const config = getConfig();
  try {
    const res = await fetch(`${config.jellyfinUrl}/QuickConnect/Connect?secret=${secret}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) throw new Error('Failed to poll');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    quickConnectLogger.error('Failed to poll Quick Connect', { secret, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to poll Quick Connect' }, { status: 500 });
  }
}