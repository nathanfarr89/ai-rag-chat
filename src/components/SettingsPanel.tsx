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
  const hasOwnKey = Boolean(apiKey);

  return (
    <div className="settings-panel">
      <h2>Settings</h2>
      <p className="settings-hint">
        This demo works out of the box on a shared, rate-limited key. Add your own Anthropic API
        key below for unlimited use and a choice of model — it's stored only in this browser's
        local storage and sent directly to Anthropic's API, never to any server of ours.{" "}
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          Get a key
        </a>
      </p>

      <label className="field">
        <span>Anthropic API key (optional)</span>
        <div className="key-input-row">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="sk-ant-... (leave blank to use the shared demo)"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={() => setShowKey((s) => !s)}>
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <label className="field">
        <span>Model{!hasOwnKey && " (requires your own key)"}</span>
        <select
          value={model}
          disabled={!hasOwnKey}
          onChange={(e) => onModelChange(e.target.value as ClaudeModel)}
        >
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
