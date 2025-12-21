import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';

export async function POST(request: NextRequest) {
  const config = getConfig();
  const { secret } = await request.json();
  try {
    const res = await fetch(`${config.jellyfinUrl}/QuickConnect/Connect?secret=${secret}`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error('Failed to poll');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to poll Quick Connect' }, { status: 500 });
  }
}