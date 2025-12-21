import { NextResponse } from 'next/server';
import { getAllInvites } from '@/app/lib/db/queries';

export async function GET() {
  try {
    const invites = getAllInvites();
    return NextResponse.json(invites);
  } catch (error) {
    console.error('Failed to fetch all invites:', error);
    return NextResponse.json({ error: 'Failed to fetch all invites' }, { status: 500 });
  }
}