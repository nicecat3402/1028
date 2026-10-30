import uuid

from sqlalchemy import select

from app.models import Card, Contact, Embedding, Job, now
from app.worker import run_one
from tests.test_library import FakeAI, image_bytes


def test_import_conflict_rolls_back_whole_batch(app, client):
    contact = client.post('/api/contacts', json={'name': '原始資料'}).json()
    exported = client.get('/api/export/contacts').json()
    assert client.post('/api/import/contacts', json=exported).json() == {'added': 0, 'skipped': 1}
    new_id = str(uuid.uuid4())
    exported['items'] = [{'id': new_id, 'data': {'name': '不得部分寫入'}},
                         {'id': contact['id'], 'data': {'name': '衝突'}}]
    assert client.post('/api/import/contacts', json=exported).status_code == 409
    with app.state.factory() as db:
        assert db.get(Contact, new_id) is None
        assert db.scalar(select(Job).where(Job.target_id == new_id)) is None
        assert db.get(Contact, contact['id']).data['name'] == '原始資料'


def test_merge_checks_revisions_moves_cards_and_invalidates_vectors(app, client):
    card = client.post('/api/cards', files={'file': ('card.png', image_bytes(), 'image/png')}).json()
    source = client.post(f'/api/cards/{card["id"]}/review', json={'data': {'name': '來源'}}).json()
    target = client.post('/api/contacts', json={'name': '目標'}).json()
    for _ in range(3):
        run_one(app.state.factory, app.state.settings, FakeAI())
    body = {'source_id': source['id'], 'target_id': target['id'], 'source_revision': 2,
            'target_revision': 1, 'data': {'name': '合併結果'}}
    assert client.post('/api/contacts-merge', json=body).status_code == 409
    body['source_revision'] = 1
    result = client.post('/api/contacts-merge', json=body)
    assert result.status_code == 200
    assert result.json()['revision'] == 2
    with app.state.factory() as db:
        assert db.get(Contact, source['id']) is None
        assert db.get(Card, card['id']).contact_id == target['id']
        assert db.get(Card, card['id']).verified
        assert db.get(Embedding, target['id']) is None
        assert db.get(Embedding, source['id']) is None
    assert client.delete(f'/api/contacts/{target["id"]}?revision=2').status_code == 200
    with app.state.factory() as db:
        assert not db.get(Card, card['id']).verified


def test_normalized_duplicate_and_phone_search(app, client):
    app.state.ai = FakeAI()
    first = client.post('/api/contacts', json={'name': '甲', 'mobile': '0912-345-678'}).json()
    second = client.post('/api/contacts', json={'name': '乙', 'mobile': '+886 912 345 678'}).json()
    assert client.get(f'/api/duplicates/{first["id"]}').json()[0]['id'] == second['id']
    results = client.get('/api/search', params={'q': '0912345678'}).json()
    assert {r['id'] for r in results['items']} == {first['id'], second['id']}
    assert client.post('/api/contacts', json={'name': '錯誤統編', 'tax_id': '00000000'}).status_code == 422


def test_expired_lease_is_reclaimed(app, client):
    contact = client.post('/api/contacts', json={'name': '重啟復原'}).json()
    with app.state.factory.begin() as db:
        job = db.scalar(select(Job))
        job.status, job.lease_token, job.lease_until = 'running', 'old-worker', now() - 1
        job.attempts = 1
    assert run_one(app.state.factory, app.state.settings, FakeAI())
    with app.state.factory() as db:
        assert db.get(Embedding, contact['id']) is not None
        job = db.scalar(select(Job))
        assert job.status == 'done' and job.attempts == 2


def test_late_embedding_cannot_overwrite_new_revision(app, client):
    contact = client.post('/api/contacts', json={'name': '舊版本'}).json()

    class EditingAI(FakeAI):
        def embed(self, text):
            assert client.put(f'/api/contacts/{contact["id"]}', json={
                'revision': 1, 'data': {'name': '新版本'}}).status_code == 200
            return super().embed(text)

    run_one(app.state.factory, app.state.settings, EditingAI())
    with app.state.factory() as db:
        assert db.get(Embedding, contact['id']) is None
    run_one(app.state.factory, app.state.settings, FakeAI())
    with app.state.factory() as db:
        assert db.get(Embedding, contact['id']).revision == 2
