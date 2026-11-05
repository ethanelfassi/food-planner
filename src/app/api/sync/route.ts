import { NextResponse } from 'next/server';
import { getDbVersion } from '@/lib/db';

export async function GET() {
  const meta = getDbVersion();
  return NextResponse.json(
    {
      ok: true,
      version: meta.version,
      updatedAt: meta.updatedAt,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
}
