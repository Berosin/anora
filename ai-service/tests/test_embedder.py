from app.embeddings.embedder import EMBEDDING_DIM, embed_texts


def test_embed_texts_returns_correct_dimension():
    vectors = embed_texts(["hello world"])
    assert len(vectors) == 1
    assert len(vectors[0]) == EMBEDDING_DIM


def test_embed_texts_is_deterministic():
    a = embed_texts(["Eligibility requires 60 percent."])[0]
    b = embed_texts(["Eligibility requires 60 percent."])[0]
    assert a == b


def test_embed_texts_differs_for_different_text():
    a = embed_texts(["Eligibility requires 60 percent."])[0]
    b = embed_texts(["Internships open in March."])[0]
    assert a != b


def test_embed_texts_handles_empty_list():
    assert embed_texts([]) == []


def test_embed_texts_handles_batch():
    vectors = embed_texts(["one", "two", "three"])
    assert len(vectors) == 3
    assert all(len(v) == EMBEDDING_DIM for v in vectors)
