import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountBySessionToken,
  authenticateUser,
  registerUserAccount,
  deleteSession,
  createSession,
  getAccountById,
  getAllAccounts,
  getFriendsAndRequests,
  getSharedGroceryGroupsForAccount,
  changeAccountPassword,
  renameAccount,
  setActiveAccountId,
} from '@/lib/db';

const SESSION_COOKIE = 'fp_session';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = getAccountBySessionToken(token);
    const allAccounts = getAllAccounts();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        demoAccounts: allAccounts.slice(0, 6),
      });
    }

    const social = getFriendsAndRequests(user.id);
    const sharedGroceryGroups = getSharedGroceryGroupsForAccount(user.id);

    return NextResponse.json({
      authenticated: true,
      user,
      friends: social.friends,
      incomingRequests: social.incomingRequests,
      outgoingRequests: social.outgoingRequests,
      sharedGroceryGroups,
      demoAccounts: allAccounts.slice(0, 6),
    });
  } catch (err: any) {
    console.error('Erreur GET /api/auth:', err);
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'login') {
      const { identifier, password } = body;
      const { user, token } = authenticateUser(identifier || '', password || '');
      const social = getFriendsAndRequests(user.id);
      const sharedGroceryGroups = getSharedGroceryGroupsForAccount(user.id);

      const res = NextResponse.json({
        ok: true,
        authenticated: true,
        user,
        friends: social.friends,
        incomingRequests: social.incomingRequests,
        outgoingRequests: social.outgoingRequests,
        sharedGroceryGroups,
      });

      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    if (action === 'quick_login') {
      const { accountId } = body;
      const user = getAccountById(accountId);
      if (!user) {
        return NextResponse.json({ ok: false, error: 'Compte introuvable.' }, { status: 404 });
      }
      const token = createSession(user.id);
      setActiveAccountId(user.id);
      const social = getFriendsAndRequests(user.id);
      const sharedGroceryGroups = getSharedGroceryGroupsForAccount(user.id);

      const res = NextResponse.json({
        ok: true,
        authenticated: true,
        user,
        friends: social.friends,
        incomingRequests: social.incomingRequests,
        outgoingRequests: social.outgoingRequests,
        sharedGroceryGroups,
      });

      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    if (action === 'register') {
      const { username, name, email, password, settings, inviteCode } = body;
      const { user, token } = registerUserAccount({
        username: username || '',
        name: name || username || '',
        email,
        password: password || '',
        settings,
        inviteCode,
      });
      setActiveAccountId(user.id);
      const social = getFriendsAndRequests(user.id);
      const sharedGroceryGroups = getSharedGroceryGroupsForAccount(user.id);

      const res = NextResponse.json({
        ok: true,
        authenticated: true,
        user,
        friends: social.friends,
        incomingRequests: social.incomingRequests,
        outgoingRequests: social.outgoingRequests,
        sharedGroceryGroups,
      });

      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    if (action === 'logout') {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      deleteSession(token);
      const res = NextResponse.json({ ok: true, authenticated: false });
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    if (action === 'update_profile') {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      const currentUser = getAccountBySessionToken(token);
      const accountId = currentUser?.id || body.accountId;
      if (!accountId) {
        return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
      }
      if (body.name) {
        renameAccount(accountId, body.name);
      }
      if (body.newPassword) {
        changeAccountPassword(accountId, body.newPassword);
      }
      const updatedUser = getAccountById(accountId);
      return NextResponse.json({ ok: true, user: updatedUser });
    }

    return NextResponse.json({ ok: false, error: 'Action invalide.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erreur POST /api/auth:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Erreur authentification' }, { status: 400 });
  }
}
