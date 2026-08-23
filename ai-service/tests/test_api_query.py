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


def index_a_document(collection_name: str, text: str):
    pdf_bytes = make_pdf_bytes(text)
    return client.post(
        "/internal/index-document",
        files={"file": ("policy.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": "doc-query-1",
            "document_name": "policy.pdf",
            "knowledge_base_id": "kb-query-1",
            "file_type": "pdf",
            "collection_name": collection_name,
        },
    )


def test_query_endpoint_answers_from_indexed_document():
    index_a_document("kb_query_test_1", "Eligibility requires a minimum aggregate of 60 percent.")

    res = client.post(
        "/internal/query",
        json={
            "question": "Eligibility requires a minimum aggregate of 60 percent.",
            "collection_name": "kb_query_test_1",
            "top_k": 3,
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["grounded"] is True
    assert len(body["sources"]) >= 1
    assert body["sources"][0]["document_name"] == "policy.pdf"


def test_query_endpoint_returns_honest_answer_for_unindexed_collection():
    res = client.post(
        "/internal/query",
        json={
            "question": "Anything at all",
            "collection_name": "kb_query_never_indexed",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["grounded"] is False
    assert body["sources"] == []


def test_query_endpoint_rejects_empty_question():
    res = client.post(
        "/internal/query",
        json={"question": "   ", "collection_name": "kb_query_test_1"},
    )
    assert res.status_code == 400


def test_query_endpoint_respects_top_k_bounds():
    res = client.post(
        "/internal/query",
        json={"question": "test", "collection_name": "kb_query_test_1", "top_k": 100},
    )
    assert res.status_code == 422  # top_k has a max of 20 in the schema
