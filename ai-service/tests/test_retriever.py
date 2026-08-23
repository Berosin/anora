from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.models.schemas import ChunkMetadata, ChunkOut
from app.rag.retriever import retrieve
from app.vectorstore.qdrant_client import ensure_collection, upsert_chunks


def make_chunk(text, document_id="doc-1", index=0, page=None):
    from uuid import uuid4

    return ChunkOut(
        text=text,
        metadata=ChunkMetadata(
            document_id=document_id,
            document_name="policy.pdf",
            knowledge_base_id="kb-1",
            chunk_id=str(uuid4()),
            chunk_index=index,
            page=page,
        ),
    )


def test_retrieve_returns_empty_list_for_nonexistent_collection():
    results = retrieve("any question", "kb_never_indexed", top_k=5)
    assert results == []


def test_retrieve_returns_empty_list_for_blank_question():
    ensure_collection("kb_retriever_test_1", vector_size=EMBEDDING_DIM)
    assert retrieve("", "kb_retriever_test_1") == []
    assert retrieve("   ", "kb_retriever_test_1") == []


def test_retrieve_finds_relevant_chunks():
    ensure_collection("kb_retriever_test_2", vector_size=EMBEDDING_DIM)
    chunks = [make_chunk("Eligibility requires 60 percent aggregate.", page=4)]
    vectors = embed_texts([c.text for c in chunks])
    upsert_chunks("kb_retriever_test_2", chunks, vectors)

    results = retrieve("Eligibility requires 60 percent aggregate.", "kb_retriever_test_2")
    assert len(results) == 1
    assert results[0].payload["page"] == 4
