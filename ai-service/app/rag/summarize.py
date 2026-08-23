from app.models.llm_provider import get_llm_provider
from app.models.schemas import SummarizeResponse
from app.rag.prompt_builder import build_summary_prompt
from app.vectorstore.qdrant_client import get_document_chunks


class SummarizationError(Exception):
    """Raised when a document has no indexed content to summarize."""


def summarize_document(collection_name: str, document_id: str, document_name: str) -> SummarizeResponse:
    chunks = get_document_chunks(collection_name, document_id)
    if not chunks:
        raise SummarizationError(
            "This document has no indexed content yet — it may still be processing, or indexing may have failed."
        )

    full_text = "\n\n".join(c["text"] for c in chunks)
    prompt = build_summary_prompt(document_name, full_text)

    provider = get_llm_provider()
    summary_text = provider.generate(prompt, top_chunk_text=chunks[0]["text"])

    return SummarizeResponse(document_id=document_id, document_name=document_name, summary=summary_text)
