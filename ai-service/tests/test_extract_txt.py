import pytest

from app.document_processing.extract_txt import TxtExtractionError, extract_text


def test_extract_text_reads_utf8():
    content = "The internship program runs for 8 weeks.".encode("utf-8")
    assert "8 weeks" in extract_text(content)


def test_extract_text_rejects_empty_input():
    with pytest.raises(TxtExtractionError):
        extract_text(b"")
