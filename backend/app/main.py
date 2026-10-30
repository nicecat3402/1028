import hashlib
import io
import os
import secrets
import tempfile
import warnings
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError
from pwdlib import PasswordHash
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .ai import AIUnavailable, Ollama
from .config import Settings
from .db import database
from .models import Audit, Card, Contact, Embedding, Job, LoginAttempt, LoginSession, User, now
from .schemas import ContactData, ContactUpdate, ContactImport, MergeRequest, Login, NewUser, PasswordChange, Review, search_document

passwords = PasswordHash.recommended()
DUMMY_HASH = passwords.hash("not-a-real-account-password")
COOKIE = "omnicard_session"
MAX_UPLOAD = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 24_000_000


def contact_json(c):
    return {"id": c.id, "revision": c.revision, "updated": c.updated, "data": c.data}


def card_json(c):
    return {"id": c.id, "contact_id": c.contact_id, "verified": c.verified,
            "ocr_text": c.ocr_text, "created": c.created, "image_url": f"/api/cards/{c.id}/image"}


def user_json(u):
    return {"id": u.id, "username": u.username, "role": u.role, "active": u.active}


def record(db, user, action, target):
    db.add(Audit(user_id=user.id, action=action, target_id=target))


def enqueue_embedding(db, contact):
    db.flush()
    db.execute(delete(Embedding).where(Embedding.contact_id == contact.id))
    db.add(Job(kind="embed", target_id=contact.id, revision=contact.revision))


