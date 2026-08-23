from uuid import uuid4

from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.models.schemas import ChunkMetadata, ChunkOut
from app.rag.qa import NOT_ENOUGH_INFO_MESSAGE, answer_question
from app.vectorstore.qdrant_client import ensure_collection, upsert_chunks


def make_chunk(text, document_id="doc-1", document_name="policy.pdf", index=0, page=None):
    return ChunkOut(
        text=text,
        metadata=ChunkMetadata(
            document_id=document_id,
            document_name=document_name,
            knowledge_base_id="kb-1",
            chunk_id=str(uuid4()),
            chunk_index=index,
            page=page,
        ),
    )


def test_answer_exists_returns_grounded_answer_with_citation():
    ensure_collection("kb_qa_test_1", vector_size=EMBEDDING_DIM)
    chunk = make_chunk("Eligibility requires a minimum aggregate of 60 percent.", page=4)
    vector = embed_texts([chunk.text])[0]
    upsert_chunks("kb_qa_test_1", [chunk], [vector])

    result = answer_question(
        "Eligibility requires a minimum aggregate of 60 percent.", "kb_qa_test_1"
    )

    assert result.grounded is True
    assert "60 percent" in result.answer
    assert len(result.sources) == 1
    assert result.sources[0].document_name == "policy.pdf"
    assert result.sources[0].page == 4
    assert result.sources[0].score > 0


def test_answer_does_not_exist_returns_honest_not_found_message():
    # Nothing was ever indexed into this collection.
    result = answer_question("What is the meaning of life?", "kb_qa_test_empty")

    assert result.grounded is False
    assert result.answer == NOT_ENOUGH_INFO_MESSAGE
    assert result.sources == []


def test_answer_question_returns_multiple_ranked_sources():
    ensure_collection("kb_qa_test_2", vector_size=EMBEDDING_DIM)
    chunks = [
        make_chunk("Placement eligibility requires 60 percent aggregate.", page=4),
        make_chunk("Internship applications open every March.", page=5),
    ]
    vectors = embed_texts([c.text for c in chunks])
    upsert_chunks("kb_qa_test_2", chunks, vectors)

    result = answer_question("Placement eligibility requires 60 percent aggregate.", "kb_qa_test_2", top_k=2)

    assert result.grounded is True
    assert len(result.sources) == 2
    # Ranked by relevance — the exact-match chunk should score highest.
    assert result.sources[0].score >= result.sources[1].score


def test_excerpt_is_truncated_for_long_chunks():
    ensure_collection("kb_qa_test_3", vector_size=EMBEDDING_DIM)
    long_text = "This eligibility clause repeats itself. " * 20
    chunk = make_chunk(long_text)
    vector = embed_texts([chunk.text])[0]
    upsert_chunks("kb_qa_test_3", [chunk], [vector])

    result = answer_question(long_text, "kb_qa_test_3")
    assert len(result.sources[0].excerpt) <= 300
