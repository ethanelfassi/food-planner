import { NextRequest, NextResponse } from 'next/server';
import { getPantryMap, setPantryItem, getAccountBySessionToken, getActiveAccountId } from '@/lib/db';

const SESSION_COOKIE = 'fp_session';

function resolveAccountId(request: NextRequest, bodyAccountId?: string): string {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = getAccountBySessionToken(token);
  if (user) return user.id;
  if (bodyAccountId) return bodyAccountId;
  const url = new URL(request.url);
  return url.searchParams.get('accountId') || getActiveAccountId() || 'ethan';
}

export async function GET(request: NextRequest) {
  try {
    const accountId = resolveAccountId(request);
    const pantry = getPantryMap(accountId);
    return NextResponse.json({ ok: true, accountId, pantry });
  } catch (err: any) {
    console.error('Erreur GET /api/pantry:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientId, inStock, accountId: bodyAccountId } = body;

    if (!ingredientId) {
      return NextResponse.json({ ok: false, error: 'ingredientId requis' }, { status: 400 });
    }

    const accountId = resolveAccountId(request, bodyAccountId);
    const currentPantry = getPantryMap(accountId);
    const targetStatus = typeof inStock === 'boolean' ? inStock : !currentPantry[ingredientId];
    setPantryItem(ingredientId, targetStatus, accountId);

    const updatedPantry = getPantryMap(accountId);
    return NextResponse.json({
      ok: true,
      accountId,
      ingredientId,
      inStock: targetStatus,
      pantry: updatedPantry,
    });
  } catch (err: any) {
    console.error('Erreur POST /api/pantry:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
