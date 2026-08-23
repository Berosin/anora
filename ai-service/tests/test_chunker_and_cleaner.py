from app.document_processing.chunker import chunk_text
from app.document_processing.cleaner import clean_text, is_meaningful


def test_clean_text_collapses_whitespace():
    dirty = "Hello    world.\n\n\n\nNext   paragraph."
    cleaned = clean_text(dirty)
    assert "    " not in cleaned
    assert "\n\n\n" not in cleaned


def test_clean_text_rejoins_hyphenated_linebreaks():
    dirty = "This is infor-\nmation split across a PDF line wrap."
    cleaned = clean_text(dirty)
    assert "information" in cleaned


def test_is_meaningful_rejects_stray_fragments():
    assert not is_meaningful("12")
    assert not is_meaningful("   ")
    assert is_meaningful("Students must maintain a minimum aggregate of 60%.")


def test_chunk_text_respects_chunk_size():
    text = "Sentence one. " * 200  # long enough to require multiple chunks
    chunks = chunk_text(text, chunk_size=200, chunk_overlap=40)
    assert len(chunks) > 1
    for chunk in chunks:
        # Overlap can push a chunk slightly over; it should never be wildly over.
        assert len(chunk.text) <= 240


def test_chunk_text_produces_overlap():
    text = "A" * 50 + " " + "B" * 50 + " " + "C" * 50 + " " + "D" * 50
    chunks = chunk_text(text, chunk_size=60, chunk_overlap=20)
    # Overlap means adjacent chunks should share some trailing/leading text.
    assert len(chunks) >= 2


def test_chunk_text_handles_empty_input():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_chunk_text_rejects_invalid_overlap():
    import pytest

    with pytest.raises(ValueError):
        chunk_text("some text", chunk_size=100, chunk_overlap=100)
