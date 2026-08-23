# ANORA — Frontend

React + Vite + Tailwind CSS frontend for ANORA ("From Information to Insight").

This covers Phases 1–7: routing, layout, the public landing page,
authentication, knowledge base and document management, AI chat (RAG),
summarization, and document comparison — all wired to the live backend
API, no mock data anywhere.

## Run locally

```bash
npm install
cp .env.example .env   # point VITE_API_URL at your running backend
npm run dev
```

## What's here

- `src/pages/Landing.jsx` — public marketing page
- `src/pages/Login.jsx`, `Register.jsx` — auth screens, fully wired
- `src/pages/Dashboard.jsx` — authenticated shell with honest empty states
- `src/pages/KnowledgeBases.jsx` — list, create, delete
- `src/pages/Documents.jsx` — upload (PDF/DOCX/TXT), search, live status polling, delete
- `src/pages/Chat.jsx` — real RAG chat: conversation sidebar, source citations
  with page/section references, copy-answer button, new/delete conversation
- `src/pages/Summarize.jsx` — pick a ready document, generate a structured summary
- `src/pages/Compare.jsx` — pick two ready documents, generate a structured comparison
- `src/pages/Settings.jsx` — still a placeholder (no backend settings endpoints yet)
- `src/layouts/AppLayout.jsx` — sidebar + user menu for authenticated pages
- `src/context/AuthContext.jsx` — session state, backed by `localStorage` + JWT
- `src/services/` — Axios-based API clients: `api.js`, `auth.service.js`,
  `knowledgeBase.service.js`, `document.service.js`, `chat.service.js`, `ai.service.js`
- `src/components/ChatMessage.jsx`, `SourceCitation.jsx`, `FormattedAiText.jsx` —
  chat/citation/summary rendering, reused across Chat, Summarize, and Compare
- `src/index.css` — design tokens (`@theme`) for the ANORA visual system

Document status badges are real: uploads genuinely move through
"Processing" → "Indexing" → "Ready"/"Failed" as the AI service actually
processes them. Summarize/Compare only offer documents with status
`READY`.

## Design system

- Deep ink background (`#0B0F19`), warm signal-amber accent (`#E8A33D`), cyan
  "vector" accent (`#5EC8D8`) reserved for AI/semantic UI.
- Display type: Newsreader (serif, editorial). Body: Inter. Metadata/labels
  (page numbers, chunk ids, citations): IBM Plex Mono — used functionally,
  wherever the product surfaces a literal fact pulled from a document.
- Signature element: the hero's `InsightScan` component — a document being
  swept by a scan line whose text resolves into a cited answer card. It's a
  literal picture of the tagline, not a decorative flourish.
