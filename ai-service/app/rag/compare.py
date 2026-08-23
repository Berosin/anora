from app.models.llm_provider import get_llm_provider
from app.models.schemas import CompareResponse
from app.rag.prompt_builder import build_compare_prompt
from app.vectorstore.qdrant_client import get_document_chunks


class ComparisonError(Exception):
    """Raised when one or both documents have no indexed content to compare."""


def compare_documents(
    *,
    collection_name_a: str,
    document_id_a: str,
    document_name_a: str,
    collection_name_b: str,
    document_id_b: str,
    document_name_b: str,
) -> CompareResponse:
    chunks_a = get_document_chunks(collection_name_a, document_id_a)
    chunks_b = get_document_chunks(collection_name_b, document_id_b)

    if not chunks_a or not chunks_b:
        missing = document_name_a if not chunks_a else document_name_b
        raise ComparisonError(
            f'"{missing}" has no indexed content yet — it may still be processing, or indexing may have failed.'
        )

    text_a = "\n\n".join(c["text"] for c in chunks_a)
    text_b = "\n\n".join(c["text"] for c in chunks_b)
    prompt = build_compare_prompt(document_name_a, text_a, document_name_b, text_b)

    provider = get_llm_provider()
    # The offline test provider only understands a single "top chunk" hint —
    # give it something from both documents so a comparison test can still
    # assert on content from each side, without pretending it performed a
    # real diff.
    top_hint = f"{document_name_a}: {chunks_a[0]['text']}\n\n{document_name_b}: {chunks_b[0]['text']}"
    comparison_text = provider.generate(prompt, top_chunk_text=top_hint)

    return CompareResponse(document_a=document_name_a, document_b=document_name_b, comparison=comparison_text)
