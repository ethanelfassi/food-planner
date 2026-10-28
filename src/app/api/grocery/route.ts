import { NextRequest, NextResponse } from 'next/server';
import { 
  getCustomGroceryItems, 
  saveCustomGroceryItem, 
  deleteCustomGroceryItem, 
  toggleCustomGroceryItemChecked, 
  clearCheckedCustomGroceryItems 
} from '@/lib/db';

export async function GET() {
  try {
    const items = getCustomGroceryItems();
    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error('Erreur GET /api/grocery:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'save') {
      const item = saveCustomGroceryItem(body.item);
      const items = getCustomGroceryItems();
      return NextResponse.json({ ok: true, item, items });
    }

    if (action === 'delete') {
      const id = body.id;
      deleteCustomGroceryItem(id);
      const items = getCustomGroceryItems();
      return NextResponse.json({ ok: true, items });
    }

    if (action === 'toggle_check') {
      const { id, checked } = body;
      toggleCustomGroceryItemChecked(id, checked);
      const items = getCustomGroceryItems();
      return NextResponse.json({ ok: true, items });
    }

    if (action === 'clear_checked') {
      clearCheckedCustomGroceryItems();
      const items = getCustomGroceryItems();
      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json({ ok: false, error: 'Action non reconnue' }, { status: 400 });
  } catch (err: any) {
    console.error('Erreur POST /api/grocery:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
