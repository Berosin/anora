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


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_process_document_pdf_success():
    pdf_bytes = make_pdf_bytes("Eligibility requires a minimum aggregate of 60 percent.")
    res = client.post(
        "/internal/process-document",
        files={"file": ("policy.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        data={
            "document_id": "doc-1",
            "document_name": "policy.pdf",
            "knowledge_base_id": "kb-1",
            "file_type": "pdf",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["chunk_count"] >= 1
    assert body["page_count"] == 1
    assert body["chunks"][0]["metadata"]["page"] == 1


def test_process_document_rejects_bad_file_type():
    res = client.post(
        "/internal/process-document",
        files={"file": ("x.exe", io.BytesIO(b"data"), "application/octet-stream")},
        data={
            "document_id": "doc-2",
            "document_name": "x.exe",
            "knowledge_base_id": "kb-1",
            "file_type": "exe",
        },
    )
    assert res.status_code == 400


def test_process_document_rejects_corrupt_pdf():
    res = client.post(
        "/internal/process-document",
        files={"file": ("broken.pdf", io.BytesIO(b"not a real pdf"), "application/pdf")},
        data={
            "document_id": "doc-3",
            "document_name": "broken.pdf",
            "knowledge_base_id": "kb-1",
            "file_type": "pdf",
        },
    )
    assert res.status_code == 422


def test_process_document_rejects_empty_file():
    res = client.post(
        "/internal/process-document",
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
        data={
            "document_id": "doc-4",
            "document_name": "empty.txt",
            "knowledge_base_id": "kb-1",
            "file_type": "txt",
        },
    )
    assert res.status_code == 400
