from uuid import uuid4

from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.models.schemas import ChunkMetadata, ChunkOut
from app.vectorstore.qdrant_client import (
    delete_collection,
    delete_document_vectors,
    ensure_collection,
    get_client,
    search,
    upsert_chunks,
)


def make_chunk(text, chunk_id=None, document_id="doc-1", index=0, page=None):
    return ChunkOut(
        text=text,
        metadata=ChunkMetadata(
            document_id=document_id,
            document_name="policy.pdf",
            knowledge_base_id="kb-1",
            chunk_id=chunk_id or str(uuid4()),
            chunk_index=index,
            page=page,
        ),
    )


def test_ensure_collection_is_idempotent():
    ensure_collection("kb_test_a", vector_size=EMBEDDING_DIM)
    ensure_collection("kb_test_a", vector_size=EMBEDDING_DIM)  # should not raise
    names = {c.name for c in get_client().get_collections().collections}
    assert "kb_test_a" in names


def test_upsert_and_search_roundtrip():
    ensure_collection("kb_test_b", vector_size=EMBEDDING_DIM)

    chunks = [
        make_chunk("Eligibility requires a minimum aggregate of 60 percent.", index=0, page=4),
        make_chunk("Internship applications open every March.", index=1, page=5),
    ]
    vectors = embed_texts([c.text for c in chunks])
    upsert_chunks("kb_test_b", chunks, vectors)

    # Query with the exact same text as one of the stored chunks — with the
    # deterministic-hash provider this reproduces the identical vector, so
    # it's a clean way to verify the round trip without needing real
    # semantic understanding.
    query_vector = embed_texts(["Eligibility requires a minimum aggregate of 60 percent."])[0]
    results = search("kb_test_b", query_vector, top_k=2)

    assert len(results) == 2
    assert results[0].payload["document_id"] == "doc-1"
    assert results[0].payload["page"] == 4
    assert results[0].score > results[1].score


def test_search_is_scoped_to_its_own_collection():
    ensure_collection("kb_test_c1", vector_size=EMBEDDING_DIM)
    ensure_collection("kb_test_c2", vector_size=EMBEDDING_DIM)

    chunk = make_chunk("Only visible in collection one.")
    vector = embed_texts([chunk.text])[0]
    upsert_chunks("kb_test_c1", [chunk], [vector])

    results_in_c2 = search("kb_test_c2", vector, top_k=5)
    assert results_in_c2 == []


def test_delete_document_vectors_removes_only_that_document():
    ensure_collection("kb_test_d", vector_size=EMBEDDING_DIM)
    chunks = [
        make_chunk("From document one.", document_id="doc-1"),
        make_chunk("From document two.", document_id="doc-2"),
    ]
    vectors = embed_texts([c.text for c in chunks])
    upsert_chunks("kb_test_d", chunks, vectors)

    delete_document_vectors("kb_test_d", "doc-1")

    remaining = search("kb_test_d", vectors[0], top_k=10)
    remaining_doc_ids = {r.payload["document_id"] for r in remaining}
    assert "doc-1" not in remaining_doc_ids
    assert "doc-2" in remaining_doc_ids


def test_delete_collection_removes_it_entirely():
    ensure_collection("kb_test_e", vector_size=EMBEDDING_DIM)
    delete_collection("kb_test_e")
    names = {c.name for c in get_client().get_collections().collections}
    assert "kb_test_e" not in names


def test_delete_collection_on_nonexistent_collection_does_not_raise():
    delete_collection("kb_never_existed")
