# ANORA — Backend

Node.js + Express API for ANORA. This is Phase 2 of the build: server
foundation, MongoDB models, JWT authentication, and clean API structure —
per the roadmap in `ANORA-phase0-planning.md`.

## Run locally

```bash
npm install
cp .env.example .env
# Point MONGO_URI at a local mongod or a MongoDB Atlas free-tier cluster.
npm run dev
```

Without a reachable `MONGO_URI`, the server still starts and `/health`
still responds — every other route will return a clean error until the
database is connected. This is intentional (see `src/server.js`), so the
API structure can be inspected even before Atlas is wired up.

## Run tests

```bash
npm test
```

The suite covers two things without needing a live server or MongoDB:
- `src/tests/app.smoke.test.js` — health check, 404 handling, request
  validation, and JWT auth-middleware rejection across every route
  (auth, knowledge bases, documents, chat, AI features).
- `src/tests/storage.test.js` — real disk I/O against the local storage
  provider (write, read back, delete, confirm deletion).

Tests that need a real database (registration/login round-trips,
ownership checks, the full upload → status → delete lifecycle, chat
message persistence) are the next thing to add once a test database
(local `mongod` or `mongodb-memory-server`) is available in your dev
environment — this sandbox had no local MongoDB and no network access to
install one, so those paths are implemented but not yet exercised by an
automated test.

There's a separate real integration check, `scripts/manual-ai-service-check.mjs`,
which needs a live `ai-service` running on `AI_SERVICE_URL` — it exercises
the actual HTTP calls to indexing, RAG querying, summarization, and
comparison, end to end, no mocks. Run it with:
```bash
AI_SERVICE_URL=http://localhost:8000 node scripts/manual-ai-service-check.mjs
```

## What's real vs. stubbed in this phase

**Fully implemented:**
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- Full Knowledge Base CRUD (`/api/knowledge-bases`) with per-user ownership
  enforced at the MongoDB query level (see `middleware/ownership.middleware.js`).
  Deleting a KB also deletes its documents' files and its entire Qdrant
  collection (via the AI service).
- Full document management (`/api/documents`) — upload, listing (search +
  KB filter), status, delete, ownership-checked file streaming. Storage is
  behind a swappable `StorageProvider` interface (`src/services/storage/`).
- **Upload actually indexes the document.** Status moves through the real
  lifecycle: `UPLOADING` → `INDEXING` → `READY`/`FAILED`, via the AI
  service. `chunkCount`/`pageCount` come from its real response.
- **Chat (`/api/chat`) runs real RAG.** Every message calls the AI
  service's `/internal/query`, gets a grounded answer with source
  citations (or an honest "not enough information" response), and
  persists both the user and assistant `Message` — including citations —
  to MongoDB. Full conversation CRUD (list, get with messages, delete).
- **AI features (`/api/ai/summarize`, `/api/ai/compare`) are real.** Both
  check that the target document(s) belong to the user and are `READY`
  before calling the AI service, so you get a clear 400 ("isn't ready
  yet") instead of a confusing downstream error if you try to summarize
  something still indexing.
- `GET /api/usage/summary` — real data: `documentsProcessed` increments on
  successful indexing, `questionsAsked` increments on every chat message.
- Central error handling, request validation, rate limiting on auth routes,
  Helmet security headers, CORS locked to the configured frontend origin.

**Nothing left stubbed.** Every route from the original API design in
`docs/ANORA-phase0-planning.md` is now a real implementation — the
`notImplementedYet` helper used in earlier phases has been removed since
nothing references it anymore.

**Design choice worth flagging:** indexing and RAG queries both run
*synchronously* inside their request — no background job queue (e.g.
BullMQ + Redis). Simplest correct option within the project's ₹0/no
extra-infra constraint, fine at student-project volumes; a queue is the
natural upgrade path for larger files, many concurrent uploads, or slow
LLM responses. Noted as a known limitation, not an oversight.

**Honest testing limitation:** this sandbox has no local MongoDB, so
authenticated round-trips can't run as an automated Node test here. I did
verify the full AI service integration for real, though — including RAG,
summarization, and comparison — by booting the actual FastAPI server and
having `aiService.client.js` call it live over HTTP end-to-end. Re-run it
yourself with `AI_SERVICE_URL=http://localhost:8000 node
scripts/manual-ai-service-check.mjs` once `ai-service` is running.

## Project structure

```
src/
├── config/       # env loader, MongoDB connection
├── models/       # User, KnowledgeBase, Document, Conversation, Message, Usage
├── controllers/  # auth, knowledgeBase, document, chat, ai
├── routes/       # one file per resource, mounted in routes/index.js
├── middleware/    # auth (JWT), ownership, upload/validation, rate limiting, error handling
├── services/
│   ├── storage/      # swappable StorageProvider (local disk now, cloud later)
│   └── aiService.client.js   # calls the Python AI service (index, query, summarize, compare, cleanup)
├── utils/         # ApiError, asyncHandler, token, logger
├── tests/         # Supertest smoke tests + storage provider unit tests
├── scripts/
│   └── manual-ai-service-check.mjs   # real end-to-end check against a live AI service
├── app.js         # Express app (no side effects — safe to import in tests)
└── server.js      # connects to MongoDB, then binds the port
```

## Security notes

- Passwords are never stored or logged in plaintext — `User.password` is a
  virtual, hashed via a `pre('save')` hook into `passwordHash`
  (`select: false` by default, and stripped from `toJSON` output as a
  second layer of defense).
- Login returns the same error message for "no such user" and "wrong
  password," so the response can't be used to enumerate registered emails.
- Every knowledge-base route filters by `{ _id, userId }` at the query
  level — a user can't distinguish "not yours" from "doesn't exist."
- The global error handler never returns a stack trace to the client, in
  any environment.
