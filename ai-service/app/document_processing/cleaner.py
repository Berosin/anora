"""Text cleaning applied after extraction, before chunking.

Kept intentionally conservative: we normalize whitespace and strip
control characters, but we don't try to "fix" wording or remove content
that merely looks like boilerplate — false positives there would silently
delete real information the RAG pipeline is supposed to retrieve.
"""
import re

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_MULTIPLE_SPACES = re.compile(r"[ \t]+")
_MULTIPLE_BLANK_LINES = re.compile(r"\n{3,}")
_HYPHEN_LINEBREAK = re.compile(r"(\w)-\n(\w)")  # rejoin PDF-wrapped words: "informa-\ntion"


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = _CONTROL_CHARS.sub("", text)
    text = _HYPHEN_LINEBREAK.sub(r"\1\2", text)
    text = _MULTIPLE_SPACES.sub(" ", text)
    text = _MULTIPLE_BLANK_LINES.sub("\n\n", text)

    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()


def is_meaningful(text: str, min_length: int = 20) -> bool:
    """Filters out near-empty fragments (stray page numbers, running
    headers/footers reduced to a few characters) before they become chunks."""
    stripped = text.strip()
    return len(stripped) >= min_length and any(c.isalnum() for c in stripped)
