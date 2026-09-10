import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
  ALLOWED_ORIGIN: string;
  MODEL?: string;
}

const DEFAULT_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

// Keeps the shared demo's cost bounded: a per-visitor cap and a hard daily ceiling
// across everyone, since this key is funded by the site owner, not the visitor.
const PER_IP_HOURLY_LIMIT = 20;
const GLOBAL_DAILY_LIMIT = 300;

interface ChatRequestBody {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonError(origin: string, status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

/** Fixed-window counter in KV. Returns false once `limit` is reached within the window. */
async function checkAndIncrement(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: windowSeconds });
  return true;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/chat") {
      return jsonError(origin, 404, "not_found", "Unknown endpoint.");
    }
    if (request.method !== "POST") {
      return jsonError(origin, 405, "method_not_allowed", "Use POST.");
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const hourBucket = Math.floor(Date.now() / 3_600_000);
    const dayBucket = Math.floor(Date.now() / 86_400_000);

    const withinIpLimit = await checkAndIncrement(
      env.RATE_LIMIT_KV,
      `ip:${ip}:${hourBucket}`,
      PER_IP_HOURLY_LIMIT,
      3600,
    );
    if (!withinIpLimit) {
      return jsonError(
        origin,
        429,
        "rate_limited",
        "You've hit the shared demo's per-visitor limit for this hour. Try again later, or add your own API key in Settings for unlimited use.",
      );
    }

    const withinGlobalLimit = await checkAndIncrement(
      env.RATE_LIMIT_KV,
      `global:${dayBucket}`,
      GLOBAL_DAILY_LIMIT,
      86400,
    );
    if (!withinGlobalLimit) {
      return jsonError(
        origin,
        429,
        "rate_limited",
        "This demo has hit its daily usage cap. Try again tomorrow, or add your own API key in Settings.",
      );
    }

    let body: ChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return jsonError(origin, 400, "bad_request", "Invalid JSON body.");
    }
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return jsonError(origin, 400, "bad_request", "messages is required.");
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const stream = client.messages.stream({
      model: env.MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: body.system,
      messages: body.messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        stream.on("text", (text) => controller.enqueue(encoder.encode(text)));
        stream
          .finalMessage()
          .catch((err) => {
            let message = "The shared demo hit an error reaching Claude. Try again, or add your own API key in Settings.";
            if (err instanceof Anthropic.RateLimitError) {
              message = "The shared demo is rate-limited by Anthropic right now — try again shortly.";
            } else if (err instanceof Anthropic.AuthenticationError) {
              // The site owner's proxy key is misconfigured — not something a visitor can fix.
              message = "The shared demo is temporarily unavailable. Add your own API key in Settings to keep chatting.";
            }
            controller.enqueue(encoder.encode(`\n\n[error: ${message}]`));
          })
          .finally(() => controller.close());
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" },
    });
  },
} satisfies ExportedHandler<Env>;
