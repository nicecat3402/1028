import io
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import select
from app.models import Contact, Embedding, Job, LoginSession
from app.worker import run_one
from app.ai import AIUnavailable


def image_bytes():
    output = io.BytesIO()
    Image.new('RGB', (40, 20), 'white').save(output, format='PNG')
    return output.getvalue()


class FakeAI:
    def embed(self, text):
        return [1.0] + [0.0] * 1023, 'digest-test'

    def ocr(self, image):
        return '測試名片\n測試公司\n王小明'


def test_auth_csrf_and_admin_permissions(app, client):
    with TestClient(app) as anonymous:
        assert anonymous.get('/api/contacts').status_code == 401
        assert anonymous.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin-password-123!'}).status_code == 403
    client.post('/api/auth/logout')
    assert client.get('/api/contacts').status_code == 401
    assert client.post('/api/auth/login', json={'username': 'member', 'password': 'Member-password-123!'}).status_code == 200
    assert client.get('/api/users').status_code == 403
    assert client.post('/api/contacts', json={'name': '團隊可新增'}).status_code == 201


def test_contact_crud_conflict_and_persistence(app, client):
    created = client.post('/api/contacts', json={'name': '王小明', 'company': '測試公司', 'tags': ['採購']}).json()
    with app.state.factory() as db:
        assert db.get(Contact, created['id']).data['name'] == '王小明'
    edited = client.put(f'/api/contacts/{created["id"]}', json={'revision': 1, 'data': {'name': '王大明'}})
    assert edited.status_code == 200
    assert edited.json()['revision'] == 2
    assert client.put(f'/api/contacts/{created["id"]}', json={'revision': 1, 'data': {'name': '覆寫'}}).status_code == 409
    assert client.delete(f'/api/contacts/{created["id"]}?revision=1').status_code == 409
    assert client.delete(f'/api/contacts/{created["id"]}?revision=2').status_code == 200
    assert client.get('/api/contacts').json()['total'] == 0


def test_image_validation_duplicate_and_review(app, client):
    assert client.post('/api/cards', files={'file': ('bad.png', b'not an image', 'image/png')}).status_code == 422
    uploaded = client.post('/api/cards', files={'file': ('../../escape.png', image_bytes(), 'image/png')}).json()
    duplicate = client.post('/api/cards', files={'file': ('other.png', image_bytes(), 'image/png')}).json()
    assert duplicate['duplicate'] is True
    assert duplicate['id'] == uploaded['id']
    assert len(list((app.state.settings.data_dir / 'images').glob('*.png'))) == 1
    assert client.get(uploaded['image_url']).headers['content-type'] == 'image/png'
    with TestClient(app) as anonymous:
        assert anonymous.get(uploaded['image_url']).status_code == 401
    run_one(app.state.factory, app.state.settings, FakeAI())
    card = client.get('/api/cards').json()[0]
    assert '王小明' in card['ocr_text']
    assert client.get('/api/contacts').json()['total'] == 0  # AI does not auto-save personal data as verified.
    body = {'data': {'name': '王小明', 'company': '人工核對公司'}}
    verified = client.post(f'/api/cards/{card["id"]}/review', json=body)
    assert verified.status_code == 200
    assert client.post(f'/api/cards/{card["id"]}/review', json=body).status_code == 409


def test_embedding_revision_and_delete(app, client):
    c = client.post('/api/contacts', json={'name': '第一次'}).json()
    client.put(f'/api/contacts/{c["id"]}', json={'revision': 1, 'data': {'name': '第二次'}})
    for _ in range(3):
        run_one(app.state.factory, app.state.settings, FakeAI())
    with app.state.factory() as db:
        assert db.get(Embedding, c['id']).revision == 2
    client.delete(f'/api/contacts/{c["id"]}?revision=2')
    with app.state.factory() as db:
        assert db.get(Embedding, c['id']) is None


def test_failed_job_retries_are_durable(app, client):
    class OfflineAI:
        def embed(self, text):
            raise AIUnavailable('Ollama unavailable')
    client.post('/api/contacts', json={'name': '離線測試'})
    for _ in range(3):
        run_one(app.state.factory, app.state.settings, OfflineAI())
        with app.state.factory.begin() as db:
            job = db.scalar(select(Job))
            job.available = 0
    job = client.get('/api/jobs').json()[0]
    assert job['status'] == 'failed'
    assert job['attempts'] == 3
    assert client.post(f'/api/jobs/{job["id"]}/retry').status_code == 200
    run_one(app.state.factory, app.state.settings, FakeAI())
    assert client.get('/api/jobs').json()[0]['status'] == 'done'


def test_search_degrades_honestly_and_filters(app, client):
    class OfflineAI:
        def embed(self, text):
            raise AIUnavailable('offline')
    app.state.ai = OfflineAI()
    client.post('/api/contacts', json={'name': '王小明', 'company': '甲公司'})
    client.post('/api/contacts', json={'name': '王小明', 'company': '乙公司'})
    results = client.get('/api/search', params={'q': '王小明', 'company': '甲公司'}).json()
    assert len(results['items']) == 1
    assert results['semantic'] in {'unavailable', 'disabled_sqlite'}
    assert 'semantic' not in results['items'][0]['sources']
    assert client.get('/api/search', params={'q': '%'}).json()['items'] == []


def test_password_change_revokes_all_sessions(app, client):
    result = client.post('/api/auth/password', json={'current_password': 'Admin-password-123!', 'new_password': 'Replacement-password-123!'})
    assert result.status_code == 200
    assert client.get('/api/auth/me').status_code == 401
    with app.state.factory() as db:
        assert list(db.scalars(select(LoginSession))) == []


def test_admin_can_disable_member(app, client):
    users = client.get('/api/users').json()
    member = next(u for u in users if u['username'] == 'member')
    assert client.delete(f'/api/users/{member["id"]}').status_code == 200
    client.post('/api/auth/logout')
    assert client.post('/api/auth/login', json={'username': 'member', 'password': 'Member-password-123!'}).status_code == 401


def test_export_is_authenticated_and_preserves_unicode(client):
    client.post('/api/contacts', json={'name': '繁體中文', 'notes': '多行\n內容'})
    exported = client.get('/api/export/contacts').json()
    assert exported['version'] == 1
    assert exported['items'][0]['data']['name'] == '繁體中文'
