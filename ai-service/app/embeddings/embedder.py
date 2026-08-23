"""Embedding generation.

Two providers, selected via EMBEDDING_PROVIDER:

- "sentence-transformers" (default, real): loads a local Sentence-Transformers
  model (default all-MiniLM-L6-v2, 384 dimensions). This is what production
  and normal local development use.
- "deterministic-hash": an offline-only fallback that turns text into a
  reproducible pseudo-vector via a hash — NOT semantically meaningful
  (similar texts do not get similar vectors). It exists purely so the
  indexing/retrieval plumbing (Qdrant upsert, search, dimension handling)
  can be exercised by the test suite in environments with no network path
  to Hugging Face to download real model weights, such as the sandbox this
  project was built in. Never use it outside of tests.
"""
import hashlib
import os
from functools import lru_cache

EMBEDDING_DIM = 384  # matches all-MiniLM-L6-v2's output size

def _huggingface_api_embed(texts: list[str]) -> list[list[float]]:
    import httpx

    token = os.environ["HUGGINGFACE_API_TOKEN"]
    model = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    response = httpx.post(
        f"https://router.huggingface.co/hf-inference/models/{model}/pipeline/feature-extraction",
        headers={"Authorization": f"Bearer {token}"},
        json={"inputs": texts, "options": {"wait_for_model": True}},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()


def _deterministic_hash_embedding(text: str) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    repeats = (EMBEDDING_DIM // len(digest)) + 1
    raw = (digest * repeats)[:EMBEDDING_DIM]
    return [(b / 127.5) - 1.0 for b in raw]  # map byte range [0,255] -> [-1,1]


@lru_cache(maxsize=1)
def _load_model(model_name: str):
    from sentence_transformers import SentenceTransformer  # imported lazily —

    # only required when this provider is actually used, so the rest of the
    # service can run/test without the (large) sentence-transformers/torch
    # dependency installed.
    return SentenceTransformer(model_name)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    provider = os.getenv("EMBEDDING_PROVIDER", "sentence-transformers")

    if provider == "deterministic-hash":
        return [_deterministic_hash_embedding(t) for t in texts]

    if provider == "huggingface-api":
        return _huggingface_api_embed(texts)

    if provider == "sentence-transformers":
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        model = _load_model(model_name)
        return model.encode(list(texts), normalize_embeddings=True).tolist()

    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {provider}")
