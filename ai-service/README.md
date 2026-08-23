# ANORA — AI Service

Python + FastAPI service for document processing, embeddings, RAG, and
AI features (summarization, comparison).

This covers Phases 4–7 of the ANORA build: text extraction, cleaning,
chunking, embedding generation, vector storage, retrieval-augmented
question answering with citations, and document summarization/comparison
— all exposed over an internal API the Node backend calls.

## Run locally

```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Interactive API docs: `http://localhost:8000/docs`.

No external services are required by default: with no `QDRANT_URL` set,
it falls back to an embedded local Qdrant instance. Real embeddings via
`sentence-transformers` download a model from Hugging Face on first use
(needs network access once). Real question-answering needs an LLM —
`LLM_PROVIDER=groq` (default) needs a free `GROQ_API_KEY` from
console.groq.com; `LLM_PROVIDER=ollama` uses a locally running Ollama
server instead.

## Run tests

```bash
pytest -v
```

**70 tests, all passing, fully offline** — no Hugging Face download, no
real Qdrant server, no real LLM API call, and nothing mocked at the level
of the actual logic being tested:

- `test_extract_*.py`, `test_chunker_and_cleaner.py`, `test_pipeline.py` — Phase 4 (extraction/chunking).
- `test_embedder.py`, `test_vectorstore.py`, `test_indexing.py` — Phase 5 (embeddings/Qdrant).
- `test_llm_provider.py`, `test_prompt_builder.py`, `test_retriever.py`, `test_qa.py` — Phase 6 (RAG). `test_qa.py` specifically covers the three cases the project spec calls out: an answer that exists, an answer that doesn't (honest "not enough information," not a guess), and multi-source ranking.
- `test_summarize.py`, `test_compare.py` — Phase 7 (AI features).
- `test_api*.py` — every endpoint above, exercised through the actual FastAPI app via `TestClient`, including error paths.

**How offline testing works:** `tests/conftest.py` sets
`EMBEDDING_PROVIDER=deterministic-hash` and `LLM_PROVIDER=offline-extractive`
before any app module is imported. Neither is semantically real — the
hash embedding doesn't encode meaning, and the offline LLM provider
returns extracted text rather than generating anything — but together
they let every piece of *plumbing* (retrieval, prompt construction,
citation attachment, grounded-vs-not-grounded branching, chunk ordering
for summarization, cross-document comparison) be verified without
network access to Hugging Face or any LLM API. Production always
defaults to `EMBEDDING_PROVIDER=sentence-transformers` and
`LLM_PROVIDER=groq`.

I additionally ran real end-to-end checks outside the test suite: booted
the actual `uvicorn` server and had the Node backend's real
`aiService.client.js` call it live over HTTP — index two documents, ask a
question that's answered, ask a question against an empty knowledge base
(confirming the honest "not enough info" path), summarize a document, and
compare the two documents. All of it worked against the real running
service. See `backend/scripts/manual-ai-service-check.mjs`.

## What's implemented

- `POST /internal/process-document` — extraction + chunking only (Phase 4).
- `POST /internal/index-document` — full pipeline: extract → clean → chunk
  → embed → store in Qdrant (Phase 5). **The Node backend calls this on
  every upload.**
- `DELETE /internal/collections/{name}/documents/{id}`,
  `DELETE /internal/collections/{name}` — vector cleanup (Phase 5).
- `POST /internal/query` — retrieval-augmented answering with source
  citations, or an honest "not enough information" response when nothing
  relevant is found (Phase 6). **The Node backend calls this on every
  chat message.**
- `POST /internal/summarize` — fetches all of a document's indexed chunks
  (in order) and generates a structured summary (Overview, Key Points,
  Important Requirements, Important Dates, Main Conclusions, Important
  Terminology) (Phase 7).
- `POST /internal/compare` — fetches both documents' indexed chunks and
  generates a comparison covering additions, removals, and changed
  requirements/dates/numbers (Phase 7).
- A swappable LLM provider (`app/models/llm_provider.py`): Groq (default)
  or Ollama for real use, with the offline-extractive test double
  documented above — the same swap-without-touching-callers pattern used
  for storage (backend) and embeddings.

## Project structure

```
app/
├── api/
│   ├── process.py             # POST /internal/process-document (Phase 4)
│   ├── index.py                # POST /internal/index-document + cleanup (Phase 5)
│   ├── query.py                 # POST /internal/query (Phase 6)
│   └── ai_features.py            # POST /internal/summarize, /internal/compare (Phase 7)
├── document_processing/        # extraction, cleaning, chunking (Phase 4)
├── embeddings/
│   └── embedder.py             # sentence-transformers (real) + deterministic-hash (test-only)
├── vectorstore/
│   └── qdrant_client.py         # collection mgmt, upsert, search, scroll-by-document, delete
├── rag/
│   ├── indexing.py              # Phase 5: pipeline -> embed -> store
│   ├── retriever.py             # Phase 6: embed question -> search
│   ├── prompt_builder.py         # Phase 6/7: anti-hallucination + summary + compare prompts
│   ├── qa.py                     # Phase 6: retrieve -> prompt -> generate -> cite
│   ├── summarize.py              # Phase 7
│   └── compare.py                # Phase 7
├── models/
│   ├── schemas.py                # Pydantic request/response models
│   └── llm_provider.py           # Groq / Ollama / offline-extractive
tests/                            # 70 tests, see above
main.py                           # FastAPI app entry point
```
