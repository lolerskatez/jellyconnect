import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/app/lib/config';
import { testLogger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    testLogger.info('Testing Jellyfin connectivity', { url: config.jellyfinUrl });
    
    // Test 1: Check if Jellyfin is reachable
    testLogger.info('Testing basic connectivity');
    const systemRes = await fetch(`${config.jellyfinUrl}/System/Info/Public`);
    testLogger.info('System info status', { status: systemRes.status });
    
    if (!systemRes.ok) {
      return NextResponse.json({
        error: 'Jellyfin not reachable',
        status: systemRes.status,
        url: config.jellyfinUrl
      }, { status: 500 });
    }

    // Test 2: Try Quick Connect
    testLogger.info('Testing Quick Connect');
    const qcRes = await fetch(`${config.jellyfinUrl}/QuickConnect/Initiate`, {
      method: 'POST'
    });
    
    testLogger.info('QC Initiate status', { status: qcRes.status });
    const qcText = await qcRes.text();
    testLogger.info('QC Initiate response', { response: qcText });
    
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
    testLogger.error('QC test error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ 
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
