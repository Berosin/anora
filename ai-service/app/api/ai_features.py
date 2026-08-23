from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    CompareRequest,
    CompareResponse,
    SummarizeRequest,
    SummarizeResponse,
)
from app.rag.compare import ComparisonError, compare_documents
from app.rag.summarize import SummarizationError, summarize_document

router = APIRouter(prefix="/internal", tags=["ai-features"])


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_endpoint(payload: SummarizeRequest):
    try:
        return summarize_document(payload.collection_name, payload.document_id, payload.document_name)
    except SummarizationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/compare", response_model=CompareResponse)
async def compare_endpoint(payload: CompareRequest):
    try:
        return compare_documents(
            collection_name_a=payload.collection_name_a,
            document_id_a=payload.document_id_a,
            document_name_a=payload.document_name_a,
            collection_name_b=payload.collection_name_b,
            document_id_b=payload.document_id_b,
            document_name_b=payload.document_name_b,
        )
    except ComparisonError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
