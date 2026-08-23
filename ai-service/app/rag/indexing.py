from app.document_processing.pipeline import process_document
from app.embeddings.embedder import EMBEDDING_DIM, embed_texts
from app.vectorstore.qdrant_client import ensure_collection, upsert_chunks


def index_document(
    *,
    file_bytes: bytes,
    file_type: str,
    document_id: str,
    document_name: str,
    knowledge_base_id: str,
    collection_name: str,
) -> tuple[int, int | None]:
    """Extracts, cleans, chunks, embeds, and stores a document's vectors.

    Returns (chunk_count, page_count). Raises DocumentProcessingError
    (from the underlying pipeline) on extraction failure — the caller
    (the API layer) is responsible for turning that into the right HTTP
    response, which the backend then uses to mark a Document FAILED with
    a clear reason.
    """
    chunks, page_count = process_document(
        file_bytes=file_bytes,
        file_type=file_type,
        document_id=document_id,
        document_name=document_name,
        knowledge_base_id=knowledge_base_id,
    )

    vectors = embed_texts([chunk.text for chunk in chunks])

    ensure_collection(collection_name, vector_size=EMBEDDING_DIM)
    upsert_chunks(collection_name, chunks, vectors)

    return len(chunks), page_count
