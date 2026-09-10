import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ClaudeModel, RetrievedChunk } from "../types";

const SYSTEM_PROMPT = `You are a helpful assistant answering questions about a document the user has uploaded.
Answer using only the provided context excerpts. If the answer isn't in the context, say you don't know based on the document — don't make things up.
Keep answers concise.`;

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

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: "user", content: buildUserContent(question, context) },
  ];

  const stream = client.messages.stream({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  stream.on("text", onToken);

  await stream.finalMessage();
}
