# ANORA

### From Information to Insight

ANORA is a cloud-based AI document intelligence platform. You upload documents (PDF, DOCX, TXT), it automatically extracts and understands them, and you can then ask natural-language questions and get answers grounded in your own documents — with citations back to the exact page or section they came from. It also generates summaries and compares two versions of a document.

This README explains what the project does, how it's built, how every piece fits together, and how to run and deploy it yourself — including everything learned getting it actually running in production, not just in theory.

---

## Table of Contents

1. [What ANORA Actually Does](#what-anora-actually-does)
2. [Why It's Built This Way](#why-its-built-this-way)
3. [System Architecture](#system-architecture)
4. [The RAG Pipeline, Step by Step](#the-rag-pipeline-step-by-step)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Environment Variables](#environment-variables)
10. [Running It Locally](#running-it-locally)
11. [Deployment](#deployment)
12. [Deployment Gotchas We Actually Hit](#deployment-gotchas-we-actually-hit)
13. [Security](#security)
14. [Testing](#testing)
15. [Known Limitations](#known-limitations)
16. [Possible Future Improvements](#possible-future-improvements)

---

## What ANORA Actually Does

From the user's point of view:

1. **Register / log in.**
2. **Create a knowledge base** — a named container for a set of related documents (e.g. "Placement Preparation", "College Regulations"). Each user's knowledge bases are completely private to them.
3. **Upload a document** (PDF, DOCX, or TXT) into a knowledge base. You watch its status move through `Uploading → Indexing → Ready` (or `Failed`, with a specific reason, if something went wrong).
4. **Ask questions in Chat**, scoped to one knowledge base. You get an answer that is *grounded* in your actual documents — not the AI's general knowledge — along with the specific source document, page/section, and excerpt it came from, rendered as proper formatted text (headings, bold, lists) rather than raw Markdown symbols. If your documents don't contain the answer, ANORA says so honestly instead of guessing.
5. **Summarize** any ready document into a structured overview (key points, requirements, dates, terminology).
6. **Compare** two documents (e.g. two versions of a policy) and see exactly what was added, removed, or changed, rendered as a real formatted table.
7. **Dashboard** shows real, live counts — knowledge bases, documents, questions asked, storage used — plus recent documents and recent conversations.

Nothing on the frontend is mock data. Every number, every document, every chat response is a real round trip through the backend, the database, and (for AI features) the Python AI service.

---

## Why It's Built This Way

**Three separate services, not one monolith.** The Node backend owns identity, ownership, and orchestration. The Python AI service owns everything AI-related (extraction, embeddings, retrieval, generation). This separation exists because:
- Python has the strongest ecosystem for document processing and ML (PyMuPDF, python-docx, sentence-transformers).
- Node/Express is a natural fit for a clean REST API and JWT auth.
- If the AI service is slow, down, or needs to scale independently, it doesn't take the whole app down — uploads/logins still work, only AI-dependent actions fail gracefully with a clear error.

**Retrieval-Augmented Generation (RAG), not fine-tuning.** Fine-tuning a model on your documents is expensive, slow to update (every new document needs retraining), and doesn't give you citations. RAG instead: turns your documents into searchable vector embeddings once, then at question-time retrieves the most relevant pieces and hands them to an LLM as context. New documents are searchable within seconds of upload, and every answer can point back to exactly what it used.

**A swappable-provider pattern, used three times.** Storage, embeddings, and the LLM are each hidden behind a small interface so the concrete implementation can change without touching any calling code:
- `StorageProvider` — local disk (dev) or **Supabase Storage** (production), swapped via `STORAGE_PROVIDER`. Built because Render's free tier has an ephemeral disk — local storage would lose every uploaded file on every restart in production.
- Embeddings — real `sentence-transformers` (local, needs enough RAM), a **hosted Hugging Face Inference API** option (no local RAM needed — see below), or an offline deterministic fallback used only by the automated test suite. Swapped via `EMBEDDING_PROVIDER`.
- LLM — Groq (default, free-tier, fast) or a local Ollama server, swapped via `LLM_PROVIDER`.

This is what keeps the project running on a **₹0 budget**: everything defaults to a free tier or a local fallback, and nothing is hard-wired to a paid service.

**Why there are now two embedding options, not one.** The original plan was to always run `sentence-transformers` directly inside the AI service. In practice, that pulls in PyTorch, whose runtime footprint alone can exceed **Render's free-tier 512MB RAM limit** — the process gets silently killed mid-request, surfacing as an empty `502` with no error message at all. The fix was to add a second provider that calls Hugging Face's **hosted** Inference API instead (`EMBEDDING_PROVIDER=huggingface-api`) — same model, same embeddings, but the heavy computation happens on Hugging Face's servers, not your 512MB container. `sentence-transformers` still works great for local development (where you have real RAM available) or on a paid hosting tier; the hosted API is what makes the free tier actually viable.

---

## System Architecture

```
                         ┌─────────────────────┐
                         │   React Frontend      │
                         │  (Vite + Tailwind)     │
                         └──────────┬────────────┘
                                    │ REST (JWT)
                                    ▼
                         ┌─────────────────────┐
                         │  Node.js / Express     │
                         │  - auth (JWT + bcrypt)  │
                         │  - ownership checks       │
                         │  - CRUD APIs                │
                         │  - orchestrates AI service    │
                         └──────┬──────────┬───────────┘
                                │          │
                 ┌──────────────┘          └───────────────┐
                 ▼                                          ▼
      ┌────────────────────┐                     ┌─────────────────────┐
      │   MongoDB Atlas      │                     │  Storage Provider     │
      │  users, knowledge      │                     │  local disk (dev) or   │
      │  bases, documents,       │                     │  Supabase Storage       │
      │  conversations, messages   │                     │  (production)             │
      └────────────────────┘                     └─────────────────────┘
                                    │
                                    │ internal REST (file bytes / questions)
                                    ▼
                         ┌─────────────────────┐
                         │  Python / FastAPI      │
                         │  AI Service              │
                         │                            │
                         │  extract → clean → chunk     │
                         │  embed → store vectors          │
                         │  retrieve → prompt → generate      │
                         │  summarize / compare                  │
                         └──────┬──────────┬───────────┘
                                │          │
                                ▼          ▼
                   ┌─────────────────┐  ┌──────────────────┐
                   │  Qdrant Cloud      │  │  Groq (LLM)        │
                   │  vector database     │  │  or local Ollama     │
                   │  (or embedded local     │  └──────────────────┘
                   │  for dev)                  │
                   └─────────────────┘
                                │
                                ▼
                   ┌─────────────────────┐
                   │  Embedding source      │
                   │  Hugging Face hosted     │
                   │  Inference API (prod) or   │
                   │  local sentence-            │
                   │  transformers (dev)            │
                   └─────────────────────┘
```

The Node backend **never** talks to Qdrant, Hugging Face, or the LLM directly — every AI-related action is delegated to the Python service over a small internal HTTP API. The frontend never talks to the AI service directly either — everything goes through the Node backend, which enforces authentication and ownership first.

---

## The RAG Pipeline, Step by Step

### Ingestion (what happens when you upload a document)

```
1. Upload arrives at the backend → validated (type: pdf/docx/txt, size limit)
2. File bytes saved via the StorageProvider → Document record created (status: UPLOADING)
3. Backend calls the AI service's /internal/index-document, sending the file
4. AI service:
   a. Extracts text
        - PDF  → page-by-page text (PyMuPDF), page numbers preserved
        - DOCX → paragraph-by-paragraph text (python-docx), tagged with
                 the nearest preceding heading as a "section"
        - TXT  → plain text, encoding-tolerant
   b. Cleans the text — whitespace/control-character normalization,
      rejoins words PDF-wrapped across a line break.
   c. Chunks the cleaned text — a recursive splitter (paragraph → sentence
      → whitespace → hard cut) targeting ~800 characters with ~100
      characters of overlap.
   d. Generates an embedding vector for each chunk — either locally via
      sentence-transformers, or via a hosted Hugging Face API call,
      depending on EMBEDDING_PROVIDER.
   e. Stores each chunk's vector + text + metadata (document ID, knowledge
      base ID, chunk index, page or section) in that knowledge base's own
      Qdrant collection. On Qdrant Cloud, this also ensures a payload
      index exists on `document_id` — required before that field can be
      filtered on later (see the gotchas section below).
5. AI service returns { chunk_count, page_count } to the backend
6. Backend updates the Document: status → READY, chunkCount, pageCount saved
```

Every knowledge base gets its own Qdrant collection (named `kb_<id>`), so a question asked in one knowledge base can never accidentally retrieve content from another — including another knowledge base owned by the same user.

### Question answering (what happens when you send a chat message)

```
1. Question arrives at the backend → knowledge base ownership verified
2. Backend calls the AI service's /internal/query
3. AI service:
   a. Embeds the question using the same embedding provider used for documents
   b. Searches Qdrant for the most similar chunks in that KB's collection (top-k, default 5)
   c. If nothing relevant is found, returns an honest "the uploaded documents
      don't contain enough information" response immediately — the LLM is
      never even called in this case
   d. Otherwise, builds a prompt containing the retrieved chunks as numbered
      sources, with explicit anti-hallucination instructions, and sends it
      to Groq (max_tokens raised to 1500 so longer answers don't get cut
      off mid-sentence)
4. AI service returns { answer, sources, grounded } to the backend
5. Backend saves both the user's question and the assistant's answer (with
   sources) as Messages in MongoDB, and returns them to the frontend
6. Frontend renders the assistant's answer as real Markdown (headings,
   bold, lists) via the FormattedAiText component, instead of showing raw
   ** and * characters
```

### Summarization & Comparison

Both fetch every indexed chunk for one (or two) documents from Qdrant, in original chunk order, and ask the LLM to produce structured output — summaries get Overview / Key Points / Important Requirements / Important Dates / Main Conclusions / Important Terminology; comparisons get additions / removals / changed requirements / changed dates / changed numbers, rendered as a Markdown table. Both are rendered through the same `FormattedAiText` component used by Chat, which uses `react-markdown` + `remark-gfm` (for table support) + `rehype-raw` (for any literal `<br>` tags the model emits) — so tables, bold text, and lists all render properly instead of as raw symbols.

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router, Axios, react-markdown | Fast dev loop, free hosting anywhere, no server needed |
| Backend | Node.js, Express, JWT, bcrypt | Clean REST API, minimal ceremony, huge ecosystem |
| AI Service | Python, FastAPI | Async I/O, auto-generated API docs, strong document-processing ecosystem |
| Document extraction | PyMuPDF (PDF), python-docx (DOCX) | Page-level and section-level metadata preservation |
| Embeddings | sentence-transformers (local, dev) *or* Hugging Face hosted Inference API (production — avoids RAM limits on free hosting) | Free either way; hosted option needed because Render's free tier can't fit PyTorch's memory footprint |
| Vector database | Qdrant (embedded local for dev, Qdrant Cloud for production) | Real free-tier hosted option and a zero-setup embedded local mode — same client code either way |
| LLM | Groq (free tier) — swappable to Ollama | Fast inference, generous free tier, OpenAI-compatible API |
| Database | MongoDB Atlas (free M0 tier) | Document-shaped data fits the domain naturally |
| File storage | Local disk (dev) / **Supabase Storage** (production) | Free, and — unlike Render's disk — actually persists across deploys/restarts |
| Hosting | Vercel (frontend), Render (backend + AI service) | Free tiers, straightforward Git-based deploys |

---

## Project Structure

```
anora/
├── frontend/
│   └── src/
│       ├── pages/          Landing, Login, Register, Dashboard,
│       │                   KnowledgeBases, Documents, Chat,
│       │                   Summarize, Compare, Settings
│       ├── layouts/         AuthLayout, AppLayout (sidebar + topbar)
│       ├── components/       ChatMessage (renders Markdown), SourceCitation,
│       │                     FormattedAiText (react-markdown + remark-gfm +
│       │                     rehype-raw — tables, bold, lists), StatusBadge,
│       │                     PageHeader, etc.
│       ├── context/           AuthContext (JWT session state)
│       ├── services/           Axios API clients — one per resource
│       └── index.css            Design tokens + the InsightScan hero animation
│
├── backend/
│   └── src/
│       ├── models/           User, KnowledgeBase, Document,
│       │                     Conversation, Message, Usage (Mongoose)
│       ├── controllers/        auth, knowledgeBase, document, chat, ai
│       ├── routes/              one file per resource
│       ├── middleware/           auth (JWT), ownership, upload validation,
│       │                        rate limiting, central error handling
│       ├── services/
│       │   ├── storage/          StorageProvider interface —
│       │   │                     local disk / Supabase implementations
│       │   └── aiService.client.js   calls the Python AI service
│       ├── tests/                 Supertest smoke tests + storage tests
│       ├── scripts/
│       │   └── manual-ai-service-check.mjs   real end-to-end check
│       ├── app.js                  Express app
│       └── server.js                connects to MongoDB, binds the port
│
├── ai-service/
│   └── app/
│       ├── document_processing/     extraction, cleaning, chunking
│       ├── embeddings/
│       │   └── embedder.py            sentence-transformers /
│       │                              huggingface-api / deterministic-hash
│       ├── vectorstore/
│       │   └── qdrant_client.py         collection mgmt, upsert, search,
│       │                                scroll-by-document (with payload
│       │                                index creation for Qdrant Cloud), delete
│       ├── rag/
│       │   ├── indexing.py            pipeline → embed → store
│       │   ├── retriever.py            embed question → search
│       │   ├── prompt_builder.py        anti-hallucination + summary +
│       │   │                            comparison prompts
│       │   ├── qa.py                     retrieve → prompt → generate
│       │   ├── summarize.py
│       │   └── compare.py
│       ├── models/
│       │   ├── schemas.py                 Pydantic request/response models
│       │   └── llm_provider.py             Groq (max_tokens=1500) / Ollama /
│       │                                   offline test double
│       └── api/                             process, index, query, ai_features
│   ├── main.py                                FastAPI app entry point
│   └── tests/                                  70 tests, fully offline
│
├── docs/
│   └── ANORA-phase0-planning.md                original architecture/planning doc
├── docker-compose.yml                            Qdrant, for local dev
└── README.md                                      this file
```

---

## Database Schema

**User** — `name`, `email` (unique), `passwordHash` (bcrypt, never exposed), timestamps.

**KnowledgeBase** — `userId`, `name`, `description`, `qdrantCollectionName` (auto-generated as `kb_<id>`), `documentCount`.

**Document** — `knowledgeBaseId`, `userId`, `originalFileName`, `storageKey`, `storageUrl`, `fileType` (pdf/docx/txt), `fileSizeBytes`, `status` (`UPLOADING` / `INDEXING` / `READY` / `FAILED`), `failureReason`, `pageCount`, `chunkCount`.

**Conversation** — `userId`, `knowledgeBaseId`, `title` (auto-set from the first question).

**Message** — `conversationId`, `role` (`user`/`assistant`), `content`, `sources` (embedded array: `documentId`, `documentName`, `page`, `excerpt`, `score`).

**Usage** — `userId`, `documentsProcessed`, `questionsAsked`, `storageUsedBytes`, `lastActiveAt`.

Every query for knowledge bases, documents, conversations, and messages filters by `userId` (or a chain back to it) at the database level — ownership is enforced in the query itself, not just hidden in the UI.

---

## API Reference

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
DELETE /api/knowledge-bases/:id      (also deletes its documents + Qdrant collection)
```

**Documents**
```
POST   /api/documents/upload         (multipart; kbId + file)
GET    /api/documents                (optional ?kbId=&search=)
GET    /api/documents/:id
GET    /api/documents/:id/status
GET    /api/documents/file/:storageKey   (ownership-checked file stream)
DELETE /api/documents/:id            (also deletes its vectors)
```

**Chat**
```
POST   /api/chat                     ({ kbId, conversationId?, question })
GET    /api/chat/conversations       (optional ?kbId=)
GET    /api/chat/conversations/:id   (returns conversation + messages)
DELETE /api/chat/conversations/:id
```

**AI Features**
```
POST   /api/ai/summarize             ({ documentId })
POST   /api/ai/compare               ({ documentIdA, documentIdB })
```

**Usage**
```
GET    /api/usage/summary
```

**Internal (Node → Python only, never exposed to the frontend)**
```
POST   /internal/index-document
POST   /internal/query
POST   /internal/summarize
POST   /internal/compare
DELETE /internal/collections/:name/documents/:id
DELETE /internal/collections/:name
```

---

## Environment Variables

**`backend/.env`**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=                    # MongoDB Atlas connection string
JWT_SECRET=                   # long random string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173   # must exactly match the deployed frontend URL in production — no trailing slash
AI_SERVICE_URL=http://localhost:8000   # NO trailing slash — see gotchas section
MAX_UPLOAD_SIZE_MB=20

STORAGE_PROVIDER=local        # or "supabase"
SUPABASE_URL=                 # if using supabase — project URL
SUPABASE_SERVICE_KEY=         # if using supabase — service_role key, NEVER the anon key, NEVER sent to the frontend
SUPABASE_BUCKET=anora-documents
```

**`ai-service/.env`**
```env
QDRANT_URL=                   # blank = embedded local Qdrant. Set for Qdrant Cloud in production.
QDRANT_API_KEY=
QDRANT_LOCAL_PATH=./qdrant_data

EMBEDDING_PROVIDER=sentence-transformers   # local dev. Use "huggingface-api" on free-tier hosting (RAM limits).
EMBEDDING_MODEL=all-MiniLM-L6-v2           # NOTE: if EMBEDDING_PROVIDER=huggingface-api, use the full path instead:
                                            # sentence-transformers/all-MiniLM-L6-v2
HUGGINGFACE_API_TOKEN=                     # required only if EMBEDDING_PROVIDER=huggingface-api — get a free "Read" token at huggingface.co

LLM_PROVIDER=groq             # or "ollama"
GROQ_API_KEY=                 # free key from console.groq.com
GROQ_MODEL=openai/gpt-oss-20b # check console.groq.com/docs/models for currently valid IDs — Groq
                               # retires/renames models over time; an invalid ID here fails with a 404
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running It Locally

Three services, three terminals.

**1. Backend**
```bash
cd backend
npm install
cp .env.example .env    # fill in MONGO_URI and JWT_SECRET
npm run dev
```

**2. AI service**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # add GROQ_API_KEY for real answers; sentence-transformers is fine locally (real RAM available)
uvicorn main:app --reload --port 8000
```

**3. Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the frontend URL, register, create a knowledge base, upload a document, and chat with it.

Optional — real Qdrant instead of the embedded fallback:
```bash
docker compose up -d      # from the repo root
# then set QDRANT_URL=http://localhost:6333 in ai-service/.env
```

---

## Deployment

- **Frontend** → Vercel, root directory `frontend`, env var `VITE_API_URL` pointing at the deployed backend. **Also add a `frontend/vercel.json`** (see gotchas below) or client-side route refreshes will 404.
- **Backend** → Render (free web service), root directory `backend`, build `npm install`, start `npm start`.
- **AI service** → Render (free web service), root directory `ai-service`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`. Use `EMBEDDING_PROVIDER=huggingface-api`, not `sentence-transformers` (RAM limits — see gotchas).
- **Database** → MongoDB Atlas free M0 cluster, `0.0.0.0/0` in Network Access (Render's IPs aren't fixed on the free tier).
- **Vector database** → Qdrant Cloud free tier (`QDRANT_URL`/`QDRANT_API_KEY` on the AI service).
- **File storage** → Supabase Storage (`STORAGE_PROVIDER=supabase` + credentials on the backend) — required in production, local disk would lose files on every Render restart.

After deploying: set `CORS_ORIGIN` on the backend to the exact deployed frontend URL (no trailing slash), and `AI_SERVICE_URL` on the backend to the deployed AI service URL (**no trailing slash** — this one actually broke things, see below).

---

## Deployment Gotchas We Actually Hit

Everything below is a real bug that showed up only once this was deployed for real — none of it was caught by local testing, because local dev doesn't have the same constraints (real Qdrant Cloud, a 512MB RAM cap, a CDN-served SPA, etc.). Documenting these so they don't have to be rediscovered:

1. **A trailing slash on `AI_SERVICE_URL` breaks every internal call.** `${env.aiServiceUrl}/internal/index-document` with a trailing-slash base produces a double slash (`.../..//internal/...`), which several proxy layers mishandle. Set the env var with no trailing slash, and/or strip it defensively at load time in `config/env.js`.

2. **`sentence-transformers` OOMs on Render's free tier.** PyTorch's memory footprint alone can exceed 512MB. This fails as an empty `502` with no error body at all (the process gets killed, not a clean Python exception) — genuinely hard to diagnose from the error alone. Fix: use `EMBEDDING_PROVIDER=huggingface-api` in production instead, which calls Hugging Face's hosted Inference API rather than loading a model locally.

3. **Hugging Face deprecated `api-inference.huggingface.co`.** The old Inference API domain is fully retired in favor of `router.huggingface.co`. Using the old domain fails with a DNS resolution error (`No address associated with hostname`), not an HTTP error — the domain is genuinely gone, not just erroring. Current correct endpoint: `https://router.huggingface.co/hf-inference/models/{model}/pipeline/feature-extraction`.

4. **Qdrant Cloud requires an explicit payload index before filtering on a field.** The embedded/local Qdrant used in development is lenient about this; Qdrant Cloud is not. Any `scroll()`/`delete()` call that filters on `document_id` (used by summarize, compare, and single-document deletion) needs `client.create_payload_index(collection_name, field_name="document_id", field_schema="keyword")` called first. Creating an index that already exists is a safe no-op, so this can just run before every such call.

5. **Vercel 404s on refresh for any non-root route.** React Router handles routing entirely client-side; a hard refresh on `/dashboard` asks Vercel's server for a literal path that doesn't exist. Fix: add `frontend/vercel.json` with a catch-all rewrite to `/index.html`.

6. **Groq's `max_tokens` default was too low for long-form output.** `600` tokens is enough for short chat answers but truncates a structured summary or comparison mid-sentence. Raised to `1500`.

7. **Groq model IDs change over time.** A model that worked at one point (`llama-3.1-8b-instant`) later returned a `404` because Groq retired/renamed it. Always check `console.groq.com/docs/models` for a currently valid **Production Model** ID rather than assuming a hardcoded default still exists.

8. **Axios's default `Content-Type: application/json` header silently broke file uploads.** Setting a default header on the shared axios instance overrides axios's automatic `FormData` detection, so a file upload gets sent labeled as JSON instead of multipart — the backend then sees no file at all. Don't set a default `Content-Type` on the shared instance; let axios infer it per-request.

9. **Render free-tier cold starts can look like a broken app.** After ~15 minutes idle, a free service spins down; the first request after that can take 30-60+ seconds (sometimes longer) to respond while it wakes up. This can present as chat/summarize/compare all failing "for no reason" if you don't wait it out. Warm the AI service's `/health` endpoint a minute or two before a demo to avoid this mid-presentation.

10. **A couple of leftover Mongoose/Express issues from earlier build phases** — an outdated `pre('validate')` hook callback signature, a `required: true` on a field that's legitimately empty at creation time, and a validator not accepting `null` for an optional field — all surfaced only once real traffic exercised those exact code paths. Worth a broader validation-logic review pass if extending the schema further.

---

## Security

- Passwords hashed with bcrypt; never stored, logged, or returned in plaintext.
- JWT-authenticated sessions on every protected route.
- Ownership enforced at the database query level for every knowledge base, document, conversation, and message.
- File upload validation: MIME type allowlist (PDF/DOCX/TXT only) and a configurable size cap.
- Secrets live only in environment variables; `.env` is gitignored everywhere.
- The global error handler never returns a stack trace to the client, in any environment.
- CORS locked to the specific configured frontend origin.
- Login returns an identical error for "no such user" and "wrong password."
- Supabase's `service_role` key is used only server-side by the backend, never sent to or accessible from the frontend; the storage bucket itself is private (not public), with files streamed back through the backend's own ownership-checked route.

---

## Testing

- **Backend**: `npm test` — Supertest smoke tests and real local-disk storage provider I/O tests, no live server or database needed.
- **AI service**: `pytest` — 70 tests, fully offline (real generated PDF/DOCX files, an embedded in-memory Qdrant instance, an offline deterministic embedding provider, and an offline "extractive" LLM stand-in — never used in production).
- **Cross-service integration**: `backend/scripts/manual-ai-service-check.mjs` — real end-to-end script against a live AI service.

Note: none of the automated tests run against a real Qdrant Cloud cluster, which is exactly why gotcha #4 above wasn't caught until deployment — the embedded local instance used in tests doesn't enforce the same indexing requirement. Worth keeping in mind before assuming "all tests pass" means "will work identically in production."

---

## Known Limitations

- **No background job queue.** Indexing and RAG queries run synchronously inside their HTTP request.
- **Render free tier cold starts** — see gotcha #9.
- **Groq free-tier rate limits** — fine for demo/normal use; `LLM_PROVIDER=ollama` is the documented fallback.
- **MongoDB Atlas free tier caps at 512MB** — mitigated by storing only metadata in Mongo.
- **DOCX extraction has no true "page" concept** — approximated via nearest preceding heading.
- **Groq model availability changes over time** — the configured `GROQ_MODEL` should be periodically checked against Groq's current model list.

---

## Possible Future Improvements

- Background job queue for uploads and long-running AI calls.
- Configurable retrieval `top_k` and a similarity-score threshold exposed in the UI.
- Streaming chat responses instead of waiting for the full answer.
- Multi-file batch upload.
- Team/shared knowledge bases (currently strictly per-user).
- An AI evaluation dataset with tracked retrieval/answer-quality metrics over time.
- Automated integration tests against a real (not embedded) Qdrant instance, to catch Qdrant Cloud-specific behavior (like the payload index requirement) before deployment rather than after.