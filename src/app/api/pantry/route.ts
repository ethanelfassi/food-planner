import { NextRequest, NextResponse } from 'next/server';
import { getPantryMap, setPantryItem } from '@/lib/db';

export async function GET() {
  try {
    const pantry = getPantryMap();
    return NextResponse.json({ ok: true, pantry });
  } catch (err: any) {
    console.error('Erreur GET /api/pantry:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientId, inStock } = body;

    if (!ingredientId) {
      return NextResponse.json({ ok: false, error: 'ingredientId requis' }, { status: 400 });
    }

    const currentPantry = getPantryMap();
    const targetStatus = typeof inStock === 'boolean' ? inStock : !currentPantry[ingredientId];
    setPantryItem(ingredientId, targetStatus);

    const updatedPantry = getPantryMap();
    return NextResponse.json({
      ok: true,
      ingredientId,
      inStock: targetStatus,
      pantry: updatedPantry,
    });
  } catch (err: any) {
    console.error('Erreur POST /api/pantry:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
