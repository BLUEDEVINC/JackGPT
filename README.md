# ChatGPT Clone

A production-minded full-stack AI chat web app inspired by ChatGPT, with authentication, conversation history, streaming responses, markdown rendering, code highlighting, sharing, and export tools.

## Project tree

```text
.
├── backend
│   ├── package.json
│   └── src
│       ├── config.js
│       ├── db.js
│       ├── server.js
│       ├── controllers
│       │   ├── authController.js
│       │   └── conversationController.js
│       ├── middleware
│       │   └── auth.js
│       ├── models
│       │   ├── Conversation.js
│       │   ├── Message.js
│       │   └── User.js
│       ├── routes
│       │   ├── authRoutes.js
│       │   └── conversationRoutes.js
│       ├── services
│       │   └── openaiService.js
│       └── utils
│           └── token.js
├── frontend
│   ├── package.json
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src
│       ├── main.jsx
│       ├── components
│       │   ├── AuthPanel.jsx
│       │   ├── ChatComposer.jsx
│       │   ├── MessageItem.jsx
│       │   └── Sidebar.jsx
│       ├── hooks
│       │   └── useTheme.js
│       ├── lib
│       │   └── api.js
│       ├── pages
│       │   ├── App.jsx
│       │   └── SettingsPage.jsx
│       └── styles
│           └── tailwind.css
├── .env.example
├── package.json
└── README.md
```

## Features

- Sign up / sign in with JWT auth
- Google sign-in endpoint support
- Conversation CRUD (create, rename, delete)
- Streaming assistant responses via SSE
- Full chat history in MongoDB
- Markdown + syntax-highlighted code blocks
- Copy message button
- Regenerate response
- Typing indicator
- Dark/light mode toggle
- Conversation sharing token
- Export conversation as JSON or Markdown
- Settings modal scaffold

## Tech stack

- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Node.js, Express, OpenAI API
- **Database**: MongoDB + Mongoose
- **Auth**: JWT + Google OAuth token verification

## Setup

1. Copy env file and configure values:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   npm install --workspace backend
   npm install --workspace frontend
   ```

3. Run MongoDB locally (or set `MONGO_URI` to your hosted cluster).

4. Start backend and frontend:

   ```bash
   npm run dev
   ```

5. Open frontend at `http://localhost:5173`.

## API overview

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/conversations`
- `POST /api/conversations`
- `PATCH /api/conversations/:id`
- `DELETE /api/conversations/:id`
- `GET /api/conversations/:id/messages`
- `PATCH /api/conversations/:id/messages/:messageId`
- `POST /api/conversations/:id/messages/stream` (SSE)
- `POST /api/conversations/:id/regenerate`
- `POST /api/conversations/:id/share`
- `GET /api/conversations/:id/export?format=json|md`

## Production notes

- Replace default JWT secret and enforce strong env secrets.
- Add refresh-token rotation + secure HTTP-only cookies for hardened auth.
- Add automated tests (unit/integration/e2e) and CI pipelines.
- Add centralized logging and monitoring (OpenTelemetry, Sentry, etc.).
- Use object storage for chat exports and rate limits backed by Redis in multi-instance deployments.
