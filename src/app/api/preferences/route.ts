import { NextResponse } from 'next/server';
import { 
  getAllAccounts, 
  getActiveAccountId, 
  setActiveAccountId, 
  createAccount, 
  renameAccount, 
  getAllAccountsPreferences, 
  setAccountPreference, 
  getAllAccountsSettings, 
  updateAccountSettings, 
  getAllCustomPrices, 
  setCustomPrice 
} from '@/lib/db';

export async function GET() {
  try {
    const accounts = getAllAccounts();
    const activeAccountId = getActiveAccountId();
    const allPreferences = getAllAccountsPreferences();
    const allSettings = getAllAccountsSettings();
    const customPrices = getAllCustomPrices();

    return NextResponse.json({
      accounts,
      activeAccountId,
      preferences: allPreferences,
      settings: allSettings,
      customPrices,
      // Champs rétrocompatibles
      legacyPreferences: allPreferences[activeAccountId] || allPreferences['ethan'] || {},
      legacySettings: allSettings[activeAccountId] || allSettings['ethan'] || {},
    });
  } catch (error) {
    console.error('Error fetching app data:', error);
    return NextResponse.json({ error: 'Failed to fetch app data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Changement de profil actif
    if (body.action === 'switch_account' && body.accountId) {
      setActiveAccountId(body.accountId);
      return NextResponse.json({
        success: true,
        accounts: getAllAccounts(),
        activeAccountId: body.accountId,
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
      });
    }

    // 2. Création d'un nouveau profil
    if (body.action === 'create_account' && body.name) {
      const newAcc = createAccount(body.id || body.name, body.name);
      return NextResponse.json({
        success: true,
        createdAccount: newAcc,
        accounts: getAllAccounts(),
        activeAccountId: getActiveAccountId(),
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
      });
    }

    // 3. Renommage d'un profil
    if (body.action === 'rename_account' && body.accountId && body.name) {
      renameAccount(body.accountId, body.name);
      return NextResponse.json({
        success: true,
        accounts: getAllAccounts(),
        activeAccountId: getActiveAccountId(),
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
      });
    }

    // 4. Mise à jour de préférence de produit (liked / disliked / neutral)
    if (body.ingredientId && body.status && ['liked', 'disliked', 'neutral'].includes(body.status)) {
      const targetAccount = body.accountId || getActiveAccountId() || 'ethan';
      setAccountPreference(targetAccount, body.ingredientId, body.status);
      return NextResponse.json({ 
        success: true, 
        accounts: getAllAccounts(),
        activeAccountId: getActiveAccountId(),
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
      });
    }

    // 5. Mise à jour de prix personnalisé pour un produit
    if (body.ingredientId && ('customPrice' in body || 'price' in body || body.action === 'set_custom_price')) {
      const rawPrice = 'customPrice' in body ? body.customPrice : body.price;
      const price = rawPrice !== null && rawPrice !== undefined ? Number(rawPrice) : null;
      setCustomPrice(body.ingredientId, price);
      return NextResponse.json({ 
        success: true, 
        accounts: getAllAccounts(),
        activeAccountId: getActiveAccountId(),
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
      });
    }

    // 6. Mise à jour des variables de personnalisation (calories, protéines, budget)
    if (body.settings && typeof body.settings === 'object') {
      const targetAccount = body.accountId || getActiveAccountId() || 'ethan';
      const updated = updateAccountSettings(targetAccount, body.settings);
      return NextResponse.json({ 
        success: true, 
        accounts: getAllAccounts(),
        activeAccountId: getActiveAccountId(),
        preferences: getAllAccountsPreferences(),
        settings: getAllAccountsSettings(),
        customPrices: getAllCustomPrices(),
        updatedSettings: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
