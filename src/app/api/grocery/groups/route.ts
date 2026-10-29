import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountBySessionToken,
  getActiveAccountId,
  getSharedGroceryGroupsForAccount,
  createSharedGroceryGroup,
  toggleSharedGroupCheckedItem,
  deleteSharedGroceryGroup,
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
    const groups = getSharedGroceryGroupsForAccount(accountId);

    return NextResponse.json({
      ok: true,
      accountId,
      groups,
    });
  } catch (err: any) {
    console.error('Erreur GET /api/grocery/groups:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = resolveCurrentAccountId(request, body.accountId);
    const { action } = body;

    if (action === 'create_group') {
      const { name, friendIds } = body;
      const group = createSharedGroceryGroup(
        accountId,
        name || '',
        Array.isArray(friendIds) ? friendIds : []
      );
      const groups = getSharedGroceryGroupsForAccount(accountId);
      return NextResponse.json({
        ok: true,
        group,
        groups,
      });
    }

    if (action === 'toggle_item') {
      const { groupId, itemId, checked } = body;
      const updatedGroup = toggleSharedGroupCheckedItem(groupId, accountId, itemId, checked);
      const groups = getSharedGroceryGroupsForAccount(accountId);
      return NextResponse.json({
        ok: true,
        group: updatedGroup,
        groups,
      });
    }

    if (action === 'delete_group') {
      const { groupId } = body;
      deleteSharedGroceryGroup(groupId, accountId);
      const groups = getSharedGroceryGroupsForAccount(accountId);
      return NextResponse.json({
        ok: true,
        groups,
      });
    }

    return NextResponse.json({ ok: false, error: 'Action invalide.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erreur POST /api/grocery/groups:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Erreur course jointe' }, { status: 400 });
  }
}
