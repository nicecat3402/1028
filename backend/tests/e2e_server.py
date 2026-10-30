"""Ephemeral local-only HTTP server for browser tests; never used in deployment."""
import os
import tempfile
from pathlib import Path
import uvicorn
from app.config import Settings
from app.main import create_app, passwords
from app.models import Base, User


def main():
    with tempfile.TemporaryDirectory(prefix='omnicard-e2e-', dir=os.getenv('OMNICARD_TEST_TEMP')) as directory:
        settings = Settings(database_url=f'sqlite:///{Path(directory) / "e2e.db"}', allow_sqlite=True,
                            data_dir=Path(directory), origin='http://127.0.0.1:18092', cookie_secure=False)
        app = create_app(settings)
        Base.metadata.create_all(app.state.engine)
        with app.state.factory.begin() as db:
            db.add(User(username='testadmin', password_hash=passwords.hash('test-only-password-123'), role='admin'))
        uvicorn.run(app, host='127.0.0.1', port=18091, access_log=False)


if __name__ == '__main__':
    main()
