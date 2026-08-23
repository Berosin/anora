"""Thin wrapper around qdrant-client.

Connection strategy:
- QDRANT_URL set -> real Qdrant instance (Qdrant Cloud free tier in
  production, or a local `docker-compose up qdrant` during development).
- QDRANT_URL unset -> an embedded local instance requiring no server at
  all (on-disk at QDRANT_LOCAL_PATH, or fully in-memory if that's set to
  ":memory:"). This is what the test suite uses, and it's genuinely
  useful for a from-scratch local dev setup with nothing else running.

Every knowledge base gets its own collection (named by the backend as
`kb_<knowledgeBaseId>`, passed in on every call here) — this is what
keeps one user's documents out of another's retrieval results, and one
knowledge base's documents out of another's within the same account.
"""
import os

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        url = os.getenv("QDRANT_URL")
        if url:
            _client = QdrantClient(url=url, api_key=os.getenv("QDRANT_API_KEY"))
        else:
            path = os.getenv("QDRANT_LOCAL_PATH", "./qdrant_data")
            _client = QdrantClient(path=path)
    return _client


def reset_client() -> None:
    """Test-only. Drops the cached client so the next get_client() call
    builds a fresh one — needed between tests when QDRANT_LOCAL_PATH is
    ":memory:", so each test starts from an empty store."""
    global _client
    _client = None


def ensure_collection(collection_name: str, vector_size: int) -> None:
    client = get_client()
    existing = {c.name for c in client.get_collections().collections}
    if collection_name not in existing:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )


def upsert_chunks(collection_name: str, chunks, vectors: list[list[float]]) -> None:
    """`chunks` is a list of app.models.schemas.ChunkOut."""
    points = [
        PointStruct(
            id=chunk.metadata.chunk_id,
            vector=vector,
            payload={
                "text": chunk.text,
                "document_id": chunk.metadata.document_id,
                "document_name": chunk.metadata.document_name,
                "knowledge_base_id": chunk.metadata.knowledge_base_id,
                "chunk_index": chunk.metadata.chunk_index,
                "page": chunk.metadata.page,
                "section": chunk.metadata.section,
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]
    get_client().upsert(collection_name=collection_name, points=points)


def search(collection_name: str, query_vector: list[float], top_k: int = 5):
    """Semantic similarity search, scoped to one knowledge base's collection.

    Returns an empty list rather than raising if the collection doesn't
    exist yet — a knowledge base with no successfully indexed documents
    is a normal state, not an error, and callers (the retriever) treat
    "no results" as legitimate input to the "not enough information"
    response path.
    """
    client = get_client()
    if collection_name not in {c.name for c in client.get_collections().collections}:
        return []
    response = client.query_points(collection_name=collection_name, query=query_vector, limit=top_k)
    return response.points


def delete_document_vectors(collection_name: str, document_id: str) -> None:
    client = get_client()
    if collection_name not in {c.name for c in client.get_collections().collections}:
        return
    client.create_payload_index(
        collection_name=collection_name,
        field_name="document_id",
        field_schema="keyword",
    )
    client.delete(
        collection_name=collection_name,
        points_selector=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]),
    )


def get_document_chunks(collection_name: str, document_id: str) -> list[dict]:
    client = get_client()
    if collection_name not in {c.name for c in client.get_collections().collections}:
        return []

    # Qdrant Cloud requires an explicit payload index before a field can
    # be used in a filter (embedded/local Qdrant is more lenient, which is
    # why this wasn't caught until deploying against a real cluster).
    # Creating an index that already exists is a safe no-op — this makes
    # existing collections (indexed before this fix) work immediately,
    # with no need to re-upload documents.
    client.create_payload_index(
        collection_name=collection_name,
        field_name="document_id",
        field_schema="keyword",
    )

    points, _ = client.scroll(
        collection_name=collection_name,
        scroll_filter=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]),
        limit=1000,
        with_payload=True,
    )
    ordered = sorted(points, key=lambda p: p.payload.get("chunk_index", 0))
    return [{"text": p.payload["text"], "chunk_index": p.payload.get("chunk_index", 0)} for p in ordered]

def delete_collection(collection_name: str) -> None:
    """Used when an entire knowledge base is deleted."""
    client = get_client()
    if collection_name in {c.name for c in client.get_collections().collections}:
        client.delete_collection(collection_name)
