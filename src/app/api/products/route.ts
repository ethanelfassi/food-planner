import { NextRequest, NextResponse } from 'next/server';
import { getCustomProducts, saveCustomProduct, deleteCustomProduct } from '@/lib/db';

export async function GET() {
  try {
    const products = getCustomProducts();
    return NextResponse.json({ ok: true, products });
  } catch (err: any) {
    console.error('Erreur GET /api/products:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.name) {
      return NextResponse.json({ ok: false, error: 'Nom du produit requis' }, { status: 400 });
    }

    const saved = saveCustomProduct(body);
    return NextResponse.json({ ok: true, product: saved });
  } catch (err: any) {
    console.error('Erreur POST /api/products:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ ok: false, error: 'ID requis' }, { status: 400 });
    }

    const success = deleteCustomProduct(id);
    return NextResponse.json({ ok: true, success });
  } catch (err: any) {
    console.error('Erreur DELETE /api/products:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
