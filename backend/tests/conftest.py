import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.config import Settings
from app.main import create_app, passwords
from app.models import Base, User
from alembic import command
from alembic.config import Config
from pathlib import Path


@pytest.fixture
def app(tmp_path, monkeypatch):
    url = os.environ.get('TEST_DATABASE_URL', f'sqlite:///{tmp_path / "test.db"}')
    if not url.startswith('sqlite') and not url.rsplit('/', 1)[-1].endswith('_test'):
        raise RuntimeError('TEST_DATABASE_URL must end in _test; refusing to touch a production database')
    settings = Settings(database_url=url, allow_sqlite=url.startswith('sqlite'), data_dir=tmp_path,
                        origin='http://testserver', cookie_secure=False)
    app = create_app(settings)
    # TEST_DATABASE_URL must refer exclusively to a throwaway test database.
    if app.state.engine.dialect.name == 'postgresql':
        with app.state.engine.begin() as conn:
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
            conn.execute(text('CREATE EXTENSION IF NOT EXISTS pg_trgm'))
    Base.metadata.drop_all(app.state.engine)
    with app.state.engine.begin() as conn:
        conn.execute(text('DROP TABLE IF EXISTS alembic_version'))
    monkeypatch.setenv('OMNICARD_DATABASE_URL', url)
    monkeypatch.setenv('OMNICARD_ALLOW_SQLITE', str(url.startswith('sqlite')).lower())
    config = Config(str(Path(__file__).parents[1] / 'alembic.ini'))
    config.set_main_option('script_location', str(Path(__file__).parents[1] / 'migrations'))
    command.upgrade(config, 'head')
    with app.state.factory.begin() as db:
        db.add(User(username='admin', password_hash=passwords.hash('Admin-password-123!'), role='admin'))
        db.add(User(username='member', password_hash=passwords.hash('Member-password-123!'), role='member'))
    yield app
    app.state.engine.dispose()


@pytest.fixture
def client(app):
    with TestClient(app, headers={'Origin': 'http://testserver'}) as client:
        assert client.post('/api/auth/login', json={'username': 'admin', 'password': 'Admin-password-123!'}).status_code == 200
        yield client
