from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.document_processing.pipeline import DocumentProcessingError, process_document
from app.models.schemas import ProcessDocumentResponse

router = APIRouter(prefix="/internal", tags=["document-processing"])

ALLOWED_TYPES = {"pdf", "docx", "txt"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # kept in sync with the backend's MAX_UPLOAD_SIZE_MB default


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document_endpoint(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    document_name: str = Form(...),
    knowledge_base_id: str = Form(...),
    file_type: str = Form(...),
):
    """Extracts, cleans, and chunks a document, returning metadata-tagged
    chunks. This is the Phase 4 slice of the full pipeline described in
    the Phase 0 plan — embedding generation and Qdrant storage are added
    in Phase 5, at which point this endpoint's response feeds directly
    into that next step rather than being returned to the caller as-is.
    """
    if file_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file_type. Allowed: {', '.join(ALLOWED_TYPES)}")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the maximum allowed size.")

    try:
        chunks, page_count = process_document(
            file_bytes=file_bytes,
            file_type=file_type,
            document_id=document_id,
            document_name=document_name,
            knowledge_base_id=knowledge_base_id,
        )
    except DocumentProcessingError as exc:
        # A processing failure here is exactly what should move a
        # Document's status to FAILED with this message, once the backend
        # is wired to call this endpoint (Phase 5).
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return ProcessDocumentResponse(
        document_id=document_id,
        file_type=file_type,
        page_count=page_count,
        chunk_count=len(chunks),
        chunks=chunks,
    )
