import http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ALL_TOOLS } from './tools.js';

function createMcpServer() {
  const server = new McpServer({
    name: 'food-planner',
    version: '1.0.0',
  });

  for (const toolDef of Object.values(ALL_TOOLS)) {
    server.tool(
      toolDef.name,
      toolDef.description,
      toolDef.schema.shape,
      async (args: any) => {
        try {
          const result = await toolDef.execute(args);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: `Erreur : ${err.message || String(err)}` }],
          };
        }
      }
    );
  }
  return server;
}

const transports = new Map<string, SSEServerTransport>();

const PORT = parseInt(process.env.MCP_PORT || '3001', 10);

const httpServer = http.createServer(async (req, res) => {
  // CORS headers requis pour les clients web et mobiles
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // 1. Endpoint SSE : Connexion initiale
  if (req.method === 'GET' && url.pathname === '/sse') {
    console.log('📡 [MCP SSE] Nouvelle connexion reçue');
    const transport = new SSEServerTransport('/messages', res);
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      console.log(`🔌 [MCP SSE] Déconnexion de la session : ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    };

    const mcpServer = createMcpServer();
    await mcpServer.connect(transport);
    await transport.start();
    console.log(`✅ [MCP SSE] Session initialisée : ${transport.sessionId}`);
    return;
  }

  // 2. Endpoint Messages : Envoi des requêtes JSON-RPC
  if (req.method === 'POST' && url.pathname === '/messages') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId || !transports.has(sessionId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session introuvable ou sessionId manquant' }));
      return;
    }

    const transport = transports.get(sessionId)!;
    await transport.handlePostMessage(req, res);
    return;
  }

  // 3. Health check
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'FoodPlanner MCP SSE Server',
      port: PORT,
      sseEndpoint: '/sse',
      toolsCount: Object.keys(ALL_TOOLS).length,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FoodPlanner MCP SSE Server en écoute sur http://0.0.0.0:${PORT}`);
  console.log(`📡 URL SSE pour ChatMCP : http://0.0.0.0:${PORT}/sse`);
});
