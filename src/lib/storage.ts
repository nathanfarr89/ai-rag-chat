import type { ClaudeModel } from "../types";

const API_KEY_STORAGE_KEY = "rag-chat:anthropic-api-key";
const MODEL_STORAGE_KEY = "rag-chat:model";

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
}

export function setStoredApiKey(key: string): void {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function getStoredModel(): ClaudeModel {
  return (localStorage.getItem(MODEL_STORAGE_KEY) as ClaudeModel) ?? "claude-opus-5";
}

export function setStoredModel(model: ClaudeModel): void {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}
