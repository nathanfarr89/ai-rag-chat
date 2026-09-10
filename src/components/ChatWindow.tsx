import { useState } from "react";
import type { Chunk, ChatMessage, ClaudeModel } from "../types";

const TOP_K = 4;

interface Props {
  apiKey: string;
  model: ClaudeModel;
  chunks: Chunk[] | null;
  documentName: string | null;
}

export function ChatWindow({ apiKey, model, chunks, documentName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canChat = Boolean(apiKey) && Boolean(chunks?.length);

  async function handleSend() {
    const question = input.trim();
    if (!question || !chunks || pending) return;

    setError(null);
    setInput("");
    const history = messages;
    setMessages([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setPending(true);

    try {
      const { embedQuery, retrieveTopK } = await import("../lib/embeddings");
      const queryEmbedding = await embedQuery(question);
      const context = retrieveTopK(queryEmbedding, chunks, TOP_K);

      const { streamAnswer } = await import("../lib/claude");
      let answer = "";
      await streamAnswer({
        apiKey,
        model,
        history,
        question,
        context,
        onToken: (token) => {
          answer += token;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: answer };
            return next;
          });
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong calling Claude.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="chat-window">
      <h2>Chat{documentName ? ` — ${documentName}` : ""}</h2>

      {!canChat && (
        <p className="settings-hint">
          Add your API key and upload a document to start chatting.
        </p>
      )}

      <div className="message-list">
        {messages.map((m, i) => (
          <div key={i} className={`message message-${m.role}`}>
            <span className="message-role">{m.role === "user" ? "You" : "Claude"}</span>
            <p>{m.content || (pending && i === messages.length - 1 ? "…" : "")}</p>
          </div>
        ))}
      </div>

      {error && <p className="error-line">{error}</p>}

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          disabled={!canChat || pending}
          placeholder={canChat ? "Ask a question about the document…" : "Set up your key and document first"}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSend();
          }}
        />
        <button type="button" disabled={!canChat || pending || !input.trim()} onClick={() => void handleSend()}>
          Send
        </button>
      </div>
    </div>
  );
}
