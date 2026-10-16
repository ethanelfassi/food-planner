import { NextResponse } from 'next/server';
import { getAllPreferences, setProductPreference } from '@/lib/db';

export async function GET() {
  try {
    const preferences = getAllPreferences();
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ingredientId, status } = body;

    if (!ingredientId || !status || !['liked', 'disliked', 'neutral'].includes(status)) {
      return NextResponse.json({ error: 'Invalid ingredientId or status' }, { status: 400 });
    }

    setProductPreference(ingredientId, status);
    const updated = getAllPreferences();
    return NextResponse.json({ success: true, preferences: updated });
  } catch (error) {
    console.error('Error saving preference:', error);
    return NextResponse.json({ error: 'Failed to save preference' }, { status: 500 });
  }
}
