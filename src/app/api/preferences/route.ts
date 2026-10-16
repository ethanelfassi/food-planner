import { NextResponse } from 'next/server';
import { 
  getAllPreferences, 
  setProductPreference, 
  getAllCustomPrices, 
  setCustomPrice, 
  getAppSettings, 
  updateAppSettings 
} from '@/lib/db';

export async function GET() {
  try {
    const preferences = getAllPreferences();
    const customPrices = getAllCustomPrices();
    const settings = getAppSettings();
    return NextResponse.json({ preferences, customPrices, settings });
  } catch (error) {
    console.error('Error fetching app data:', error);
    return NextResponse.json({ error: 'Failed to fetch app data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Mise à jour de préférence de produit (liked / disliked / neutral)
    if (body.ingredientId && body.status && ['liked', 'disliked', 'neutral'].includes(body.status)) {
      setProductPreference(body.ingredientId, body.status);
      return NextResponse.json({ 
        success: true, 
        preferences: getAllPreferences(),
        customPrices: getAllCustomPrices(),
        settings: getAppSettings()
      });
    }

    // 2. Mise à jour de prix personnalisé pour un produit
    if (body.ingredientId && ('customPrice' in body || 'price' in body || body.action === 'set_custom_price')) {
      const rawPrice = 'customPrice' in body ? body.customPrice : body.price;
      const price = rawPrice !== null && rawPrice !== undefined ? Number(rawPrice) : null;
      setCustomPrice(body.ingredientId, price);
      return NextResponse.json({ 
        success: true, 
        preferences: getAllPreferences(),
        customPrices: getAllCustomPrices(),
        settings: getAppSettings()
      });
    }

    // 3. Mise à jour des variables de personnalisation (calories, protéines, budget)
    if (body.settings && typeof body.settings === 'object') {
      const updatedSettings = updateAppSettings(body.settings);
      return NextResponse.json({ 
        success: true, 
        preferences: getAllPreferences(),
        customPrices: getAllCustomPrices(),
        settings: updatedSettings
      });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (error) {
    console.error('Error saving data:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
