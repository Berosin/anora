"""LLM provider abstraction.

The rest of the RAG pipeline (app/rag/qa.py) only ever calls
`get_llm_provider().generate(prompt, top_chunk_text=...)` — it never
knows or cares which provider is behind that call. This is what lets the
LLM be swapped between a free inference service, a locally running
model, or another compatible provider without touching anything else,
per the Phase 0 plan.

Selected via LLM_PROVIDER:
- "groq" (default, real): Groq's free-tier, OpenAI-compatible chat
  completions API. Fast, no local compute needed. Requires GROQ_API_KEY.
- "ollama" (real): a locally running Ollama server — the documented
  fallback for offline/scale-down use, or once Groq's free-tier limits
  are a problem.
- "offline-extractive" (test-only): does NOT call any LLM. It returns the
  single highest-scoring context chunk's text directly, unmodified. This
  is honest about what it is — a plumbing test double, not a language
  model — and exists solely so the retrieval -> prompt -> "generation" ->
  citation pipeline can be exercised by the test suite with no network
  access to any real LLM API. Never used in production.
"""
import os


class BaseLLMProvider:
    def generate(self, prompt: str, *, top_chunk_text: str | None = None) -> str:  # pragma: no cover
        raise NotImplementedError


class GroqProvider(BaseLLMProvider):
    def __init__(self):
        self.api_key = os.environ["GROQ_API_KEY"]  # fails loudly at first use, not at import
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    def generate(self, prompt: str, *, top_chunk_text: str | None = None) -> str:
        import httpx

        response = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 1500,
            },
            timeout=45,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()


class OllamaProvider(BaseLLMProvider):
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

    def generate(self, prompt: str, *, top_chunk_text: str | None = None) -> str:
        import httpx

        response = httpx.post(
            f"{self.base_url}/api/generate",
            json={"model": self.model, "prompt": prompt, "stream": False},
            timeout=60,
        )
        response.raise_for_status()
        return response.json()["response"].strip()


class OfflineExtractiveProvider(BaseLLMProvider):
    """Test-only. See module docstring — returns the top chunk's text
    as-is rather than generating anything, so the pipeline can be tested
    without a real LLM."""

    def generate(self, prompt: str, *, top_chunk_text: str | None = None) -> str:
        if not top_chunk_text:
            return "No context was available to answer this question."
        return top_chunk_text


def get_llm_provider() -> BaseLLMProvider:
    provider = os.getenv("LLM_PROVIDER", "groq")
    if provider == "groq":
        return GroqProvider()
    if provider == "ollama":
        return OllamaProvider()
    if provider == "offline-extractive":
        return OfflineExtractiveProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")
