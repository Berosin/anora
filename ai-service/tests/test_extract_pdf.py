import fitz
import pytest

from app.document_processing.extract_pdf import PdfExtractionError, extract_pages


def make_pdf_bytes(pages_text: list[str]) -> bytes:
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def test_extract_pages_preserves_page_numbers():
    pdf_bytes = make_pdf_bytes(["First page content.", "Second page content."])
    pages = extract_pages(pdf_bytes)
    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert pages[1].page_number == 2
    assert "First page" in pages[0].text
    assert "Second page" in pages[1].text


def test_extract_pages_rejects_corrupt_file():
    with pytest.raises(PdfExtractionError):
        extract_pages(b"this is not a real pdf")
