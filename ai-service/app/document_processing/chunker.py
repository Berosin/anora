"""Chunking — splits cleaned text into overlapping pieces sized for the
embedding model context window.

Implemented directly (no LangChain) since a recursive splitter is
straightforward and pulling in a framework for one function would add
weight without simplifying anything, per the project's "avoid unnecessary
abstractions" rule.

Strategy: try to split on paragraph breaks first, then sentence breaks,
then whitespace, only falling back to a hard character cut if a single
"paragraph" is larger than chunk_size on its own. Overlap is added so a
sentence spanning a chunk boundary still appears whole in at least one
chunk, which matters for retrieval recall.
"""
from dataclasses import dataclass

_SEPARATORS = ["\n\n", "\n", ". ", " ", ""]

DEFAULT_CHUNK_SIZE = 800
DEFAULT_CHUNK_OVERLAP = 100


@dataclass
class Chunk:
    text: str
    char_start: int  # offset into the source text this chunk came from
    char_end: int


def _split_on_separator(text: str, separator: str) -> list[str]:
    if separator == "":
        return list(text)
    return text.split(separator)


def _recursive_split(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    if len(text) <= chunk_size:
        return [text] if text else []

    if not separators:
        # No separators left — hard cut as a last resort.
        return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]

    separator, *remaining_separators = separators
    pieces = _split_on_separator(text, separator)

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        candidate = (current + separator + piece) if current else piece
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(piece) > chunk_size:
                # This single piece is still too big — recurse with the
                # next, finer-grained separator.
                chunks.extend(_recursive_split(piece, chunk_size, remaining_separators))
                current = ""
            else:
                current = piece
    if current:
        chunks.append(current)

    return chunks


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[Chunk]:
    if not text.strip():
        return []
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size.")

    raw_pieces = _recursive_split(text, chunk_size, _SEPARATORS)

    # Merge in overlap by carrying the tail of the previous chunk forward,
    # then track each chunk's real offset into the original text so
    # metadata (and, in a later phase, highlighting) can point back to it.
    chunks: list[Chunk] = []
    cursor = 0
    previous_tail = ""

    for piece in raw_pieces:
        piece_start = text.find(piece, cursor)
        if piece_start == -1:
            piece_start = cursor  # separators consumed during split; best effort

        combined = (previous_tail + piece) if previous_tail else piece
        chunk_start = max(piece_start - len(previous_tail), 0)
        chunk_end = piece_start + len(piece)

        chunks.append(Chunk(text=combined.strip(), char_start=chunk_start, char_end=chunk_end))

        previous_tail = piece[-chunk_overlap:] if len(piece) > chunk_overlap else piece
        cursor = piece_start + len(piece)

    return [c for c in chunks if c.text]
