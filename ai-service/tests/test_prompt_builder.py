from app.rag.prompt_builder import SYSTEM_INSTRUCTIONS, build_prompt, format_location


class FakeResult:
    def __init__(self, payload):
        self.payload = payload


def test_format_location_prefers_page():
    assert format_location({"page": 4, "section": "Eligibility"}) == "page 4"


def test_format_location_falls_back_to_section():
    assert format_location({"page": None, "section": "Eligibility"}) == "Eligibility"


def test_format_location_falls_back_to_chunk_index():
    assert format_location({"page": None, "section": None, "chunk_index": 2}) == "chunk 3"


def test_build_prompt_includes_instructions_and_sources():
    results = [
        FakeResult({"document_name": "policy.pdf", "page": 4, "text": "Minimum aggregate is 60%."}),
    ]
    prompt = build_prompt("What is the minimum aggregate?", results)
    assert SYSTEM_INSTRUCTIONS.strip() in prompt
    assert "policy.pdf" in prompt
    assert "page 4" in prompt
    assert "Minimum aggregate is 60%." in prompt
    assert "What is the minimum aggregate?" in prompt


def test_build_prompt_numbers_multiple_sources():
    results = [
        FakeResult({"document_name": "a.pdf", "page": 1, "text": "First fact."}),
        FakeResult({"document_name": "b.pdf", "page": 2, "text": "Second fact."}),
    ]
    prompt = build_prompt("question", results)
    assert "Source 1" in prompt
    assert "Source 2" in prompt
