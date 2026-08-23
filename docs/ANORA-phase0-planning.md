# ANORA — Phase 0: Planning & Architecture

**From Information to Insight**

This is the analysis requested before any code is written. It covers the 14 items from your brief. Once you approve/adjust this, we move to Phase 1 (frontend foundation).

---

## 1. Final Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router + Axios | Fast dev loop, free hosting everywhere |
| Backend | Node.js + Express.js | REST API, auth, orchestration |
| AI Service | Python + FastAPI | Document processing + RAG |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (default) | Free, local, fast, 384-dim, good enough for a student project |
| LLM | Groq API (Llama 3.1 8B/70B, free tier) as primary, Ollama (local) as fallback | See §9 |
| Vector DB | **Qdrant** (Docker locally, Qdrant Cloud free tier in prod) | See §4 for why over Chroma |
| Database | MongoDB Atlas (free M0 cluster) | Users, KBs, docs, chats, usage |
| File Storage | Cloudinary free tier (raw file storage) *or* local disk + backend proxy for MVP, Supabase Storage free tier as alternative | See §4 |
| Auth | JWT + bcrypt | Stateless, standard |
| Hosting (frontend) | Vercel or Netlify (free tier) | |
| Hosting (backend) | Render free web service (or Railway free tier) | |
| Hosting (AI service) | Render free web service (separate instance) | Cold-start latency is the tradeoff — documented as a known limitation |
| Containerization | Docker + docker-compose for local dev (Qdrant, optionally Mongo) | |

---

## 2. Final Architecture

```
┌─────────────┐      ┌────────────────────┐      ┌──────────────────┐
│   React      │ ───▶ │  Node.js / Express   │ ───▶ │  MongoDB Atlas    │
│  (Vercel)    │ ◀─── │      (Render)        │ ◀─── │  (users, KBs,     │
└─────────────┘      │  - auth (JWT)         │      │   docs, chats)    │
                       │  - CRUD APIs          │      └──────────────────┘
                       │  - file upload proxy  │
                       │  - orchestrates AI svc │
                       └──────────┬────────────┘
                                  │ REST (internal, service-to-service)
                                  ▼
                       ┌────────────────────────┐      ┌──────────────────┐
                       │  Python / FastAPI         │ ───▶ │  Qdrant (Cloud)    │
                       │      (Render)              │ ◀─── │  vector store       │
                       │  - extract/clean/chunk     │      └──────────────────┘
                       │  - embeddings               │
                       │  - RAG orchestration         │      ┌──────────────────┐
                       │  - summarize / compare       │ ───▶ │  Groq / Ollama     │
                       └────────────────────────┘      │  LLM inference      │
                                                          └──────────────────┘
```

Node.js never talks to Qdrant or the LLM directly — it delegates all AI work to the FastAPI service. This keeps a clean separation: Node owns identity/data/ownership, Python owns intelligence. This separation is also one of your strongest interview talking points (§34: "why separate the AI service").

