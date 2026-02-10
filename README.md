# Chatbot UI – DeepRack Template

A production-ready React chat interface for your AI chatbot backend.

## Features

- **Streaming responses** — real-time token-by-token display
- **Markdown rendering** — code blocks with copy button, headings, lists, bold, inline code
- **Typing indicator** — animated dots while waiting
- **Dark theme** — sleek dark UI, fully self-contained (no Tailwind dependency)
- **Responsive** — works on desktop and mobile
- **Health check** — shows online/offline status in header
- **Configurable** — name, tagline, accent colour, API URL — all via env vars

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `REACT_APP_API_URL` | ✅ | `http://localhost:8000` | Backend chatbot API URL |
| `REACT_APP_BOT_NAME` | | `AI Assistant` | Display name in header and welcome screen |
| `REACT_APP_BOT_TAGLINE` | | `Powered by DeepRack` | Subtitle text |
| `REACT_APP_ACCENT` | | `#6366f1` | Accent colour (hex) |

> **Note:** `REACT_APP_*` env vars are baked in at **build time** (React convention).

## Local Development

```bash
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

## Docker

```bash
docker build \
  --build-arg REACT_APP_API_URL=https://my-bot-api.bavision.in \
  --build-arg REACT_APP_BOT_NAME="My Bot" \
  -t chatbot-ui .

docker run -p 3000:3000 chatbot-ui
```

## Pairing with chatbot-api

This UI expects the backend to expose:

- `GET /health` — returns `{"status": "healthy"}`
- `POST /chat` — accepts `{"messages": [...], "stream": true}` and returns NDJSON stream

Both endpoints are provided by the companion `chatbot-api` template out of the box.

## Architecture

```
┌──────────────┐    streaming     ┌──────────────┐     ┌────────┐
│  chatbot-ui  │ ────────────── > │  chatbot-api  │ ──> │ Ollama │
│  (React/Nginx)│   /chat NDJSON  │  (FastAPI)    │     │  (GPU) │
└──────────────┘                  └──────────────┘     └────────┘
```

## License

Proprietary — Bavision Technologies
