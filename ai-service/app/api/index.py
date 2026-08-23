from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.document_processing.pipeline import DocumentProcessingError
from app.models.schemas import DeleteResponse, IndexDocumentResponse
from app.rag.indexing import index_document
from app.vectorstore.qdrant_client import delete_collection, delete_document_vectors

router = APIRouter(prefix="/internal", tags=["indexing"])

MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024


@router.post("/index-document", response_model=IndexDocumentResponse)
async def index_document_endpoint(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    document_name: str = Form(...),
    knowledge_base_id: str = Form(...),
    file_type: str = Form(...),
    collection_name: str = Form(...),
):
    """The endpoint the Node backend calls after storing an uploaded file.
    Runs the full Phase 4 + Phase 5 pipeline: extract -> clean -> chunk ->
    embed -> store in the knowledge base's Qdrant collection. A Document's
    status should move to READY on success, or FAILED (with this error's
    message) on failure — that transition is owned by the backend.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the maximum allowed size.")

    try:
        chunk_count, page_count = index_document(
            file_bytes=file_bytes,
            file_type=file_type,
            document_id=document_id,
            document_name=document_name,
            knowledge_base_id=knowledge_base_id,
            collection_name=collection_name,
        )
    except DocumentProcessingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return IndexDocumentResponse(chunk_count=chunk_count, page_count=page_count)


@router.delete("/collections/{collection_name}/documents/{document_id}", response_model=DeleteResponse)
def delete_document_vectors_endpoint(collection_name: str, document_id: str):
    """Called when a single document is deleted — removes just its chunks."""
    delete_document_vectors(collection_name, document_id)
    return DeleteResponse(deleted=True)


@router.delete("/collections/{collection_name}", response_model=DeleteResponse)
def delete_collection_endpoint(collection_name: str):
    """Called when an entire knowledge base is deleted."""
    delete_collection(collection_name)
    return DeleteResponse(deleted=True)
