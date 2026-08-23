from app.models.llm_provider import get_llm_provider
from app.models.schemas import QueryResponse, SourceOut
from app.rag.prompt_builder import build_prompt
from app.rag.retriever import retrieve

NOT_ENOUGH_INFO_MESSAGE = (
    "The uploaded documents don't contain enough information to answer this question."
)

EXCERPT_MAX_CHARS = 300


def answer_question(question: str, collection_name: str, top_k: int = 5) -> QueryResponse:
    results = retrieve(question, collection_name, top_k=top_k)

    if not results:
        # No retrieved context at all — the honest answer is "I don't
        # know," per the anti-hallucination requirement, not a call to
        # the LLM with nothing to ground it.
        return QueryResponse(answer=NOT_ENOUGH_INFO_MESSAGE, sources=[], grounded=False)

    prompt = build_prompt(question, results)
    provider = get_llm_provider()
    answer_text = provider.generate(prompt, top_chunk_text=results[0].payload["text"])

    sources = [
        SourceOut(
            document_id=r.payload["document_id"],
            document_name=r.payload["document_name"],
            page=r.payload.get("page"),
            section=r.payload.get("section"),
            excerpt=r.payload["text"][:EXCERPT_MAX_CHARS],
            score=r.score,
        )
        for r in results
    ]

    return QueryResponse(answer=answer_text, sources=sources, grounded=True)
