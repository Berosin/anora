import io

import fitz
from fastapi.testclient import TestClient

from app.vectorstore.qdrant_client import get_client
from main import app

client = TestClient(app)


def make_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), text)
    data = doc.tobytes()
    doc.close()
    return data


def test_index_document_endpoint_success():
    pdf_bytes = make_pdf_bytes("Eligibility requires a minimum aggregate of 60 percent.")
    res = client.post(
        "/internal/index-document",
        files={"file": ("policy.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": "doc-api-1",
            "document_name": "policy.pdf",
            "knowledge_base_id": "kb-api-1",
            "file_type": "pdf",
            "collection_name": "kb_api_test_1",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["chunk_count"] >= 1
    assert body["page_count"] == 1

    collection_info = get_client().get_collection("kb_api_test_1")
    assert collection_info.points_count == body["chunk_count"]


def test_index_document_endpoint_rejects_corrupt_file():
    res = client.post(
        "/internal/index-document",
        files={"file": ("broken.pdf", io.BytesIO(b"not a real pdf"), "application/pdf")},
        data={
            "document_id": "doc-api-2",
            "document_name": "broken.pdf",
            "knowledge_base_id": "kb-api-1",
            "file_type": "pdf",
            "collection_name": "kb_api_test_2",
        },
    )
    assert res.status_code == 422


def test_delete_document_vectors_endpoint():
    pdf_bytes = make_pdf_bytes("Content to be deleted later.")
    client.post(
        "/internal/index-document",
        files={"file": ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": "doc-api-3",
            "document_name": "doc.pdf",
            "knowledge_base_id": "kb-api-1",
            "file_type": "pdf",
            "collection_name": "kb_api_test_3",
        },
    )

    res = client.delete("/internal/collections/kb_api_test_3/documents/doc-api-3")
    assert res.status_code == 200
    assert res.json()["deleted"] is True

    collection_info = get_client().get_collection("kb_api_test_3")
    assert collection_info.points_count == 0


def test_delete_collection_endpoint():
    pdf_bytes = make_pdf_bytes("Content in a collection to be fully removed.")
    client.post(
        "/internal/index-document",
        files={"file": ("doc.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": "doc-api-4",
            "document_name": "doc.pdf",
            "knowledge_base_id": "kb-api-1",
            "file_type": "pdf",
            "collection_name": "kb_api_test_4",
        },
    )

    res = client.delete("/internal/collections/kb_api_test_4")
    assert res.status_code == 200
    assert res.json()["deleted"] is True

    names = {c.name for c in get_client().get_collections().collections}
    assert "kb_api_test_4" not in names


def test_delete_collection_endpoint_on_nonexistent_collection():
    res = client.delete("/internal/collections/kb_never_existed")
    assert res.status_code == 200
    assert res.json()["deleted"] is True
