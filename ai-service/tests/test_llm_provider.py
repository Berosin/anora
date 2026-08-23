import os

import pytest

from app.models.llm_provider import (
    GroqProvider,
    OfflineExtractiveProvider,
    get_llm_provider,
)


def test_offline_extractive_returns_top_chunk_text():
    provider = OfflineExtractiveProvider()
    result = provider.generate("irrelevant prompt", top_chunk_text="The exact answer text.")
    assert result == "The exact answer text."


def test_offline_extractive_handles_no_context():
    provider = OfflineExtractiveProvider()
    result = provider.generate("irrelevant prompt", top_chunk_text=None)
    assert "No context" in result


def test_get_llm_provider_returns_offline_extractive_by_default_in_tests():
    # conftest.py sets LLM_PROVIDER=offline-extractive for the whole suite.
    assert isinstance(get_llm_provider(), OfflineExtractiveProvider)


def test_get_llm_provider_rejects_unknown_provider(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "not-a-real-provider")
    with pytest.raises(ValueError):
        get_llm_provider()


def test_groq_provider_requires_api_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(KeyError):
        GroqProvider()
