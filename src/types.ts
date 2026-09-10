export interface Chunk {
  id: number;
  text: string;
  embedding: number[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type ClaudeModel =
  | "claude-opus-5"
  | "claude-sonnet-5"
  | "claude-haiku-4-5";

export interface RetrievedChunk {
  chunk: Chunk;
  score: number;
}
