import fitz
import pytest

from app.document_processing.pipeline import DocumentProcessingError
from app.rag.indexing import index_document
from app.vectorstore.qdrant_client import get_client


def make_pdf_bytes(pages_text: list[str]) -> bytes:
    doc = fitz.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def test_index_document_stores_vectors_in_qdrant():
    pdf_bytes = make_pdf_bytes(
        [
            "Placement eligibility requires a minimum aggregate of 60 percent.",
            "Internship applications open every March and close in April.",
        ]
    )
    chunk_count, page_count = index_document(
        file_bytes=pdf_bytes,
        file_type="pdf",
        document_id="doc-idx-1",
        document_name="policy.pdf",
        knowledge_base_id="kb-idx-1",
        collection_name="kb_idx_test_1",
    )

    assert page_count == 2
    assert chunk_count >= 2

    collection_info = get_client().get_collection("kb_idx_test_1")
    assert collection_info.points_count == chunk_count


def test_index_document_raises_on_corrupt_file():
    with pytest.raises(DocumentProcessingError):
        index_document(
            file_bytes=b"not a real pdf",
            file_type="pdf",
            document_id="doc-idx-2",
            document_name="broken.pdf",
            knowledge_base_id="kb-idx-1",
            collection_name="kb_idx_test_2",
        )
