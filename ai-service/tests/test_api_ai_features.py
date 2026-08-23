import io

import fitz
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def make_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def index_a_document(collection_name, document_id, document_name, text):
    pdf_bytes = make_pdf_bytes(text)
    return client.post(
        "/internal/index-document",
        files={"file": (document_name, io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": document_id,
            "document_name": document_name,
            "knowledge_base_id": "kb-1",
            "file_type": "pdf",
            "collection_name": collection_name,
        },
    )


def test_summarize_endpoint_success():
    index_a_document("kb_api_summarize_1", "doc-sum-api-1", "handbook.pdf", "The handbook covers eligibility and dates.")

    res = client.post(
        "/internal/summarize",
        json={
            "collection_name": "kb_api_summarize_1",
            "document_id": "doc-sum-api-1",
            "document_name": "handbook.pdf",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["document_name"] == "handbook.pdf"
    assert body["summary"]


def test_summarize_endpoint_rejects_unindexed_document():
    res = client.post(
        "/internal/summarize",
        json={
            "collection_name": "kb_api_summarize_never",
            "document_id": "doc-none",
            "document_name": "missing.pdf",
        },
    )
    assert res.status_code == 422


def test_compare_endpoint_success():
    index_a_document("kb_api_compare_1", "doc-cmp-a", "v1.pdf", "Minimum aggregate is 55 percent.")
    index_a_document("kb_api_compare_1", "doc-cmp-b", "v2.pdf", "Minimum aggregate is 60 percent.")

    res = client.post(
        "/internal/compare",
        json={
            "collection_name_a": "kb_api_compare_1",
            "document_id_a": "doc-cmp-a",
            "document_name_a": "v1.pdf",
            "collection_name_b": "kb_api_compare_1",
            "document_id_b": "doc-cmp-b",
            "document_name_b": "v2.pdf",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["document_a"] == "v1.pdf"
    assert body["document_b"] == "v2.pdf"
    assert body["comparison"]


def test_compare_endpoint_rejects_when_one_document_unindexed():
    index_a_document("kb_api_compare_2", "doc-cmp-c", "exists.pdf", "Some real content.")

    res = client.post(
        "/internal/compare",
        json={
            "collection_name_a": "kb_api_compare_2",
            "document_id_a": "doc-cmp-c",
            "document_name_a": "exists.pdf",
            "collection_name_b": "kb_api_compare_2",
            "document_id_b": "doc-missing",
            "document_name_b": "missing.pdf",
        },
    )
    assert res.status_code == 422