def create_app(settings=None):
    settings = settings or Settings()
    engine, factory = database(settings)
    images = settings.data_dir / "images"

    @asynccontextmanager
    async def lifespan(app):
        images.mkdir(parents=True, exist_ok=True)
        yield
        engine.dispose()

    app = FastAPI(title="OmniCard On-Prem API", lifespan=lifespan, docs_url=None, redoc_url=None)
    app.state.factory, app.state.engine, app.state.settings = factory, engine, settings
    app.state.ai = Ollama(settings)

    @app.middleware("http")
    async def security(request: Request, call_next):
        if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
            if request.headers.get("origin") != settings.origin:
                return JSONResponse({"detail": "Untrusted or missing Origin"}, status_code=403)
        if request.url.path.startswith('/api/'):
            length = request.headers.get('content-length')
            if length and (not length.isdigit() or int(length) > MAX_UPLOAD + 65536):
                return JSONResponse({"detail": "Request too large"}, status_code=413)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    def get_db():
        with factory() as db:
            yield db

    DB = Annotated[Session, Depends(get_db)]

    def current_user(request: Request, db: DB):
        token = request.cookies.get(COOKIE, "")
        session = db.get(LoginSession, hashlib.sha256(token.encode()).hexdigest()) if token else None
        user = db.get(User, session.user_id) if session and session.expires > now() else None
        if not user or not user.active:
            raise HTTPException(401, "Login required")
        return user

    Auth = Annotated[User, Depends(current_user)]

    def admin(user: Auth):
        if user.role != "admin":
            raise HTTPException(403, "Administrator required")
        return user

    Admin = Annotated[User, Depends(admin)]

    @app.get('/api/health')
    def health(db: DB):
        db.execute(text("SELECT 1"))
        return {"status": "ok", "mode": "onprem"}

    @app.post('/api/auth/login')
    def login(body: Login, request: Request, response: Response, db: DB):
        # Use socket peer, not client-controlled forwarded headers. Behind nginx this is a shared throttle.
        client = hashlib.sha256((request.client.host if request.client else 'unknown').encode()).hexdigest()
        db.execute(delete(LoginAttempt).where(LoginAttempt.created < now() - 900))
        attempts = db.scalar(select(func.count()).select_from(LoginAttempt).where(LoginAttempt.client == client))
        if attempts >= 20:
            raise HTTPException(429, "Too many login attempts; retry in 15 minutes")
        user = db.scalar(select(User).where(User.username == body.username.strip().lower()))
        valid = passwords.verify(body.password, user.password_hash if user else DUMMY_HASH)
        if not user or not valid or not user.active:
            db.add(LoginAttempt(client=client))
            db.commit()
            raise HTTPException(401, "Invalid username or password")
        db.execute(delete(LoginSession).where(LoginSession.expires < now()))
        token = secrets.token_urlsafe(32)
        db.add(LoginSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                            expires=now() + settings.session_hours * 3600))
        record(db, user, 'login', user.id)
        db.commit()
        response.set_cookie(COOKIE, token, httponly=True, secure=settings.cookie_secure,
                            samesite="strict", max_age=settings.session_hours * 3600, path="/api")
        return user_json(user)

    @app.get('/api/auth/me')
    def me(user: Auth):
        return user_json(user)

    @app.post('/api/auth/logout')
    def logout(request: Request, response: Response, db: DB):
        token = request.cookies.get(COOKIE, '')
        db.execute(delete(LoginSession).where(LoginSession.token_hash == hashlib.sha256(token.encode()).hexdigest()))
        db.commit()
        response.delete_cookie(COOKIE, path="/api")
        return {"ok": True}

    @app.post('/api/auth/password')
    def change_password(body: PasswordChange, user: Auth, db: DB, response: Response):
        if not passwords.verify(body.current_password, user.password_hash):
            raise HTTPException(400, "Current password is incorrect")
        user.password_hash = passwords.hash(body.new_password)
        db.execute(delete(LoginSession).where(LoginSession.user_id == user.id))
        record(db, user, 'password_changed', user.id)
        db.commit()
        response.delete_cookie(COOKIE, path='/api')
        return {"ok": True}

    @app.get('/api/users')
    def users(user: Admin, db: DB):
        return [user_json(u) for u in db.scalars(select(User).order_by(User.username))]

    @app.post('/api/users', status_code=201)
    def add_user(body: NewUser, user: Admin, db: DB):
        new = User(username=body.username.strip().lower(), password_hash=passwords.hash(body.password), role=body.role)
        db.add(new)
        try:
            db.flush()
            record(db, user, 'user_created', new.id)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Username already exists")
        return user_json(new)

    @app.delete('/api/users/{user_id}')
    def disable_user(user_id: str, user: Admin, db: DB):
        if user_id == user.id:
            raise HTTPException(400, "Cannot disable your own account")
        target = db.get(User, user_id)
        if not target:
            raise HTTPException(404, "User not found")
        target.active = False
        db.execute(delete(LoginSession).where(LoginSession.user_id == user_id))
        record(db, user, 'user_disabled', user_id)
        db.commit()
        return {"ok": True}

    @app.get('/api/contacts')
    def contacts(user: Auth, db: DB, offset: int = 0, limit: int = 100):
        offset, limit = max(0, offset), min(200, max(1, limit))
        return {"total": db.scalar(select(func.count()).select_from(Contact)), "items": [
            contact_json(c) for c in db.scalars(select(Contact).order_by(Contact.updated.desc(), Contact.id).offset(offset).limit(limit))
        ]}

    @app.post('/api/contacts', status_code=201)
    def add_contact(body: ContactData, user: Auth, db: DB):
        data = body.model_dump(mode="json")
        contact = Contact(data=data, search_text=search_document(data), created_by=user.id)
        db.add(contact)
        enqueue_embedding(db, contact)
        record(db, user, 'contact_created', contact.id)
        db.commit()
        return contact_json(contact)

    @app.get('/api/contacts/{contact_id}')
    def get_contact(contact_id: str, user: Auth, db: DB):
        contact = db.get(Contact, contact_id)
        if not contact:
            raise HTTPException(404, 'Contact not found')
        return contact_json(contact)

    def edit_contact(db, contact_id, data, revision):
        contact = db.scalar(select(Contact).where(Contact.id == contact_id).with_for_update())
        if not contact:
            raise HTTPException(404, "Contact not found")
        if contact.revision != revision:
            raise HTTPException(409, "Contact was modified by another user; reload before editing")
        contact.data, contact.search_text = data, search_document(data)
        contact.revision += 1
        contact.updated = now()
        enqueue_embedding(db, contact)
        return contact

    @app.put('/api/contacts/{contact_id}')
    def update_contact(contact_id: str, body: ContactUpdate, user: Auth, db: DB):
        contact = edit_contact(db, contact_id, body.data.model_dump(mode='json'), body.revision)
        record(db, user, 'contact_updated', contact.id)
        db.commit()
        return contact_json(contact)

    @app.delete('/api/contacts/{contact_id}')
    def remove_contact(contact_id: str, user: Auth, db: DB, revision: int):
        contact = db.scalar(select(Contact).where(Contact.id == contact_id).with_for_update())
        if not contact:
            raise HTTPException(404, 'Contact not found')
        if contact.revision != revision:
            raise HTTPException(409, 'Contact changed; reload first')
        db.execute(delete(Job).where(Job.target_id == contact_id))
        for card in db.scalars(select(Card).where(Card.contact_id == contact_id)):
            card.contact_id, card.verified = None, False
        db.flush()
        db.execute(delete(Contact).where(Contact.id == contact_id))
        record(db, user, 'contact_deleted', contact_id)
        db.commit()
        return {"ok": True}

    @app.get('/api/cards')
    def cards(user: Auth, db: DB, offset: int = 0):
        return [card_json(c) for c in db.scalars(select(Card).order_by(Card.created.desc(), Card.id).offset(max(0, offset)).limit(100))]

    @app.get('/api/duplicates/{contact_id}')
    def duplicates(contact_id: str, user: Auth, db: DB):
        original = db.get(Contact, contact_id)
        if not original:
            raise HTTPException(404, 'Contact not found')
        # Deterministic candidates, not a claim of AI identity resolution.
        conditions = []
        for key in ['name']:
            value = original.data.get(key, '').strip()
            if value:
                conditions.append(func.lower(Contact.data[key].as_string()) == value.lower())
        if original.email_key:
            conditions.append(Contact.email_key == original.email_key)
        if original.mobile_key:
            conditions.append(Contact.mobile_key == original.mobile_key)
        from sqlalchemy import or_
        matches = db.scalars(select(Contact).where(Contact.id != contact_id, or_(*conditions)).limit(50)) if conditions else []
        return [{**contact_json(c), 'reason': '姓名、Email 或手機相同；請人工確認是否同一人'} for c in matches]

    @app.post('/api/contacts-merge')
    def merge(body: MergeRequest, user: Auth, db: DB):
        if body.source_id == body.target_id:
            raise HTTPException(422, 'Choose two different contacts')
        locked = {c.id: c for c in db.scalars(select(Contact).where(Contact.id.in_([body.source_id, body.target_id]))
                                            .order_by(Contact.id).with_for_update())}
        source, target = locked.get(body.source_id), locked.get(body.target_id)
        if not source or not target:
            raise HTTPException(404, 'Contact not found')
        if source.revision != body.source_revision or target.revision != body.target_revision:
            raise HTTPException(409, 'A contact changed; reload both before merging')
        target = edit_contact(db, target.id, body.data.model_dump(mode='json'), target.revision)
        for card in db.scalars(select(Card).where(Card.contact_id == source.id)):
            card.contact_id = target.id
        db.flush()
        db.execute(delete(Job).where(Job.target_id == source.id))
        db.execute(delete(Contact).where(Contact.id == source.id))
        record(db, user, 'merged_into:' + target.id, source.id)
        db.commit()
        return contact_json(target)

    @app.post('/api/import/contacts')
    def import_contacts(body: ContactImport, user: Admin, db: DB):
        ids = [str(item.id) for item in body.items]
        if len(set(ids)) != len(ids):
            raise HTTPException(422, 'Duplicate IDs in import')
        existing = {c.id: c for c in db.scalars(select(Contact).where(Contact.id.in_(ids)))}
        added = 0
        for item in body.items:
            data = item.data.model_dump(mode='json')
            key = str(item.id)
            if key in existing:
                if existing[key].data != data:
                    raise HTTPException(409, 'Existing contact differs; import aborted without overwriting')
                continue
            contact = Contact(id=key, data=data, search_text=search_document(data), created_by=user.id)
            db.add(contact)
            enqueue_embedding(db, contact)
            added += 1
        record(db, user, 'contacts_imported', user.id)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, 'Concurrent import detected; reload and retry')
        return {'added': added, 'skipped': len(body.items) - added}

    @app.post('/api/cards', status_code=201)
    def upload(user: Auth, db: DB, file: UploadFile = File(...)):
        content = file.file.read(MAX_UPLOAD + 1)
        if len(content) > MAX_UPLOAD:
            raise HTTPException(413, 'Image must be at most 12 MB')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(content)) as original:
                    if original.format not in {'JPEG', 'PNG', 'WEBP'}:
                        raise ValueError('Unsupported format')
                    original.load()
                    image = ImageOps.exif_transpose(original).convert('RGB')
                    image.thumbnail((3000, 3000))
                    output = io.BytesIO()
                    image.save(output, format='PNG')
                    image_bytes = output.getvalue()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise HTTPException(422, 'Upload a valid JPEG, PNG or WebP image, at most 24 megapixels')
        digest = hashlib.sha256(image_bytes).hexdigest()
        existing = db.scalar(select(Card).where(Card.sha256 == digest))
        if existing:
            return {**card_json(existing), "duplicate": True}
        images.mkdir(parents=True, exist_ok=True)
        path = images / f'{digest}.png'
        # Atomic publish: a concurrent duplicate upload / worker never sees a partially written file.
        with tempfile.NamedTemporaryFile(dir=images, suffix='.tmp', delete=False) as handle:
            temporary = handle.name
            handle.write(image_bytes)
        try:
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        card = Card(sha256=digest, uploaded_by=user.id)
        db.add(card)
        try:
            db.flush()
            db.add(Job(kind='ocr', target_id=card.id))
            record(db, user, 'card_uploaded', card.id)
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.scalar(select(Card).where(Card.sha256 == digest))
            if not existing:
                raise
            return {**card_json(existing), 'duplicate': True}
        return {**card_json(card), 'duplicate': False}

    @app.get('/api/cards/{card_id}/image')
    def image(card_id: str, user: Auth, db: DB):
        card = db.get(Card, card_id)
        if not card:
            raise HTTPException(404, 'Card not found')
        path = images / f'{card.sha256}.png'
        if not path.is_file():
            raise HTTPException(404, 'Image is missing; restore from backup')
        return FileResponse(path, media_type='image/png')

    @app.post('/api/cards/{card_id}/review')
    def review(card_id: str, body: Review, user: Auth, db: DB):
        card = db.scalar(select(Card).where(Card.id == card_id).with_for_update())
        if not card:
            raise HTTPException(404, 'Card not found')
        if card.verified:
            raise HTTPException(409, 'Card already verified; edit the linked contact instead')
        data = body.data.model_dump(mode='json')
        if body.contact_id:
            contact = edit_contact(db, body.contact_id, data, body.revision)
        else:
            contact = Contact(data=data, search_text=search_document(data), created_by=user.id)
            db.add(contact)
            enqueue_embedding(db, contact)
        card.contact_id, card.verified = contact.id, True
        record(db, user, 'card_verified', card.id)
        db.commit()
        return contact_json(contact)

    @app.get('/api/jobs')
    def jobs(user: Auth, db: DB):
        return [{"id": j.id, "kind": j.kind, "target_id": j.target_id, "status": j.status,
                 "error": j.error, "attempts": j.attempts} for j in db.scalars(select(Job).order_by(Job.created.desc(), Job.id).limit(100))]

    @app.post('/api/jobs/{job_id}/retry')
    def retry(job_id: str, user: Auth, db: DB):
        job = db.scalar(select(Job).where(Job.id == job_id).with_for_update())
        if not job:
            raise HTTPException(404, 'Job not found')
        if job.status != 'failed':
            raise HTTPException(409, 'Only failed jobs may be retried')
        job.status, job.attempts, job.available, job.error = 'queued', 0, now(), None
        record(db, user, 'job_retried', job.id)
        db.commit()
        return {"ok": True}

    @app.post('/api/admin/reindex')
    def reindex(user: Admin, db: DB):
        contacts = list(db.scalars(select(Contact)))
        for contact in contacts:
            enqueue_embedding(db, contact)
        record(db, user, 'reindex', user.id)
        db.commit()
        return {"queued": len(contacts)}

    @app.get('/api/search')
    def search(q: str, user: Auth, db: DB, company: str = '', department: str = '', days: int | None = None):
        from .search import search_contacts
        if len(q) > 500 or len(company) > 200 or len(department) > 100 or (days is not None and not 1 <= days <= 3650):
            raise HTTPException(422, 'Search filters out of range')
        return search_contacts(db, app.state.ai, q.strip(), company, department, days)

    @app.get('/api/export/contacts')
    def export(user: Auth, db: DB):
        items = [contact_json(c) for c in db.scalars(select(Contact).order_by(Contact.id))]
        record(db, user, 'contacts_exported', user.id)
        db.commit()
        return JSONResponse({"format": "omnicard-contacts", "version": 1, "items": items},
                            headers={"Content-Disposition": 'attachment; filename="omnicard-contacts.json"'})

    @app.get('/api/audit')
    def audit(user: Admin, db: DB):
        return [{"user_id": a.user_id, "action": a.action, "target_id": a.target_id, "created": a.created}
                for a in db.scalars(select(Audit).order_by(Audit.created.desc(), Audit.id).limit(200))]

    @app.get('/api/status')
    def status(user: Auth, db: DB):
        db.execute(text('SELECT 1'))
        try:
            digest = app.state.ai.digest()
            model_status = 'ready'
        except AIUnavailable:
            digest, model_status = None, 'unavailable'
        indexed = db.scalar(select(func.count()).select_from(Embedding).where(Embedding.model_digest == digest)) if digest else 0
        return {"database": engine.dialect.name, "embedding_model": settings.embedding_model,
                "embedding_status": model_status, "embedding_digest": digest,
                "indexed_contacts": indexed, "total_contacts": db.scalar(select(func.count()).select_from(Contact)),
                "ocr_model": settings.ocr_model, "ocr_status": "Not probed; inspect jobs for actual results"}

    return app
