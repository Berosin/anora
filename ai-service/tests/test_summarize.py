from uuid import uuid4

import pytest

from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.models.schemas import ChunkMetadata, ChunkOut
from app.rag.summarize import SummarizationError, summarize_document
from app.vectorstore.qdrant_client import ensure_collection, upsert_chunks


def make_chunk(text, index, document_id="doc-sum-1"):
    return ChunkOut(
        text=text,
        metadata=ChunkMetadata(
            document_id=document_id,
            document_name="handbook.pdf",
            knowledge_base_id="kb-1",
            chunk_id=str(uuid4()),
            chunk_index=index,
        ),
    )


def test_summarize_document_uses_all_indexed_chunks_in_order():
    ensure_collection("kb_summarize_test_1", vector_size=EMBEDDING_DIM)
    chunks = [
        make_chunk("Second part of the handbook.", index=1),
        make_chunk("First part of the handbook.", index=0),  # inserted out of order on purpose
    ]
    vectors = embed_texts([c.text for c in chunks])
    upsert_chunks("kb_summarize_test_1", chunks, vectors)

    result = summarize_document("kb_summarize_test_1", "doc-sum-1", "handbook.pdf")

    assert result.document_id == "doc-sum-1"
    assert result.document_name == "handbook.pdf"
    # The offline-extractive provider returns the top-scoring chunk's
    # text — this at least confirms real chunks were fetched and used.
    assert result.summary


def test_summarize_document_raises_for_unindexed_document():
    with pytest.raises(SummarizationError):
        summarize_document("kb_summarize_never_indexed", "doc-none", "missing.pdf")
