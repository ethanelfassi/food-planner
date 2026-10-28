import { NextResponse } from 'next/server';
import { ALL_TOOLS } from '@/mcp/tools';

// GET /api/mcp : Lister tous les outils MCP disponibles et leur documentation
export async function GET() {
  const tools = Object.values(ALL_TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    requiresConfirmation: t.requiresConfirmation,
  }));

  return NextResponse.json({
    status: 'online',
    server: 'FoodPlanner MCP HTTP Bridge',
    version: '1.0.0',
    toolsCount: tools.length,
    tools,
  });
}

// POST /api/mcp : Exécuter un outil MCP directement via HTTP
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tool: toolName, args = {} } = body;

    if (!toolName || typeof toolName !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Nom d\'outil manquant ("tool") dans la requête.' },
        { status: 400 }
      );
    }

    const toolDef = (ALL_TOOLS as Record<string, any>)[toolName];
    if (!toolDef) {
      return NextResponse.json(
        { ok: false, error: `Outil MCP « ${toolName} » inconnu.` },
        { status: 404 }
      );
    }

    // Validation du schéma avec Zod
    const parsedArgs = toolDef.schema.safeParse(args);
    if (!parsedArgs.success) {
      return NextResponse.json(
        { ok: false, error: 'Arguments invalides', details: parsedArgs.error.format() },
        { status: 400 }
      );
    }

    const result = await toolDef.execute(parsedArgs.data);

    return NextResponse.json({
      ok: true,
      tool: toolName,
      result,
    });
  } catch (err: any) {
    console.error('Erreur exécution outil MCP HTTP:', err);
    return NextResponse.json(
      { ok: false, error: err.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
