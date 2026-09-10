# RAG Chat

A retrieval-augmented chatbot that runs as a static site (GitHub Pages) plus one small
Cloudflare Worker for the free shared demo.

- Upload a `.txt`, `.md`, or `.pdf` file. It's parsed and split into chunks in your browser.
- Chunks are embedded in a Web Worker with [transformers.js](https://huggingface.co/docs/transformers.js) (`Xenova/all-MiniLM-L6-v2`, running on WASM — no API calls, no cost, and off the main thread so large documents don't freeze the tab).
- Asking a question embeds it the same way, retrieves the most relevant chunks by cosine similarity, and sends them as context to Claude.
- **No key needed to try it**: with the Settings key field left blank, chat requests go through a small Cloudflare Worker ([worker/](worker/)) that holds a shared, rate-limited Anthropic key so visitors can use the demo with zero setup.
- **Bring your own key for unlimited use**: pasting an Anthropic API key into Settings switches to calling the Claude API directly from the browser with that key (stored only in `localStorage`), bypassing the shared demo's rate limits and unlocking the model picker.

## Local development

```bash
npm install
npm run dev
```

With no `VITE_PROXY_URL` set, the app has no shared demo to fall back to — you'll need to paste
your own API key in Settings to chat locally, or run the worker too (see below).

## Deploying

### 1. The static site (GitHub Pages, free)

1. Create a GitHub repository and push this project to its `main` branch.
2. If your repo name isn't `ai-rag-chat`, update the `base` path in [vite.config.ts](vite.config.ts) to match: `/<your-repo-name>/`.
3. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main` — the included workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and deploys automatically.
5. Your site will be live at `https://<your-username>.github.io/<your-repo-name>/`.

### 2. The shared-demo proxy (Cloudflare Workers, free tier)

This step is optional — skip it and the site still works, just BYOK-only (visitors need their own key).

```bash
cd worker
npm install
npx wrangler login                              # one-time, opens a browser to authorize
npx wrangler kv namespace create RATE_LIMIT_KV  # prints a namespace id
```

1. Put that namespace id into `worker/wrangler.jsonc` under `kv_namespaces[0].id`.
2. Update `ALLOWED_ORIGIN` in `worker/wrangler.jsonc` to your actual GitHub Pages origin (e.g. `https://<your-username>.github.io`).
3. Set your Anthropic key as a secret (never committed): `npx wrangler secret put ANTHROPIC_API_KEY`.
4. Deploy: `npx wrangler deploy` — it prints the Worker's URL (`https://ai-rag-chat-proxy.<your-subdomain>.workers.dev`).
5. Back in the main repo, add a GitHub Actions **repository variable** named `VITE_PROXY_URL` set to that URL (**Settings → Secrets and variables → Actions → Variables**).
6. Push any commit (or re-run the workflow) so the site rebuilds with `VITE_PROXY_URL` baked in.

The worker caps usage with two limits (edit the constants in `worker/src/index.ts` to change them):
20 requests/hour per visitor IP, 300 requests/day total across everyone — and always answers on
a cheap/fast model (`claude-haiku-4-5` by default) regardless of what a BYOK visitor has selected,
since this key is funded by you, not them.

## How it works

| Step | Where it runs | Library |
|---|---|---|
| PDF/text parsing | Browser | `pdfjs-dist` |
| Chunking | Browser | hand-rolled, `src/lib/chunking.ts` |
| Embeddings | Web Worker (WASM) | `@huggingface/transformers` |
| Retrieval | Browser | cosine similarity, `src/lib/embeddings.ts` |
| Answer generation (no key) | Cloudflare Worker → Anthropic API | `worker/src/index.ts`, `@anthropic-ai/sdk` |
| Answer generation (own key) | Anthropic's API, called directly from the browser | `@anthropic-ai/sdk` (`dangerouslyAllowBrowser: true`) |

The embedding model (~90 MB) downloads once on first use and is cached by the browser.

## Notes for a portfolio demo

- The model dropdown in Settings only applies when a visitor has entered their own key — the
  shared demo always answers on the fixed cheap model configured in the worker.
- Cost exposure on the shared demo is bounded by the two rate limits above; tune them in
  `worker/src/index.ts` based on how much you're comfortable the demo could cost per day at
  `claude-haiku-4-5` rates.
