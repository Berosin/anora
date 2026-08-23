from uuid import uuid4

import pytest

from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.models.schemas import ChunkMetadata, ChunkOut
from app.rag.compare import ComparisonError, compare_documents
from app.vectorstore.qdrant_client import ensure_collection, upsert_chunks


def make_chunk(text, document_id, document_name, index=0):
    return ChunkOut(
        text=text,
        metadata=ChunkMetadata(
            document_id=document_id,
            document_name=document_name,
            knowledge_base_id="kb-1",
            chunk_id=str(uuid4()),
            chunk_index=index,
        ),
    )


def test_compare_documents_uses_content_from_both_versions():
    ensure_collection("kb_compare_test_1", vector_size=EMBEDDING_DIM)

    chunk_a = make_chunk("Minimum aggregate required is 55 percent.", "doc-v1", "policy_2025.pdf")
    chunk_b = make_chunk("Minimum aggregate required is 60 percent.", "doc-v2", "policy_2026.pdf")
    vectors = embed_texts([chunk_a.text, chunk_b.text])
    upsert_chunks("kb_compare_test_1", [chunk_a, chunk_b], vectors)

    result = compare_documents(
        collection_name_a="kb_compare_test_1",
        document_id_a="doc-v1",
        document_name_a="policy_2025.pdf",
        collection_name_b="kb_compare_test_1",
        document_id_b="doc-v2",
        document_name_b="policy_2026.pdf",
    )

    assert result.document_a == "policy_2025.pdf"
    assert result.document_b == "policy_2026.pdf"
    # offline-extractive echoes both top-chunk hints, so both versions'
    # real content should be traceable in the output.
    assert "55 percent" in result.comparison
    assert "60 percent" in result.comparison


def test_compare_documents_raises_when_one_side_is_unindexed():
    ensure_collection("kb_compare_test_2", vector_size=EMBEDDING_DIM)
    chunk_a = make_chunk("Some content.", "doc-exists", "exists.pdf")
    vector = embed_texts([chunk_a.text])
    upsert_chunks("kb_compare_test_2", [chunk_a], vector)

    with pytest.raises(ComparisonError):
        compare_documents(
            collection_name_a="kb_compare_test_2",
            document_id_a="doc-exists",
            document_name_a="exists.pdf",
            collection_name_b="kb_compare_test_2",
            document_id_b="doc-missing",
            document_name_b="missing.pdf",
        )
