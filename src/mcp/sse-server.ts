import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
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

const app = createMcpExpressApp({ host: '0.0.0.0' });

// Middleware CORS pour autoriser ChatMCP (iOS) et requêtes distantes
app.use((req: any, res: any, next: any) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

const MAX_SESSIONS = 1000;
const sessions = new Map<string, { transport: StreamableHTTPServerTransport | SSEServerTransport; open: number; lastActive: number }>();

const trackResponse = (session: { open: number; lastActive: number }, res: any) => {
  if (!res.socket || res.destroyed) return;
  session.open++;
  res.on('close', () => {
    session.open--;
    session.lastActive = Date.now();
  });
};

// Nettoyage périodique des sessions inactives (> 30 min)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, s] of sessions.entries()) {
    if (s.open === 0 && s.lastActive < cutoff) {
      s.transport.close().catch(console.error);
      sessions.delete(id);
    }
  }
}, 60000).unref();

// =============================================================================
// STREAMABLE HTTP TRANSPORT (Requis par ChatMCP et spec MCP 2025)
// =============================================================================
const handleStreamableHttp = async (req: any, res: any) => {
  try {
    const sessionId = (req.headers['mcp-session-id'] as string) || (req.query?.sessionId as string);
    const session = sessionId ? sessions.get(sessionId) : undefined;
    let transport: StreamableHTTPServerTransport;

    if (session) {
      if (session.transport instanceof StreamableHTTPServerTransport) {
        transport = session.transport;
        trackResponse(session, res);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Mauvais type de transport' },
          id: null,
        });
        return;
      }
    } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
      if (sessions.size >= MAX_SESSIONS) {
        res.status(503).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Trop de sessions ouvertes' }, id: null });
        return;
      }

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          console.log(`📡 [StreamableHTTP] Session initialisée : ${newSessionId}`);
          sessions.set(newSessionId, { transport, open: 0, lastActive: Date.now() });
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && sessions.has(sid)) {
          console.log(`🔌 [StreamableHTTP] Session fermée : ${sid}`);
          sessions.delete(sid);
        }
      };

      const server = createMcpServer();
      await server.connect(transport);
    } else if (sessionId) {
      res.status(404).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Session introuvable' }, id: null });
      return;
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Requête invalide : session ID manquant ou non-initialize' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.error('❌ [StreamableHTTP] Erreur :', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: error.message || 'Erreur interne' },
        id: null,
      });
    }
  }
};

// Route supportée par ChatMCP : /mcp et /
app.all('/mcp', handleStreamableHttp);
app.post('/', handleStreamableHttp);

// =============================================================================
// RETRO-COMPATIBILITÉ SSE CLASSIQUE (/sse et /messages)
// =============================================================================
app.get('/sse', async (req: any, res: any) => {
  try {
    const transport = new SSEServerTransport('/messages', res);
    const session = { transport, open: 0, lastActive: Date.now() };
    sessions.set(transport.sessionId, session);
    trackResponse(session, res);

    transport.onclose = () => {
      sessions.delete(transport.sessionId);
    };

    const server = createMcpServer();
    await server.connect(transport);
  } catch (err: any) {
    console.error('❌ [SSE] Erreur :', err);
    if (!res.headersSent) res.status(500).send('Erreur SSE');
  }
});

app.post('/messages', async (req: any, res: any) => {
  const sessionId = req.query.sessionId as string;
  const existingTransport = sessions.get(sessionId)?.transport;
  if (existingTransport instanceof SSEServerTransport) {
    await existingTransport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send('Session introuvable');
  }
});

// Health check simple
app.get('/health', (req: any, res: any) => {
  res.json({
    status: 'ok',
    server: 'FoodPlanner MCP Server (Streamable HTTP + SSE)',
    port: PORT,
    endpoints: ['/mcp', '/', '/sse'],
    toolsCount: Object.keys(ALL_TOOLS).length,
  });
});

const PORT = parseInt(process.env.MCP_PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FoodPlanner MCP Server (Streamable HTTP & SSE) prêt sur port ${PORT}`);
  console.log(`📲 URL Streamable HTTP pour ChatMCP : http://0.0.0.0:${PORT}/mcp`);
});
