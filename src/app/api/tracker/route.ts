import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountBySessionToken,
  getActiveAccountId,
  getDailyTrackerLogs,
  saveDailyTrackerLog,
} from '@/lib/db';

const SESSION_COOKIE = 'fp_session';

function resolveCurrentAccountId(request: NextRequest, fallbackId?: string): string {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = getAccountBySessionToken(token);
  if (user) return user.id;
  if (fallbackId) return fallbackId;
  return getActiveAccountId() || 'ethan';
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const queryAccountId = url.searchParams.get('accountId') || undefined;
    const accountId = resolveCurrentAccountId(request, queryAccountId);
    const logs = getDailyTrackerLogs(accountId);

    return NextResponse.json({
      ok: true,
      accountId,
      logs,
    });
  } catch (err: any) {
    console.error('Erreur GET /api/tracker:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = resolveCurrentAccountId(request, body.accountId);
    const dayIndex = typeof body.dayIndex === 'number' ? body.dayIndex : Number(body.dayIndex) || 0;
    const eatenMeals = body.eatenMeals || { breakfast: false, lunch: false, dinner: false, snack: false };
    const customEntries = Array.isArray(body.customEntries) ? body.customEntries : [];

    const saved = saveDailyTrackerLog({
      accountId,
      dayIndex,
      eatenMeals,
      customEntries,
    });

    const logs = getDailyTrackerLogs(accountId);
    return NextResponse.json({
      ok: true,
      log: saved,
      logs,
    });
  } catch (err: any) {
    console.error('Erreur POST /api/tracker:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
