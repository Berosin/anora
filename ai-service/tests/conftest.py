import os

# Set before any app module is imported, so every test in the suite runs
# fully offline: no Hugging Face download, no real Qdrant server needed.
# See app/embeddings/embedder.py and app/vectorstore/qdrant_client.py for
# what these control and why.
os.environ.setdefault("EMBEDDING_PROVIDER", "deterministic-hash")
os.environ.setdefault("QDRANT_LOCAL_PATH", ":memory:")
os.environ.setdefault("LLM_PROVIDER", "offline-extractive")

import pytest

from app.vectorstore.qdrant_client import reset_client


@pytest.fixture(autouse=True)
def _fresh_vector_store():
    """Each test gets an empty in-memory Qdrant instance, so collection
    state never leaks between tests."""
    reset_client()
    yield
    reset_client()
