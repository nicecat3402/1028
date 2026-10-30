import time
import uuid
from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from pgvector.sqlalchemy import Vector
from .domain import phone_key


def uid():
    return str(uuid.uuid4())


def now():
    return int(time.time())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(16), default="member")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class LoginSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires: Mapped[int] = mapped_column(Integer, index=True)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    client: Mapped[str] = mapped_column(String(64), index=True)
    created: Mapped[int] = mapped_column(Integer, default=now, index=True)


class Contact(Base):
    __tablename__ = "contacts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    data: Mapped[dict] = mapped_column(JSON)
    search_text: Mapped[str] = mapped_column(Text)
    email_key: Mapped[str] = mapped_column(String(254), default='', index=True)
    mobile_key: Mapped[str] = mapped_column(String(60), default='', index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated: Mapped[int] = mapped_column(Integer, default=now)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))


class Card(Base):
    __tablename__ = "cards"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    contact_id: Mapped[str | None] = mapped_column(ForeignKey("contacts.id", ondelete="SET NULL"))
    uploaded_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created: Mapped[int] = mapped_column(Integer, default=now)
    ocr_text: Mapped[str | None] = mapped_column(Text)
    proposal: Mapped[dict | None] = mapped_column(JSON)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)


@event.listens_for(Contact, 'before_insert')
@event.listens_for(Contact, 'before_update')
def normalize_contact(_mapper, _connection, contact):
    contact.email_key = contact.data.get('email', '').strip().lower()
    contact.mobile_key = phone_key(contact.data.get('mobile', ''))


class Embedding(Base):
    __tablename__ = "embeddings"
    contact_id: Mapped[str] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True)
    revision: Mapped[int] = mapped_column(Integer)
    model_digest: Mapped[str] = mapped_column(String(100))
    vector: Mapped[list] = mapped_column(Vector(1024).with_variant(JSON(), "sqlite"))


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    kind: Mapped[str] = mapped_column(String(16))
    target_id: Mapped[str] = mapped_column(String(36))
    revision: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available: Mapped[int] = mapped_column(Integer, default=now)
    lease_until: Mapped[int] = mapped_column(Integer, default=0)
    lease_token: Mapped[str | None] = mapped_column(String(36))
    error: Mapped[str | None] = mapped_column(String(240))
    created: Mapped[int] = mapped_column(Integer, default=now)


class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36))
    action: Mapped[str] = mapped_column(String(60))
    target_id: Mapped[str] = mapped_column(String(36))
    created: Mapped[int] = mapped_column(Integer, default=now)