Document *bytes* are stored via the file storage provider; MongoDB stores only metadata + a storage URL/key, never the raw file blob (keeps documents within Atlas's free 512MB limit).

---

## 3. Why Each Technology Was Selected

- **React + Vite over Next.js**: This is a pure SPA behind a separate API — no need for SSR/routing complexity Next.js brings. Vite's dev server is fast and free-hosting friendly (static build).
- **Express over Nest/Fastify**: Minimal ceremony, huge ecosystem, easiest to explain in a viva.
- **FastAPI over Flask**: Async support (matters for I/O-bound embedding/LLM calls), automatic OpenAPI docs (`/docs`), Pydantic validation — all free wins for a project that must look "production-quality."
- **Sentence-Transformers (MiniLM) over OpenAI embeddings**: Runs locally/free, no per-call cost, no rate limits, no API key dependency — directly satisfies the ₹0 constraint and removes a paid dependency from the critical path.
- **Qdrant over Chroma**: see §4.
- **Groq (Llama 3.1) as primary LLM**: Free tier, genuinely fast (LPU inference), OpenAI-compatible-ish API, generous enough rate limits for demo/eval use. Ollama as a documented fallback so the LLM is swappable per your own constraint (§3, "swap between free inference / local model / another provider without changing the rest of the app") — this is implemented via a single `LLM_PROVIDER` env var and an interface class in the AI service.
- **MongoDB Atlas over Postgres**: Document-shaped data (nested chunk metadata, flexible document processing states) maps naturally to Mongo; free M0 tier is generous and this is explicitly requested in your spec.
- **JWT over session cookies**: Simpler across two separately-hosted services (frontend on Vercel, backend on Render) — no shared session store needed, avoids CORS/cookie cross-site headaches on free hosts.

---

## 4. Free-Tier / Cloud Strategy

**Vector DB — Qdrant vs Chroma decision:**
Qdrant Cloud has a genuinely free forever tier (1GB cluster) with a real hosted REST/gRPC endpoint, first-class multi-tenant "collections per namespace" support (maps cleanly to "one namespace per knowledge base," §7), and a Docker image for local dev that matches production exactly. ChromaDB is easier to embed in-process but its free *hosted* option is less mature and self-hosting it well on a free-tier host (Render free web service, ephemeral disk) risks data loss on restart. **Decision: Qdrant**, self-hosted via Docker locally, Qdrant Cloud free tier in production.

**File storage:** Render/Railway free tiers have **ephemeral disks** — uploaded files placed on local disk vanish on redeploy/restart. So local disk storage is fine for local dev only. For the deployed version we need a free option with persistent storage:
- **Cloudinary** free tier (25GB storage/bandwidth) supports raw file uploads (not just images) — good fit.
- Alternative: **Supabase Storage** free tier (1GB) — also viable, has a nicer bucket/policy model.
- We'll design a small `StorageProvider` interface in the backend (`uploadFile`, `getFileUrl`, `deleteFile`) so switching providers later is a config change, not a rewrite.

**LLM inference limitation:** Groq's free tier has request-per-minute and token-per-day caps. This is fine for demo/eval traffic but would not scale to many concurrent users — documented explicitly in `docs/security.md` / README "Limitations" section, with Ollama-local as the stated scale-down/offline fallback.

**MongoDB Atlas M0 limitation:** 512MB storage cap — mitigated by storing only metadata/text chunks references in Mongo, not raw files or full embeddings (embeddings live in Qdrant only).

**AI service cold starts:** Render free web services spin down after inactivity; first request after idle can take 30-60s. This will be called out in the UI (a "waking up the AI service…" state) rather than hidden, and documented as a known limitation rather than something to "fix" with a paid tier.

---

## 5. Complete Folder Structure

```
anora/
├── frontend/
│   └── src/
│       ├── components/       # Button, Card, Modal, ChatBubble, SourceCard, etc.
│       ├── pages/             # Landing, Login, Register, Dashboard, KnowledgeBases,
│       │                      # KnowledgeBaseDetail, Documents, DocumentDetail,
│       │                      # Chat, Summarize, Compare, Settings, Profile
│       ├── layouts/           # AuthLayout, AppLayout (sidebar+topbar)
│       ├── hooks/             # useAuth, useKnowledgeBases, useChat
│       ├── services/          # api.js (axios instance), auth.service.js, doc.service.js
│       ├── context/           # AuthContext
│       ├── utils/
│       └── App.jsx
├── backend/
│   └── src/
│       ├── controllers/       # auth, knowledgeBase, document, chat, ai
│       ├── models/            # User, KnowledgeBase, Document, Conversation, Message, Usage
│       ├── routes/
│       ├── middleware/        # auth.js (JWT verify), ownership.js, errorHandler.js, upload.js
│       ├── services/          # storage.service.js, aiService.client.js (calls FastAPI)
│       ├── utils/
│       └── server.js
├── ai-service/
│   └── app/
│       ├── api/                # routes: process, embed, query, summarize, compare
│       ├── rag/                 # retriever.py, prompt_builder.py, generator.py
│       ├── embeddings/          # embedder.py (Sentence-Transformers wrapper)
│       ├── document_processing/ # extract_pdf.py, extract_docx.py, extract_txt.py, chunker.py, cleaner.py
│       ├── models/               # llm_provider.py (Groq/Ollama interface), schemas.py
│       ├── vectorstore/          # qdrant_client.py
│       └── utils/
│   ├── main.py
│   └── requirements.txt
├── docs/
│   ├── architecture.md
│   ├── ai-pipeline.md
│   ├── cloud-deployment.md
│   ├── database.md
│   ├── api.md
│   ├── security.md
│   └── testing.md
├── sample-data/                 # synthetic sample docs (placement policy, handbook, etc.)
├── docker-compose.yml           # qdrant (+ optional local mongo)
├── README.md
└── .gitignore
```

---

## 6. Database Schema (MongoDB)

**User**
```
_id, name, email (unique, indexed), passwordHash, createdAt, updatedAt
```

**KnowledgeBase**
```
_id, userId (indexed, ref User), name, description,
qdrantCollectionName (unique, e.g. "kb_<kbId>"),
documentCount, createdAt, updatedAt
```

**Document**
```
_id, knowledgeBaseId (indexed, ref KnowledgeBase), userId (ref User),
originalFileName, storageKey/url, fileType (pdf|docx|txt), fileSizeBytes,
status (UPLOADING|PROCESSING|INDEXING|READY|FAILED), failureReason,
pageCount, chunkCount, createdAt, updatedAt
```

**Conversation**
```
_id, userId (indexed), knowledgeBaseId (indexed), title, createdAt, updatedAt
```

**Message**
```
_id, conversationId (indexed), role (user|assistant), content,
sources: [{ documentId, documentName, page, excerpt, score }],
createdAt
```

**Usage**
```
_id, userId (indexed), documentsProcessed, questionsAsked,
storageUsedBytes, lastActiveAt
```

Indexes: `User.email` (unique), `KnowledgeBase.userId`, `Document.knowledgeBaseId`, `Conversation.userId`, `Message.conversationId`. All ownership-sensitive queries filter by `userId` at the query level, never just at the UI level (defense against IDOR).

---

## 7. API Endpoint List

**Auth**
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

**Knowledge Bases**
```
GET    /api/knowledge-bases
POST   /api/knowledge-bases
GET    /api/knowledge-bases/:id
PUT    /api/knowledge-bases/:id
DELETE /api/knowledge-bases/:id
```

**Documents**
```
POST   /api/documents/upload            # multipart, kbId in body
GET    /api/documents?kbId=...
GET    /api/documents/:id
DELETE /api/documents/:id
GET    /api/documents/:id/status         # polling for processing state
```

**Chat**
```
POST   /api/chat                         # { kbId, conversationId?, question }
GET    /api/chat/conversations?kbId=...
GET    /api/chat/conversations/:id
DELETE /api/chat/conversations/:id
```

**AI**
```
POST   /api/ai/summarize                 # { documentId }
POST   /api/ai/compare                   # { documentIdA, documentIdB }
```

**Dashboard**
```
GET    /api/usage/summary
```

**Internal (Node → FastAPI, not exposed to frontend directly)**
```
POST   /internal/process-document
POST   /internal/query
POST   /internal/summarize
POST   /internal/compare
```

---

## 8. RAG Pipeline Design

**Ingestion:**
1. Backend receives upload → validates type/size → stores file via `StorageProvider` → creates `Document` (status `UPLOADING`→`PROCESSING`) → calls FastAPI `/internal/process-document` with storage URL + metadata.
2. FastAPI downloads/reads file → extracts text per type (PyMuPDF for PDF with page numbers, python-docx for DOCX with paragraph/section info, plain read for TXT) → cleans (whitespace, boilerplate) → chunks (recursive character splitter, ~500-800 tokens, ~100 token overlap) → attaches metadata (documentId, kbId, page, chunkId) → embeds each chunk (MiniLM) → status `INDEXING` → upserts vectors into the KB's Qdrant collection → status `READY` (or `FAILED` with reason).

**Query time:**
1. Frontend sends question + kbId (+ optional conversationId) to Node `/api/chat`.
2. Node persists the user Message, forwards to FastAPI `/internal/query`.
3. FastAPI embeds the question → Qdrant similarity search (top-k, configurable, default k=5) scoped to that KB's collection → builds a context block from retrieved chunks with citations → constructs the prompt (system instructions below) → calls LLM provider → returns `{ answer, sources[] }`.
4. Node persists the assistant Message with sources, returns to frontend.

**Anti-hallucination system prompt (core instructions):**
- Answer *only* using the provided context chunks.
- If the context does not contain enough information, explicitly say the uploaded documents don't contain that information — do not guess.
- Be concise; don't pad answers.
- Every factual claim should be traceable to a cited chunk.
- Distinguish direct quotes/facts from any reasonable inference, and flag inference explicitly.

**Retrieved-chunk formatting** includes document name + page number inline so the LLM can naturally reference them, and the backend independently attaches structured `sources[]` (doc, page, excerpt, score) so citations don't depend on the LLM getting formatting right.

---

## 9. AI Model Options

| Purpose | Primary (free) | Fallback | Why swappable design matters |
|---|---|---|---|
| Embeddings | `all-MiniLM-L6-v2` (local, CPU-fine) | `all-mpnet-base-v2` (higher quality, slower) | Config flag `EMBEDDING_MODEL` |
| LLM | Groq — Llama 3.1 8B Instant (fast, free tier) | Ollama running Llama 3.1 8B or Mistral 7B locally | `LLM_PROVIDER=groq|ollama`, single `BaseLLM` interface with `.generate(prompt)` implemented per provider |
| Alt free LLM option | Google Gemini free tier (as a documented alternative) | — | Same interface, just another provider class |

This satisfies your explicit requirement that the LLM be swappable without touching the rest of the app — the FastAPI service depends only on an abstract `LLMProvider`, never a specific vendor SDK, outside of `models/llm_provider.py`.

---

## 10. Cloud Deployment Strategy

1. **MongoDB Atlas**: free M0 cluster, IP allowlist open to 0.0.0.0/0 for Render (documented as a known relaxation for a student project, with a note on tightening via VPC peering in production).
2. **Qdrant Cloud**: free 1GB cluster, one collection per knowledge base (`kb_<id>`), API key stored as env var.
3. **File storage**: Cloudinary free tier, raw resource type, signed uploads from backend only (frontend never gets storage credentials).
4. **Backend (Node)**: Render free web service, env vars for `MONGO_URI`, `JWT_SECRET`, `AI_SERVICE_URL`, storage keys.
5. **AI service (FastAPI)**: separate Render free web service, env vars for `QDRANT_URL`, `QDRANT_API_KEY`, `LLM_PROVIDER`, `GROQ_API_KEY`.
6. **Frontend**: Vercel, env var `VITE_API_URL` pointing at the Render backend.
7. CORS on the backend restricted to the deployed frontend origin (+ localhost for dev).
8. All deploys triggered by pushes to `main` per service (three separate free-hosting projects).

---

## 11. Security Strategy

- Passwords hashed with bcrypt (cost factor 10-12), never logged or returned in any API response.
- JWT signed with a strong secret from env, short-ish expiry + refresh-on-activity (or simple re-login — kept simple for MVP, documented as a future improvement).
- Every knowledge-base/document/conversation query filtered by the authenticated `userId` at the database-query level (`Model.find({ _id, userId })`), not just hidden in the UI — this is the core "user ownership check" requirement.
- File upload validation: MIME-type check + extension allowlist (pdf/docx/txt) + size cap (e.g. 20MB) enforced in Multer config, re-validated in the AI service before processing.
- Rate limiting via `express-rate-limit` on auth and chat endpoints (free, no extra service needed).
- Input validation via `express-validator` / Pydantic schemas on both services.
- Generic error messages to clients ("Something went wrong processing your document") with full details only in server logs.
- Secrets only via `.env` (gitignored); `.env.example` files checked in with empty/placeholder values for both backend and ai-service.
- No credentials of any kind ever sent to or stored in the frontend bundle.

---

## 12. Development Roadmap

Following your Phase 1–12 structure exactly, with a working, demoable slice at the end of each phase (no phase starts until the previous one runs end-to-end):

1. Frontend foundation (routing, layout, landing, auth screens, dashboard shell)
2. Backend foundation (Express, Mongo models, JWT auth, error handling)
3. Document management (upload → storage → status tracking → delete)
4. AI document processing (extraction, cleaning, chunking)
5. Embeddings + Qdrant indexing
6. RAG (retrieval + prompt + LLM + citations)
7. AI features (chat UI, summarization, comparison)
8. Cloud deployment of all services
9. Security audit pass
10. Testing (backend, AI, frontend, manual E2E)
11. AI evaluation (10-20 question eval set, documented results)
12. Finalization (README, docs, diagrams, screenshots, presentation materials)

---

## 13. Risks and Limitations

- **Free-tier cold starts** (Render) cause noticeable first-request latency — mitigated with UI loading states, documented as a known limitation rather than hidden.
- **Groq free-tier rate limits** could throttle heavy demo/eval usage — Ollama fallback documented, evaluation run in batches with small delays.
- **MongoDB Atlas 512MB cap** — mitigated by keeping only metadata in Mongo; monitored via the Usage collection.
- **No horizontal scaling on free hosts** — single instance per service; documented in README "Limitations" and answered directly in the "how would you scale" interview question (stateless services behind a load balancer, managed Qdrant/Mongo tiers, queue-based processing for uploads).
- **CPU-only local embeddings** are slower than GPU/hosted options — acceptable at student-project document volumes, called out explicitly rather than glossed over.
- **Chunking quality** for complex DOCX layouts (tables, nested sections) is a known weak spot for python-docx-based extraction — documented rather than over-promised.

---

## 14. Approximate Implementation Order

1. Repo scaffold (monorepo folders, `.gitignore`, root README stub)
2. Frontend shell + auth pages (no backend yet, mocked)
3. Backend auth (register/login/me) + connect frontend to real auth
4. Knowledge base CRUD (backend + frontend)
5. Document upload pipeline (backend + storage integration, status states surfaced in UI)
6. AI service skeleton (FastAPI, `/health`, project structure)
7. Extraction + chunking (PDF/DOCX/TXT) with unit tests
8. Embeddings + Qdrant integration, wired to the processing pipeline
9. RAG query endpoint + chat UI end-to-end
10. Summarization + comparison features
11. Dashboard usage stats
12. Deployment of all three services
13. Security pass + rate limiting
14. Testing + AI evaluation dataset/report
15. Documentation, diagrams, README, presentation prep

---

### Next step

This is the full Phase 0 plan. If it looks right, say so (or tell me what to adjust — e.g. swap Cloudinary for Supabase Storage, change the default LLM, etc.) and I'll start **Phase 1 — Frontend Foundation**: scaffolding the Vite/React/Tailwind project, routing, layout, and the landing/login/register/dashboard-shell pages.
