import { useState } from "react";
import type { ClaudeModel } from "../types";

const MODEL_OPTIONS: { value: ClaudeModel; label: string }[] = [
  { value: "claude-opus-5", label: "Claude Opus 5 (most capable)" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced)" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest / cheapest)" },
];

interface Props {
  apiKey: string;
  model: ClaudeModel;
  onApiKeyChange: (key: string) => void;
  onModelChange: (model: ClaudeModel) => void;
}

export function SettingsPanel({ apiKey, model, onApiKeyChange, onModelChange }: Props) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      <p className="settings-hint">
        Your API key is stored only in this browser's local storage and is sent directly
        to Anthropic's API — it never touches any server of ours.{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          Get a key
        </a>
      </p>

      <label className="field">
        <span>Anthropic API key</span>
        <div className="key-input-row">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-ant-..."
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowKey((s) => !s)}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <label className="field">
        <span>Model</span>
        <select value={model} onChange={(e) => onModelChange(e.target.value as ClaudeModel)}>
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
