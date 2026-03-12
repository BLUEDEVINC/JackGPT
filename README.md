# JackGPT

JackGPT is an installable AI assistant website inspired by modern conversational interfaces like ChatGPT.

## What this version includes

- ChatGPT-style website layout:
  - Left rail with **New chat** and recent conversations
  - Main chat panel with assistant/user message blocks
  - Bottom composer with quick prompt chips
- JackGPT modes:
  - Default
  - Memory
  - Creative
  - Study
  - Code
- Installable web app support (PWA):
  - `manifest.webmanifest`
  - `sw.js` service worker
  - in-app install button using `beforeinstallprompt`

## Run locally

```bash
python3 -m http.server 8000
```

Open:

- `http://localhost:8000/index.html`

## Install as app

1. Open in a Chromium-based browser.
2. Click **Install app** when shown.
3. Or use browser menu → **Install app**.
