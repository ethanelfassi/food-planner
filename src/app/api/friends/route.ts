import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountBySessionToken,
  getActiveAccountId,
  getFriendsAndRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriendship,
  shareRecipeWithFriend,
  getCustomRecipeById,
} from '@/lib/db';
import { RECIPES } from '@/data/recipes';

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
    const social = getFriendsAndRequests(accountId);

    return NextResponse.json({
      ok: true,
      accountId,
      friends: social.friends,
      incomingRequests: social.incomingRequests,
      outgoingRequests: social.outgoingRequests,
    });
  } catch (err: any) {
    console.error('Erreur GET /api/friends:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = resolveCurrentAccountId(request, body.accountId);
    const { action } = body;

    if (action === 'send_request') {
      const { target } = body;
      const result = sendFriendRequest(accountId, target || '');
      const social = getFriendsAndRequests(accountId);
      return NextResponse.json({
        ok: true,
        message: result.message,
        autoAccepted: result.autoAccepted,
        friendship: result.friendship,
        ...social,
      });
    }

    if (action === 'respond_request') {
      const { friendshipId, accept } = body;
      respondToFriendRequest(friendshipId, accountId, Boolean(accept));
      const social = getFriendsAndRequests(accountId);
      return NextResponse.json({
        ok: true,
        message: accept ? "Demande d'ami acceptée !" : "Demande d'ami déclinée.",
        ...social,
      });
    }

    if (action === 'remove_friend') {
      const { friendId } = body;
      removeFriendship(accountId, friendId);
      const social = getFriendsAndRequests(accountId);
      return NextResponse.json({
        ok: true,
        message: 'Ami retiré de votre liste.',
        ...social,
      });
    }

    if (action === 'share_recipe') {
      const { recipeId, friendId, recipe: fullRecipePayload } = body;
      const baseRecipe =
        fullRecipePayload ||
        getCustomRecipeById(recipeId) ||
        RECIPES.find((r) => r.id === recipeId);

      if (!baseRecipe) {
        return NextResponse.json({ ok: false, error: 'Recette introuvable.' }, { status: 404 });
      }

      const sharedCopy = shareRecipeWithFriend(baseRecipe, accountId, friendId);
      return NextResponse.json({
        ok: true,
        message: `Recette « ${sharedCopy.title} » partagée avec succès !`,
        sharedRecipe: sharedCopy,
      });
    }

    return NextResponse.json({ ok: false, error: 'Action invalide.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erreur POST /api/friends:', err);
    return NextResponse.json({ ok: false, error: err.message || 'Erreur gestion amis' }, { status: 400 });
  }
}
