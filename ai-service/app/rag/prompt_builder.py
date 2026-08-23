"""Prompt construction — implements the anti-hallucination safeguards
required by the project spec: answer only from retrieved context, say so
explicitly when context is insufficient, be concise, cite sources,
distinguish stated fact from inference.
"""

SYSTEM_INSTRUCTIONS = """You are ANORA, a document assistant. Answer the user's question using ONLY the numbered sources below. Follow these rules strictly:

1. Base your answer only on the provided sources — never invent information that isn't in them.
2. If the sources don't contain enough information to answer, say so explicitly rather than guessing.
3. Be concise. Don't pad the answer with restated context.
4. When you state something from a source, it should be clearly traceable to one of the numbered sources.
5. If part of your answer is a reasonable inference rather than a direct statement in a source, say so explicitly (e.g. "the sources don't state this directly, but...").
"""


def format_location(payload: dict) -> str:
    if payload.get("page") is not None:
        return f"page {payload['page']}"
    if payload.get("section"):
        return payload["section"]
    return f"chunk {payload.get('chunk_index', 0) + 1}"


def build_context_block(results) -> str:
    blocks = []
    for i, result in enumerate(results, start=1):
        location = format_location(result.payload)
        blocks.append(
            f"[Source {i}: {result.payload['document_name']} — {location}]\n{result.payload['text']}"
        )
    return "\n\n".join(blocks)


def build_prompt(question: str, results) -> str:
    context = build_context_block(results)
    return (
        f"{SYSTEM_INSTRUCTIONS}\n\n"
        f"--- Sources ---\n{context}\n\n"
        f"--- Question ---\n{question}\n\n"
        f"--- Answer ---\n"
    )


SUMMARY_INSTRUCTIONS = """You are ANORA. Summarize the document below using ONLY the text provided — do not add information that isn't there. Keep it concise; avoid an unnecessarily long summary. Structure your response with these headings, omitting any that don't apply:

Overview:
Key Points:
Important Requirements:
Important Dates:
Main Conclusions:
Important Terminology:
"""

MAX_SUMMARY_INPUT_CHARS = 12000  # keeps the prompt within a reasonable LLM context window


def build_summary_prompt(document_name: str, full_text: str) -> str:
    truncated = full_text[:MAX_SUMMARY_INPUT_CHARS]
    return f"{SUMMARY_INSTRUCTIONS}\n\nDocument: {document_name}\n\nContent:\n{truncated}\n\nSummary:"


COMPARE_INSTRUCTIONS = """You are ANORA. Compare the two versions of a document below. Identify, using ONLY what is actually present in the text — never invent a difference that isn't there:

- Added information (in the second version but not the first)
- Removed information (in the first version but not the second)
- Changed requirements
- Changed dates
- Changed percentages or numbers
- Other important differences

If the two versions are essentially identical, say so explicitly rather than inventing differences.
"""

MAX_COMPARE_INPUT_CHARS = 8000  # per document, so both fit in the prompt together


def build_compare_prompt(name_a: str, text_a: str, name_b: str, text_b: str) -> str:
    return (
        f"{COMPARE_INSTRUCTIONS}\n\n"
        f"--- {name_a} ---\n{text_a[:MAX_COMPARE_INPUT_CHARS]}\n\n"
        f"--- {name_b} ---\n{text_b[:MAX_COMPARE_INPUT_CHARS]}\n\n"
        f"--- Comparison ---\n"
    )
