import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

const CONFIG_PATH = join(process.cwd(), 'config.json');

interface Config {
  jellyfinUrl: string;
  apiKey: string;
  enableRegistration?: boolean;
  [key: string]: any;
}

function loadConfig(): Config {
  try {
    const data = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load config:', error);
    return { jellyfinUrl: '', apiKey: '', enableRegistration: true };
  }
}

function saveConfig(config: Config): void {
  try {
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// GET - retrieve registration setting
export async function GET() {
  try {
    const config = loadConfig();
    return NextResponse.json({
      enableRegistration: config.enableRegistration ?? true,
    });
  } catch (error) {
    console.error('Failed to get registration setting:', error);
    return NextResponse.json(
      { error: 'Failed to get registration setting' },
      { status: 500 }
    );
  }
}

// PUT - update registration setting (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Check authentication - this should be called from admin server only
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { enableRegistration } = body;

    if (typeof enableRegistration !== 'boolean') {
      return NextResponse.json(
        { error: 'enableRegistration must be a boolean' },
        { status: 400 }
      );
    }

    const config = loadConfig();
    config.enableRegistration = enableRegistration;
    saveConfig(config);

    return NextResponse.json({
      success: true,
      enableRegistration: config.enableRegistration,
    });
  } catch (error) {
    console.error('Failed to update registration setting:', error);
    return NextResponse.json(
      { error: 'Failed to update registration setting' },
      { status: 500 }
    );
  }
}
