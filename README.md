# JackGPT

JackGPT is a futuristic conversational AI assistant web app inspired by modern chat AI systems.

## Core Identity

- **Name:** JackGPT
- **Type:** Conversational Artificial Intelligence Assistant
- **Purpose:** Help with information, creativity, productivity, coding, and learning
- **Personality:** Friendly, intelligent, patient, curious, and helpful
- **Tone:** Clear, engaging, slightly enthusiastic, easy to understand

## Features Implemented

- Futuristic neon UI (blue / purple / black)
- Digital assistant branding and avatar style
- Chat interface with user + assistant messages
- Multiple assistant modes:
  - Default
  - Memory
  - Creative
  - Study
  - Code
- Capability panel describing what JackGPT can do
- Installable PWA app support:
  - Web app manifest
  - Service worker caching for app shell
  - In-app install button (`beforeinstallprompt`)

## Run Locally

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`

## Install JackGPT as an App

1. Open JackGPT in a Chromium-based browser.
2. Click **Install JackGPT** in the sidebar when available.
3. If the button is not shown, use browser menu → **Install app**.

## Notes

This repository contains a front-end JackGPT app prototype with installable PWA behavior.
