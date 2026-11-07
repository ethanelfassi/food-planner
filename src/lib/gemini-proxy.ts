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

// Modèles officiels Gemini stables et disponibles
export function handleGetModels() {
  return NextResponse.json(
    {
      object: 'list',
      data: [
        { id: 'gemini-2.0-flash', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-1.5-flash', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-1.5-pro', object: 'model', created: 1700000000, owned_by: 'google' },
        { id: 'gemini-2.0-flash-exp', object: 'model', created: 1700000000, owned_by: 'google' },
      ],
    },
    { headers: CORS_HEADERS }
  );
}

/**
 * Nettoie et normalise les messages pour l'endpoint compatible OpenAI de Gemini.
 * Élimine le rôle legacy 'function' envoyé par ChatMCP iOS et garantit les identifiants tool_call_id.
 */
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

    // 2. Corriger le rôle 'function' ou 'tool' sans id envoyé par ChatMCP
    if (msg.role === 'function' || msg.role === 'tool') {
      msg.role = 'tool';
      if (!msg.tool_call_id) {
        msg.tool_call_id = pendingToolCallId;
      }
      // Gemini exige que 'content' soit une chaîne de texte
      if (typeof msg.content !== 'string') {
        msg.content = JSON.stringify(msg.content ?? '');
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

/**
 * Analyse robuste du corps JSON pour éviter les erreurs SyntaxError causées par
 * des backslashes ou caractères mal échappés envoyés par certains clients.
 */
async function parseSafeJson(request: NextRequest): Promise<any> {
  const rawText = await request.text();
  try {
    return JSON.parse(rawText);
  } catch (err: any) {
    console.warn('[GeminiProxy] JSON malformé détecté, nettoyage des échappements...');
    // Nettoyer les échappements non conformes en JSON (\ suivi de tout sauf " \ / b f n r t uXXXX)
    const cleaned = rawText.replace(/\\(?:([^"\\/bfnrtu])|u(?![\da-fA-F]{4}))/g, (match, ch) => {
      if (ch === "'") return "'";
      return ch || '';
    });
    return JSON.parse(cleaned);
  }
}

/**
 * Envoi avec retry automatique et fallback de modèle en cas de 503 / 500 / 429
 */
async function sendToGeminiWithRetry(
  payload: Record<string, any>,
  apiKey: string,
  maxAttempts = 3
): Promise<Response> {
  const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const modelsToTry = [payload.model];

  // Si le modèle demandé n'est pas gemini-1.5-flash, ajouter un fallback en cas de surcharge 503
  if (payload.model !== 'gemini-1.5-flash') {
    modelsToTry.push('gemini-1.5-flash');
  }

  let lastRes: Response | null = null;

  for (const currentModel of modelsToTry) {
    const currentPayload = { ...payload, model: currentModel };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(currentPayload),
        });

        // Succès (200-299) ou erreur client définitive (400, 401, 403, 404)
        if (res.ok || (res.status < 500 && res.status !== 429)) {
          return res;
        }

        lastRes = res;
        console.warn(
          `[GeminiProxy] Modèle ${currentModel} - tentative ${attempt}/${maxAttempts} a renvoyé HTTP ${res.status}`
        );

        if (attempt < maxAttempts) {
          const delay = Math.min(800 * Math.pow(2, attempt - 1) + Math.random() * 200, 3000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (networkErr: any) {
        console.warn(
          `[GeminiProxy] Erreur réseau tentative ${attempt}/${maxAttempts}:`,
          networkErr.message
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  return lastRes || new Response(JSON.stringify({ error: { message: 'Gemini injoignable' } }), { status: 503 });
}

export async function handleChatCompletions(request: NextRequest) {
  try {
    const body = await parseSafeJson(request);

    // Récupérer la clé API Gemini transmise par ChatMCP
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

    // Résolution du modèle : mapper les modèles non standards ou dépréciés vers gemini-2.0-flash
    let targetModel = body.model || 'gemini-2.0-flash';
    if (
      targetModel.includes('2.5-flash') ||
      targetModel.includes('3.5-flash') ||
      targetModel.includes('gpt-') ||
      targetModel === 'default'
    ) {
      targetModel = 'gemini-2.0-flash';
    }

    const payload: Record<string, any> = {
      model: targetModel,
      messages: sanitizedMessages,
      stream: Boolean(body.stream),
    };

    if (sanitizedTools && Array.isArray(sanitizedTools) && sanitizedTools.length > 0) {
      payload.tools = sanitizedTools;
    }
    if (body.temperature !== undefined) payload.temperature = body.temperature;
    if (body.top_p !== undefined) payload.top_p = body.top_p;
    if (body.max_tokens !== undefined) payload.max_tokens = body.max_tokens;

    // Envoi avec retries automatiques et bascule transparente si 503
    const upstreamRes = await sendToGeminiWithRetry(payload, customKey);

    const isStream = Boolean(body.stream) && upstreamRes.ok;
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
    console.error('[GeminiProxy] Erreur proxy Gemini ChatMCP:', err);
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
