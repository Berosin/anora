"""PDF extraction — pulls text page by page so page numbers survive into
chunk metadata later in the pipeline (see document_processing/pipeline.py).
"""
from dataclasses import dataclass

import fitz  # PyMuPDF


@dataclass
class PageText:
    page_number: int  # 1-indexed, matches how a human would cite the page
    text: str


class PdfExtractionError(Exception):
    pass


def extract_pages(file_bytes: bytes) -> list[PageText]:
    """Extract text from a PDF, one entry per page.

    Raises PdfExtractionError for corrupt/unreadable files rather than
    letting a low-level PyMuPDF exception leak up to the API layer.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:  # PyMuPDF raises a plain Exception on bad files
        raise PdfExtractionError(f"Could not open PDF: {exc}") from exc

    pages: list[PageText] = []
    try:
        for index, page in enumerate(doc):
            pages.append(PageText(page_number=index + 1, text=page.get_text("text")))
    finally:
        doc.close()

    if not pages:
        raise PdfExtractionError("PDF has no pages.")

    return pages
