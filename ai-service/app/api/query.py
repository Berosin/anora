from fastapi import APIRouter, HTTPException

from app.models.schemas import QueryRequest, QueryResponse
from app.rag.qa import answer_question

router = APIRouter(prefix="/internal", tags=["rag"])


@router.post("/query", response_model=QueryResponse)
async def query_endpoint(payload: QueryRequest):
    """The endpoint the Node backend calls for every chat message.
    Retrieves relevant chunks from the knowledge base's Qdrant
    collection, builds a grounded prompt, and generates an answer with
    source citations. Returns an honest "not enough information"
    response (grounded=False) rather than a guess when nothing relevant
    is found.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question cannot be empty.")

    return answer_question(payload.question, payload.collection_name, top_k=payload.top_k)
