from app.embeddings.embedder import embed_texts
from app.vectorstore.qdrant_client import search


def retrieve(question: str, collection_name: str, top_k: int = 5):
    """Returns a list of Qdrant ScoredPoint objects (each with .payload
    and .score), scoped to one knowledge base's collection. Returns an
    empty list — not an error — if the collection doesn't exist yet
    (e.g. a knowledge base with no successfully indexed documents),
    since "no results" is a legitimate, expected state here.
    """
    if not question or not question.strip():
        return []

    query_vector = embed_texts([question])[0]
    return search(collection_name, query_vector, top_k=top_k)
