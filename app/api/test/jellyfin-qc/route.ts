import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    console.log('[QC Test] Testing Jellyfin at:', config.jellyfinUrl);
    
    // Test 1: Check if Jellyfin is reachable
    console.log('[QC Test] Testing basic connectivity...');
    const systemRes = await fetch(`${config.jellyfinUrl}/System/Info/Public`);
    console.log('[QC Test] System info status:', systemRes.status);
    
    if (!systemRes.ok) {
      return NextResponse.json({
        error: 'Jellyfin not reachable',
        status: systemRes.status,
        url: config.jellyfinUrl
      }, { status: 500 });
    }

    // Test 2: Try Quick Connect
    console.log('[QC Test] Testing Quick Connect...');
    const qcRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Initiate`, {
      method: 'POST'
    });
    
    console.log('[QC Test] QC Initiate status:', qcRes.status);
    const qcText = await qcRes.text();
    console.log('[QC Test] QC Initiate response:', qcText);
    
    if (!qcRes.ok) {
      return NextResponse.json({
        error: 'Quick Connect failed',
        status: qcRes.status,
        response: qcText
      }, { status: 500 });
    }

    const qcData = JSON.parse(qcText);
    return NextResponse.json({
      success: true,
      systemInfo: await systemRes.json(),
      quickConnect: qcData
    });
    
  } catch (error) {
    console.error('[QC Test] Error:', error);
    return NextResponse.json({ 
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
