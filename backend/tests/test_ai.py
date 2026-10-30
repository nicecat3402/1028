import pytest
from app.ai import Ollama, AIUnavailable
from app.config import Settings


def test_rejects_wrong_embedding_dimensions(monkeypatch):
    ai = Ollama(Settings())
    monkeypatch.setattr(ai, 'digest', lambda: 'digest')
    monkeypatch.setattr(ai, 'request', lambda *a, **k: {'embeddings': [[1] * 4096]})
    with pytest.raises(AIUnavailable, match='1024'):
        ai.embed('test')


def test_tag_digest_change_requires_reindex(monkeypatch):
    ai = Ollama(Settings(embedding_digest='expected'))
    monkeypatch.setattr(ai, 'request', lambda *a, **k: {'models': [{'name': 'bge-m3:latest', 'digest': 'changed'}]})
    with pytest.raises(AIUnavailable, match='reindex'):
        ai.digest()


def test_no_silent_truncation_and_finite_values(monkeypatch):
    ai = Ollama(Settings())
    monkeypatch.setattr(ai, 'digest', lambda: 'digest')
    def response(*args, **kwargs):
        assert kwargs['json']['truncate'] is False
        return {'embeddings': [[float('nan')] * 1024]}
    monkeypatch.setattr(ai, 'request', response)
    with pytest.raises(AIUnavailable):
        ai.embed('test')
