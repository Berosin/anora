from typing import Literal

from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    document_id: str
    document_name: str
    knowledge_base_id: str
    chunk_id: str
    chunk_index: int
    page: int | None = None
    section: str | None = None


class ChunkOut(BaseModel):
    text: str
    metadata: ChunkMetadata


class ProcessDocumentResponse(BaseModel):
    document_id: str
    file_type: Literal["pdf", "docx", "txt"]
    page_count: int | None = None
    chunk_count: int
    chunks: list[ChunkOut]


class ProcessDocumentError(BaseModel):
    message: str


class IndexDocumentResponse(BaseModel):
    chunk_count: int
    page_count: int | None = None


class DeleteResponse(BaseModel):
    deleted: bool


class SourceOut(BaseModel):
    document_id: str
    document_name: str
    page: int | None = None
    section: str | None = None
    excerpt: str
    score: float


class QueryRequest(BaseModel):
    question: str
    collection_name: str
    top_k: int = Field(default=5, ge=1, le=20)


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceOut]
    grounded: bool  # False when no relevant context was found at all


class SummarizeRequest(BaseModel):
    collection_name: str
    document_id: str
    document_name: str


class SummarizeResponse(BaseModel):
    document_id: str
    document_name: str
    summary: str


class CompareRequest(BaseModel):
    collection_name_a: str
    document_id_a: str
    document_name_a: str
    collection_name_b: str
    document_id_b: str
    document_name_b: str


class CompareResponse(BaseModel):
    document_a: str
    document_b: str
    comparison: str
