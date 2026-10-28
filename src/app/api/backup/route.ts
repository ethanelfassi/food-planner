import { NextRequest, NextResponse } from 'next/server';
import { exportDatabaseBackup, importDatabaseBackup } from '@/lib/db';

export async function GET() {
  try {
    const backup = exportDatabaseBackup();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `food_planner_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Erreur GET /api/backup:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ ok: false, error: 'Données de sauvegarde invalides' }, { status: 400 });
    }

    const result = importDatabaseBackup(data);
    return NextResponse.json({
      ok: true,
      message: 'Sauvegarde restaurée avec succès dans SQLite',
      stats: result.counts,
    });
  } catch (err: any) {
    console.error('Erreur POST /api/backup:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
