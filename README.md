# ANORA

**From Information to Insight**

An AI-powered cloud knowledge intelligence platform: upload documents,
automatically process and understand them, ask natural-language questions,
and get grounded answers with source citations via Retrieval-Augmented
Generation (RAG).

This repo is being built incrementally, phase by phase — see
`docs/ANORA-phase0-planning.md` for the full architecture, technology
decisions, database schema, API design, and roadmap.

## Structure

```
anora/
├── frontend/     # React + Vite + Tailwind — Phases 1 ✅ / 3 ✅ / 6 ✅ / 7 ✅
├── backend/      # Node.js + Express + MongoDB — Phases 2 ✅ / 3 ✅ / 5 ✅ / 6 ✅ / 7 ✅
├── ai-service/   # Python + FastAPI — Phases 4 ✅ / 5 ✅ / 6 ✅ / 7 ✅
├── docs/         # Architecture and planning docs
├── docker-compose.yml   # Qdrant, for closer-to-production local dev
└── README.md
```

**As of Phase 7, ANORA is functionally complete end-to-end**: register →
log in → create a knowledge base → upload a document → it gets extracted,
chunked, embedded, and indexed → ask questions and get grounded answers
with citations → summarize a document → compare two documents. Phases
8–12 (deployment, security audit, broader testing, AI evaluation,
finalization/docs) build on top of this working application rather than
adding new user-facing functionality.

## Progress

| Phase | Scope | Status |
|---|---|---|
| 0 | Planning & architecture | ✅ Done — `docs/ANORA-phase0-planning.md` |
| 1 | Frontend foundation (routing, layout, landing, auth screens, dashboard shell) | ✅ Done — `frontend/` |
| 2 | Backend foundation (Express, Mongo models, JWT auth, error handling) | ✅ Done — `backend/` |
| 3 | Document management (upload, storage, status tracking, delete) | ✅ Done — `backend/` (documents API) + `frontend/` (Knowledge Bases + Documents pages) |
| 4 | AI document processing (extraction, cleaning, chunking) | ✅ Done — `ai-service/` |
| 5 | Embeddings + vector database | ✅ Done — `ai-service/` (embeddings + Qdrant) + `backend/` (wired to actually call it) |
| 6 | RAG (retrieval, prompt construction, LLM, citations) | ✅ Done — `ai-service/` (retrieval/prompt/LLM) + `backend/` (chat) + `frontend/` (Chat page) |
| 7 | AI features (chat, summarization, comparison) | ✅ Done — chat landed with Phase 6; summarize + compare done across all three services |
| 8 | Cloud deployment | Not started |
| 9 | Security audit | Not started |
| 10 | Testing | Ongoing (backend smoke tests in place; more added per phase) |
| 11 | AI evaluation | Not started |
| 12 | Finalization (docs, diagrams, screenshots, presentation) | Not started |

## Quick start

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Backend**
```bash
cd backend
npm install
cp .env.example .env   # point MONGO_URI at a local mongod or Atlas free tier
npm run dev
```

The backend runs and serves `/health` even without MongoDB configured;
every other route returns a clean error until `MONGO_URI` is set correctly.
See `backend/README.md` for what's fully implemented vs. intentionally
stubbed at this stage.

**AI service**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Handles extraction, chunking, embedding, vector storage, RAG (retrieval +
grounded answer generation with citations), summarization, and document
comparison. **The backend calls this for every upload, chat message,
summary, and comparison.** No external services are required to run it
locally by default (embedded Qdrant fallback); real embeddings need
network access to Hugging Face once, and real answers need an LLM API key
(Groq, free tier) or a local Ollama server. See `ai-service/README.md`
for full details, including how the 70-test suite runs fully offline.

## Constraint

Target budget: **₹0**. Every technology choice prioritizes free tiers,
open-source software, and local development — documented in
`docs/ANORA-phase0-planning.md`.
