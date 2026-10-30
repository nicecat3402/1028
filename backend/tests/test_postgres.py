import pytest
from sqlalchemy import text

from app.models import Embedding
from app.worker import run_one
from tests.test_library import FakeAI


def test_postgres_semantic_fusion_and_digest_isolation(app, client):
    if app.state.engine.dialect.name != 'postgresql':
        pytest.skip('Requires PostgreSQL + pgvector CI service')
    app.state.ai = FakeAI()
    first = client.post('/api/contacts', json={'name': '採購經理', 'company': '甲公司'}).json()
    second = client.post('/api/contacts', json={'name': '供應商', 'company': '乙公司'}).json()
    for _ in range(2):
        run_one(app.state.factory, app.state.settings, FakeAI())
    response = client.get('/api/search', params={'q': '採購經理'}).json()
    assert response['semantic'] == 'ready'
    top = response['items'][0]
    assert top['id'] == first['id']
    assert set(top['sources']) == {'exact', 'fuzzy', 'semantic'}
    assert top['score'] == pytest.approx(3 / 61)
    with app.state.factory.begin() as db:
        db.get(Embedding, first['id']).model_digest = 'obsolete-model'
        db.get(Embedding, second['id']).revision = 99
    response = client.get('/api/search', params={'q': '採購經理'}).json()
    assert response['semantic'] == 'index_empty'
    assert all('semantic' not in item['sources'] for item in response['items'])
    with app.state.engine.connect() as conn:
        indexes = set(conn.scalars(text("SELECT indexname FROM pg_indexes WHERE schemaname='public'")))
        assert {'contacts_trgm', 'embeddings_hnsw'} <= indexes
