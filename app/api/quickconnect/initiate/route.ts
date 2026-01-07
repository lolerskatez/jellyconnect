import { NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { quickConnectLogger } from '@/app/lib/logger';

export async function POST() {
  try {
    const config = getConfig();
    const res = await fetch(`${config.jellyfinUrl}/QuickConnect/Initiate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to initiate');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    quickConnectLogger.error('Failed to initiate Quick Connect', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Failed to initiate Quick Connect' }, { status: 500 });
  }
}