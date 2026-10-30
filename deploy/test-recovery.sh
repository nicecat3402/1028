#!/usr/bin/env bash
# CI-only: synthetic data in two disposable, explicitly named Compose projects.
set -euo pipefail
cd "$(dirname "$0")"
[[ "${CI:-}" == true ]] || { echo 'Run only in disposable CI.' >&2; exit 1; }
export COMPOSE_PROJECT_NAME=omnicard-ci-source
backup="$RUNNER_TEMP/omnicard-recovery-backup"
cleanup() {
  COMPOSE_PROJECT_NAME=omnicard-ci-source docker compose down --volumes
  COMPOSE_PROJECT_NAME=omnicard-ci-restore docker compose down --volumes
}
trap cleanup EXIT
docker compose up -d db api worker web
curl --fail --retry 30 --retry-delay 2 --retry-all-errors http://127.0.0.1:8090/api/health
docker compose exec -T api uv run --no-sync python - <<'PY'
from pathlib import Path
from hashlib import sha256
from PIL import Image
import io
from app.config import Settings
from app.db import database
from app.models import User, Contact, Card, LoginSession
from app.schemas import ContactData, search_document

_, factory = database(Settings())
output = io.BytesIO()
Image.new('RGB', (40, 20), 'white').save(output, format='PNG')
image = output.getvalue()
digest = sha256(image).hexdigest()
Path(f'/data/images/{digest}.png').write_bytes(image)
with factory.begin() as db:
    user = User(username='recovery-test', password_hash='synthetic-non-login-hash', role='admin')
    db.add(user)
    db.flush()
    data = ContactData(name='還原測試', company='合成資料').model_dump(mode='json')
    contact = Contact(data=data, search_text=search_document(data), created_by=user.id)
    db.add(contact)
    db.flush()
    db.add(Card(sha256=digest, contact_id=contact.id, uploaded_by=user.id, verified=True))
    db.add(LoginSession(token_hash='0' * 64, user_id=user.id, expires=2000000000))
PY
bash backup.sh "$backup"
docker compose stop web api worker
export COMPOSE_PROJECT_NAME=omnicard-ci-restore
docker compose build api
bash restore.sh "$backup" --confirm-empty-target
docker compose run --rm --no-deps -T api uv run --no-sync alembic upgrade head
docker compose run --rm --no-deps -T api uv run --no-sync python - <<'PY'
from pathlib import Path
from hashlib import sha256
from sqlalchemy import select, func
from app.config import Settings
from app.db import database
from app.models import Contact, Card, LoginSession

_, factory = database(Settings())
with factory() as db:
    assert db.scalar(select(func.count()).select_from(Contact)) == 1
    contact = db.scalar(select(Contact))
    assert contact.data['name'] == '還原測試'
    card = db.scalar(select(Card))
    assert card.verified and card.contact_id == contact.id
    assert sha256(Path(f'/data/images/{card.sha256}.png').read_bytes()).hexdigest() == card.sha256
    assert db.scalar(select(func.count()).select_from(LoginSession)) == 0
PY
if bash restore.sh "$backup" --confirm-empty-target; then
  echo 'ERROR: restore accepted a nonempty database' >&2
  exit 1
fi
echo 'Backup/restore round-trip and nonempty-target rejection passed.'
