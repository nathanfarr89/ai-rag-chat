import { useState } from "react";
import "./App.css";
import { SettingsPanel } from "./components/SettingsPanel";
import { FileUpload } from "./components/FileUpload";
import { ChatWindow } from "./components/ChatWindow";
import { getStoredApiKey, getStoredModel, setStoredApiKey, setStoredModel } from "./lib/storage";
import type { Chunk, ClaudeModel } from "./types";

function App() {
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [model, setModel] = useState<ClaudeModel>(getStoredModel);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  function handleApiKeyChange(key: string) {
    const trimmed = key.trim();
    setApiKey(trimmed);
    setStoredApiKey(trimmed);
  }

  function handleModelChange(m: ClaudeModel) {
    setModel(m);
    setStoredModel(m);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>RAG Chat</h1>
        <p>A retrieval-augmented chatbot that runs entirely in your browser.</p>
      </header>

      <main className="app-layout">
        <aside className="app-sidebar">
          <SettingsPanel
            apiKey={apiKey}
            model={model}
            onApiKeyChange={handleApiKeyChange}
            onModelChange={handleModelChange}
          />
          <FileUpload
            onDocumentReady={(name, c) => {
              setDocumentName(name);
              setChunks(c);
            }}
          />
        </aside>

        <section className="app-main">
          <ChatWindow apiKey={apiKey} model={model} chunks={chunks} documentName={documentName} />
        </section>
      </main>

      <footer className="app-footer">
        <span>Runs client-side only — no backend, no data leaves your browser except your questions and the retrieved excerpts, sent directly to Anthropic's API.</span>
      </footer>
    </div>
  );
}

export default App;
