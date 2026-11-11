import { NextRequest, NextResponse } from 'next/server';

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

interface OpenAIModelItem {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

// Modèles Google Gemini de référence (ordre prioritaire pour le sélecteur Custom / fallback sans clé)
const CURATED_GEMINI_MODELS: string[] = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-pro',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-4-argon',
  'gemini-4-carbon',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

const NON_CHAT_MODEL_PATTERN =
  /embedding|embed|aqa|gecko|bison|^imagen|^veo|^lyria|-tts\b|native-audio/i;

// Cache borné en mémoire pour préserver les thought_signature réelles entre les tours d'outils
const MAX_SIGNATURE_CACHE = 500;
const thoughtSignatureCache = new Map<string, string>();

function cacheThoughtSignature(toolCallId: string, signature: string) {
  if (!toolCallId || !signature) return;
  if (thoughtSignatureCache.size >= MAX_SIGNATURE_CACHE) {
    const oldestKey = thoughtSignatureCache.keys().next().value;
    if (oldestKey) thoughtSignatureCache.delete(oldestKey);
  }
  thoughtSignatureCache.set(toolCallId, signature);
}

function extractApiKey(request?: NextRequest): string {
  if (!request) return '';
  const authHeader = request.headers.get('authorization') || '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim();
  const queryKey = request.nextUrl?.searchParams?.get('key')?.trim() || '';
  return (
    request.headers.get('x-goog-api-key')?.trim() ||
    request.headers.get('api-key')?.trim() ||
    bearer ||
    queryKey
  );
}

function normalizeModelId(id: string): string {
  return String(id || '')
    .trim()
    .replace(/^models\//i, '');
}

function sortModelsByPriority(models: OpenAIModelItem[]): OpenAIModelItem[] {
  const priorityMap = new Map(CURATED_GEMINI_MODELS.map((id, index) => [id, index]));
  return [...models].sort((a, b) => {
    const pA = priorityMap.get(a.id);
    const pB = priorityMap.get(b.id);
    if (pA !== undefined && pB !== undefined) return pA - pB;
    if (pA !== undefined) return -1;
    if (pB !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
}

function buildCuratedModelsResponse(): OpenAIModelItem[] {
  return CURATED_GEMINI_MODELS.map((id) => ({
    id,
    object: 'model',
    created: 1700000000,
    owned_by: 'google',
  }));
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Liste dynamiquement tous les modèles Google Gemini disponibles via l'API Google
 * lorsque une clé API est transmise, avec fallback complet sur la liste à jour.
 */
export async function handleGetModels(request?: NextRequest) {
  const customKey = extractApiKey(request);

  if (customKey && customKey !== 'none' && customKey !== 'placeholder') {
    try {
      const upstreamRes = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/models',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${customKey}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      if (upstreamRes.ok) {
        const json = await upstreamRes.json();
        const rawList: any[] = Array.isArray(json?.data) ? json.data : [];

        const seen = new Set<string>();
        const liveModels: OpenAIModelItem[] = [];

        for (const item of rawList) {
          const cleanId = normalizeModelId(item?.id);
          if (!cleanId || NON_CHAT_MODEL_PATTERN.test(cleanId) || seen.has(cleanId)) {
            continue;
          }
          seen.add(cleanId);
          liveModels.push({
            id: cleanId,
            object: 'model',
            created: typeof item?.created === 'number' ? item.created : 1700000000,
            owned_by: item?.owned_by || 'google',
          });
        }

        if (liveModels.length > 0) {
          return NextResponse.json(
            {
              object: 'list',
              data: sortModelsByPriority(liveModels),
            },
            { headers: CORS_HEADERS }
          );
        }
      }
    } catch (err: any) {
      console.warn('[GeminiProxy] Récupération live /models échouée, fallback catalogue:', err.message);
    }
  }

  return NextResponse.json(
    {
      object: 'list',
      data: buildCuratedModelsResponse(),
    },
    { headers: CORS_HEADERS }
  );
}

function modelSupportsThoughtSignature(modelId: string): boolean {
  return /(gemini-2\.5|gemini-3|gemini-4|thinking)/i.test(modelId);
}

/**
 * Nettoie et normalise les messages pour l'endpoint compatible OpenAI de Gemini.
 * - Convertit function_call / role:'function' legacy de ChatMCP en tool_calls / role:'tool'
 * - Restaure ou injecte extra_content.google.thought_signature pour Gemini 2.5 / 3 / 4
 */
export function sanitizeMessagesForGemini(
  messages: any[],
  targetModel = 'gemini-3.8-flash',
  options: { stripExtraContent?: boolean; forceSkipSignature?: boolean } = {}
): any[] {
  if (!Array.isArray(messages)) return [];

  const sanitized: any[] = [];
  let pendingToolCallIds: string[] = [];
  const attachThoughtSig =
    !options.stripExtraContent &&
    (options.forceSkipSignature || modelSupportsThoughtSignature(targetModel));

  for (let i = 0; i < messages.length; i++) {
    const raw = messages[i];
    if (!raw || typeof raw !== 'object') continue;

    const msg = { ...raw };

    // 1. Normaliser function_call legacy et tool_calls sur les messages assistant
    if (msg.role === 'assistant') {
      if (msg.function_call && (!Array.isArray(msg.tool_calls) || msg.tool_calls.length === 0)) {
        const callId = `call_${msg.function_call.name || 'tool'}_${Date.now()}_${i}`;
        msg.tool_calls = [
          {
            id: callId,
            type: 'function',
            function: {
              name: msg.function_call.name,
              arguments:
                typeof msg.function_call.arguments === 'string'
                  ? msg.function_call.arguments || '{}'
                  : JSON.stringify(msg.function_call.arguments || {}),
            },
          },
        ];
        delete msg.function_call;
      }

      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length === 0) {
        delete msg.tool_calls;
      }

      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        msg.tool_calls = msg.tool_calls.map((tc: any, idx: number) => {
          const callId = tc?.id || `call_${tc?.function?.name || 'tool'}_${Date.now()}_${i}_${idx}`;
          const normalizedTc: any = {
            ...tc,
            id: callId,
            type: tc?.type || 'function',
            function: {
              ...(tc?.function || {}),
              arguments:
                typeof tc?.function?.arguments === 'string'
                  ? tc.function.arguments || '{}'
                  : JSON.stringify(tc?.function?.arguments || {}),
            },
          };

          if (options.stripExtraContent) {
            delete normalizedTc.extra_content;
          } else if (attachThoughtSig) {
            const existingSig = normalizedTc.extra_content?.google?.thought_signature;
            const cachedSig = thoughtSignatureCache.get(callId);
            const chosenSig =
              existingSig || cachedSig || (idx === 0 ? 'skip_thought_signature_validator' : undefined);

            if (chosenSig) {
              normalizedTc.extra_content = {
                ...(normalizedTc.extra_content || {}),
                google: {
                  ...(normalizedTc.extra_content?.google || {}),
                  thought_signature: chosenSig,
                },
              };
            }
          }

          return normalizedTc;
        });

        pendingToolCallIds = msg.tool_calls.map((tc: any) => tc.id);
      }
    }

    // 2. Corriger le rôle 'function' ou 'tool' sans id envoyé par ChatMCP
    if (msg.role === 'function' || msg.role === 'tool') {
      msg.role = 'tool';
      if (!msg.tool_call_id) {
        msg.tool_call_id = pendingToolCallIds.shift() || `call_fallback_${i}`;
      }
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
    const cleaned = rawText.replace(/\\(?:([^"\\/bfnrtu])|u(?![\da-fA-F]{4}))/g, (_, ch) => {
      if (ch === "'") return "'";
      return ch || '';
    });
    return JSON.parse(cleaned);
  }
}

function resolveRequestedModel(rawModel: unknown): string {
  const clean = normalizeModelId(typeof rawModel === 'string' ? rawModel : '');
  if (!clean || clean === 'default' || clean.startsWith('gpt-')) {
    return 'gemini-3.8-flash';
  }
  return clean;
}

function buildFallbackModels(requestedModel: string): string[] {
  const candidates = /pro/i.test(requestedModel)
    ? ['gemini-3.1-pro', 'gemini-2.5-pro', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash']
    : ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'];

  return [requestedModel, ...candidates.filter((m) => m !== requestedModel)];
}

/**
 * Capture passivement les thought_signature dans un clone du flux réponse
 * sans retarder ni altérer la réponse envoyée à ChatMCP.
 */
function captureThoughtSignaturesAsync(res: Response, isStream: boolean) {
  if (!res.ok || !res.body) return;
  try {
    const clone = res.clone();
    (async () => {
      const text = await clone.text();
      if (!text || text.length > 512_000) return;

      const extractFromToolCalls = (toolCalls: any[]) => {
        if (!Array.isArray(toolCalls)) return;
        for (const tc of toolCalls) {
          const sig = tc?.extra_content?.google?.thought_signature;
          if (tc?.id && sig) {
            cacheThoughtSignature(tc.id, sig);
          }
        }
      };

      if (!isStream) {
        const data = JSON.parse(text);
        const toolCalls = data?.choices?.[0]?.message?.tool_calls;
        extractFromToolCalls(toolCalls);
        return;
      }

      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:') || trimmed === 'data: [DONE]') continue;
        try {
          const chunk = JSON.parse(trimmed.slice(5).trim());
          const deltaCalls = chunk?.choices?.[0]?.delta?.tool_calls;
          extractFromToolCalls(deltaCalls);
        } catch {
          // Ignorer les chunks partiels non JSON
        }
      }
    })().catch(() => {});
  } catch {
    // Ignorer si le stream ne peut être cloné
  }
}

/**
 * Envoi avec retry sur 503/500/429, récupération thought_signature sur 400, et fallback sur 404/surcharge.
 */
async function sendToGeminiWithRetry(
  rawMessages: any[],
  basePayload: Record<string, any>,
  requestedModel: string,
  apiKey: string,
  maxAttemptsPerModel = 3
): Promise<Response> {
  const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  const modelsToTry = buildFallbackModels(requestedModel);

  let lastRes: Response | null = null;
  let stripExtraContent = false;
  let forceSkipSignature = false;

  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const sanitizedMessages = sanitizeMessagesForGemini(rawMessages, currentModel, {
        stripExtraContent,
        forceSkipSignature,
      });

      const currentPayload = {
        ...basePayload,
        model: currentModel,
        messages: sanitizedMessages,
      };

      try {
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(currentPayload),
        });

        if (res.ok) {
          return res;
        }

        // Gérer les erreurs 400 liées à thought_signature ou extra_content
        if (res.status === 400 && attempt < maxAttemptsPerModel) {
          const errClone = await res.clone().text().catch(() => '');
          if (/thought_signature/i.test(errClone) && !forceSkipSignature) {
            forceSkipSignature = true;
            stripExtraContent = false;
            continue;
          }
          if (/extra_content/i.test(errClone) && !stripExtraContent) {
            stripExtraContent = true;
            forceSkipSignature = false;
            continue;
          }
        }

        // Erreurs client définitives (400 autre, 401, 403) : renvoyer immédiatement
        if (res.status < 500 && res.status !== 429 && res.status !== 404) {
          return res;
        }

        lastRes = res;
        console.warn(
          `[GeminiProxy] Modèle ${currentModel} - tentative ${attempt}/${maxAttemptsPerModel} -> HTTP ${res.status}`
        );

        // Si 404 (modèle retiré/inexistant sur l'API), passer immédiatement au fallback suivant
        if (res.status === 404) {
          break;
        }

        if (attempt < maxAttemptsPerModel) {
          const delay = Math.min(700 * Math.pow(2, attempt - 1) + Math.random() * 200, 3000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (networkErr: any) {
        console.warn(
          `[GeminiProxy] Erreur réseau (${currentModel}) tentative ${attempt}/${maxAttemptsPerModel}:`,
          networkErr.message
        );
        if (attempt < maxAttemptsPerModel) {
          await new Promise((resolve) => setTimeout(resolve, 900));
        }
      }
    }
  }

  return (
    lastRes ||
    new Response(JSON.stringify({ error: { message: 'Gemini injoignable' } }), { status: 503 })
  );
}

export async function handleChatCompletions(request: NextRequest) {
  try {
    const body = await parseSafeJson(request);
    const customKey = extractApiKey(request);

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

    // Nettoyer les outils si 'functions' legacy est utilisé
    let sanitizedTools = body.tools;
    if (!sanitizedTools && Array.isArray(body.functions)) {
      sanitizedTools = body.functions.map((fn: any) => ({
        type: 'function',
        function: fn,
      }));
    }

    const targetModel = resolveRequestedModel(body.model);

    const basePayload: Record<string, any> = {
      stream: Boolean(body.stream),
    };

    if (sanitizedTools && Array.isArray(sanitizedTools) && sanitizedTools.length > 0) {
      basePayload.tools = sanitizedTools;
    }
    if (body.tool_choice !== undefined) basePayload.tool_choice = body.tool_choice;
    if (body.temperature !== undefined) basePayload.temperature = body.temperature;
    if (body.top_p !== undefined) basePayload.top_p = body.top_p;
    if (body.max_tokens !== undefined) basePayload.max_tokens = body.max_tokens;
    if (body.reasoning_effort !== undefined) basePayload.reasoning_effort = body.reasoning_effort;

    const upstreamRes = await sendToGeminiWithRetry(
      body.messages,
      basePayload,
      targetModel,
      customKey
    );

    const isStream = Boolean(body.stream) && upstreamRes.ok;
    captureThoughtSignaturesAsync(upstreamRes, isStream);

    const contentType = isStream ? 'text/event-stream' : 'application/json';

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        'Content-Type': contentType,
        ...(isStream ? { 'Cache-Control': 'no-cache', Connection: 'keep-alive' } : {}),
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
