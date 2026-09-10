import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ClaudeModel, RetrievedChunk } from "../types";

const SYSTEM_PROMPT = `You are a helpful assistant answering questions about a document the user has uploaded.
Answer using only the provided context excerpts. If the answer isn't in the context, say you don't know based on the document — don't make things up.
Keep answers concise.`;

const PROXY_URL = (import.meta.env.VITE_PROXY_URL as string | undefined)?.trim();

function buildUserContent(question: string, context: RetrievedChunk[]): string {
  const contextBlock = context
    .map((r, i) => `[Excerpt ${i + 1}]\n${r.chunk.text}`)
    .join("\n\n");

  return `Context from the uploaded document:\n"""\n${contextBlock}\n"""\n\nQuestion: ${question}`;
}

export async function streamAnswer(params: {
  apiKey: string;
  model: ClaudeModel;
  history: ChatMessage[];
  question: string;
  context: RetrievedChunk[];
  onToken: (text: string) => void;
}): Promise<void> {
  const { apiKey, model, history, question, context, onToken } = params;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: buildUserContent(question, context) },
  ];

  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    await streamViaAnthropic({ apiKey: trimmedKey, model, messages, onToken });
  } else {
    await streamViaProxy({ messages, onToken });
  }
}

async function streamViaAnthropic(params: {
  apiKey: string;
  model: ClaudeModel;
  messages: Anthropic.MessageParam[];
  onToken: (text: string) => void;
}): Promise<void> {
  const { apiKey, model, messages, onToken } = params;
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const stream = client.messages.stream({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  stream.on("text", onToken);

  try {
    await stream.finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("That API key was rejected. Double-check you copied the whole key with no extra characters.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Rate limited by Anthropic's API — wait a moment and try again.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Claude API error: ${err.message}`);
    }
    throw err;
  }
}

async function streamViaProxy(params: {
  messages: Anthropic.MessageParam[];
  onToken: (text: string) => void;
}): Promise<void> {
  const { messages, onToken } = params;

  if (!PROXY_URL) {
    throw new Error(
      "No API key set, and this deployment has no shared demo configured. Add your own Anthropic API key in Settings.",
    );
  }

  const response = await fetch(`${PROXY_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: SYSTEM_PROMPT, messages }),
  });

  if (!response.ok || !response.body) {
    let message = `The shared demo failed (${response.status}).`;
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}
