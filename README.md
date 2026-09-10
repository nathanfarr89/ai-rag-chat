# RAG Chat

A retrieval-augmented chatbot that runs entirely as a static site — no backend server.

- Upload a `.txt`, `.md`, or `.pdf` file. It's parsed and split into chunks in your browser.
- Chunks are embedded in-browser with [transformers.js](https://huggingface.co/docs/transformers.js) (`Xenova/all-MiniLM-L6-v2`, running on WASM — no API calls, no cost).
- Asking a question embeds it the same way, retrieves the most relevant chunks by cosine similarity, and sends them as context to Claude.
- Each visitor supplies their own Anthropic API key (stored only in their browser's `localStorage`) and calls the Claude API directly from the browser — that's what makes it deployable on GitHub Pages with zero backend and zero cost to you.

## Local development

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages (free)

1. Create a GitHub repository and push this project to its `main` branch.
2. If your repo name isn't `ai-rag-chat`, update the `base` path in [vite.config.ts](vite.config.ts) to match: `/<your-repo-name>/`.
3. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main` — the included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and deploys automatically.
5. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.

No secrets, environment variables, or servers to configure — visitors bring their own Anthropic API key when they use the deployed site.

## How it works

| Step | Where it runs | Library |
|---|---|---|
| PDF/text parsing | Browser | `pdfjs-dist` |
| Chunking | Browser | hand-rolled, `src/lib/chunking.ts` |
| Embeddings | Browser (WASM) | `@huggingface/transformers` |
| Retrieval | Browser | cosine similarity, `src/lib/embeddings.ts` |
| Answer generation | Anthropic's API, called directly from the browser | `@anthropic-ai/sdk` (`dangerouslyAllowBrowser: true`) |

The embedding model (~90 MB) downloads once on first use and is cached by the browser.

## Notes for a portfolio demo

- Since it needs a visitor's own API key to chat, consider adding a short note near the key field explaining that (already included in the Settings panel), and linking to how to get a free/low-cost Anthropic key.
- The default model is Claude Opus 5; a dropdown lets visitors switch to Sonnet 5 or Haiku 4.5 if they want cheaper/faster responses on their own key.
