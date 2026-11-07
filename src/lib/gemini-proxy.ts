import { NextRequest, NextResponse } from 'next/server';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export function handleGetModels() {
  return NextResponse.json(
    {
      object: 'list',
      data: [
        { id: 'gemini-2.5-flash', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-2.0-flash', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-1.5-flash', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-1.5-pro', object: 'model', created: 1700000000, owned_by: 'google' },
      ],
    },
    { headers: CORS_HEADERS }
  );
}

export function sanitizeMessagesForGemini(messages: any[]): any[] {
  if (!Array.isArray(messages)) return [];

  const sanitized: any[] = [];
  let pendingToolCallId = `call_${Date.now()}`;

  for (let i = 0; i < messages.length; i++) {
    const raw = messages[i];
    if (!raw || typeof raw !== 'object') continue;

    const msg = { ...raw };

    // 1. Convertir function_call legacy en tool_calls moderne
    if (msg.role === 'assistant') {
      if (msg.function_call && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        pendingToolCallId = `call_${msg.function_call.name || 'tool'}_${Date.now()}_${i}`;
        msg.tool_calls = [
          {
            id: pendingToolCallId,
            type: 'function',
            function: {
              name: msg.function_call.name,
              arguments:
                typeof msg.function_call.arguments === 'string'
                  ? msg.function_call.arguments
                  : JSON.stringify(msg.function_call.arguments || {}),
            },
          },
        ];
        delete msg.function_call;
      } else if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        pendingToolCallId = msg.tool_calls[0]?.id || pendingToolCallId;
      }
    }

    // 2. Corriger le rôle 'function' envoyé par ChatMCP (cause du bug)
    if (msg.role === 'function') {
      msg.role = 'tool';
      if (!msg.tool_call_id) {
        msg.tool_call_id = pendingToolCallId;
      }
    }

    // 3. Valider que le rôle est standard
    if (!['system', 'user', 'assistant', 'tool'].includes(msg.role)) {
      msg.role = 'user';
    }

    sanitized.push(msg);
  }

  return sanitized;
}

export async function handleChatCompletions(request: NextRequest) {
  try {
    const body = await request.json();

    // Récupérer la clé API Gemini
    const authHeader = request.headers.get('authorization') || '';
    const customKey =
      request.headers.get('x-goog-api-key') ||
      request.headers.get('api-key') ||
      authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!customKey) {
      return NextResponse.json(
        {
          error: {
            message: 'Clé API Gemini manquante. Veuillez renseigner votre clé API dans ChatMCP.',
            type: 'invalid_request_error',
            code: 401,
          },
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Nettoyer les messages pour éliminer le rôle 'function' incompatible
    const sanitizedMessages = sanitizeMessagesForGemini(body.messages);

    // Nettoyer les outils si 'functions' legacy est utilisé
    let sanitizedTools = body.tools;
    if (!sanitizedTools && Array.isArray(body.functions)) {
      sanitizedTools = body.functions.map((fn: any) => ({
        type: 'function',
        function: fn,
      }));
    }

    const payload: Record<string, any> = {
      model: body.model || 'gemini-2.5-flash',
      messages: sanitizedMessages,
      stream: Boolean(body.stream),
    };

    if (sanitizedTools && Array.isArray(sanitizedTools) && sanitizedTools.length > 0) {
      payload.tools = sanitizedTools;
    }
    if (body.temperature !== undefined) payload.temperature = body.temperature;
    if (body.top_p !== undefined) payload.top_p = body.top_p;
    if (body.max_tokens !== undefined) payload.max_tokens = body.max_tokens;

    // Transmettre à l'endpoint compatible OpenAI de Google Gemini
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const upstreamRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customKey}`,
      },
      body: JSON.stringify(payload),
    });

    const isStream = Boolean(body.stream);
    const contentType = isStream ? 'text/event-stream' : 'application/json';

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': contentType,
        ...(isStream ? { 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } : {}),
        ...CORS_HEADERS,
      },
    });
  } catch (err: any) {
    console.error('Erreur proxy Gemini ChatMCP:', err);
    return NextResponse.json(
      {
        error: {
          message: err.message || 'Erreur interne du proxy Gemini',
          type: 'internal_error',
          code: 500,
        },
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
