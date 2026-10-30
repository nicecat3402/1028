from datetime import date
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .domain import tax_checksum, phone_key


class ContactData(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)
    company: str = Field(default="", max_length=200)
    department: str = Field(default="", max_length=100)
    title: str = Field(default="", max_length=100)
    email: str = Field(default="", max_length=254)
    mobile: str = Field(default="", max_length=60)
    phone: str = Field(default="", max_length=60)
    extension: str = Field(default="", max_length=20)
    address: str = Field(default="", max_length=400)
    tax_id: str = Field(default="", max_length=8, pattern=r"^(\d{8})?$")
    notes: str = Field(default="", max_length=4000)
    tags: list[str] = Field(default_factory=list, max_length=30)
    acquired_at: date | None = None

    @field_validator('tax_id')
    @classmethod
    def check_tax(cls, value):
        if value and not tax_checksum(value):
            raise ValueError('Invalid Taiwan tax ID checksum')
        return value

    @field_validator("tags")
    @classmethod
    def valid_tags(cls, values):
        if any(not v.strip() or len(v) > 60 for v in values):
            raise ValueError("Each tag must contain 1-60 characters")
        return list(dict.fromkeys(v.strip() for v in values))


class ContactUpdate(BaseModel):
    revision: int = Field(ge=1)
    data: ContactData


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class NewUser(Login):
    username: str = Field(min_length=3, max_length=80, pattern=r'^[a-zA-Z0-9_.-]+$')
    role: str = Field(default="member", pattern="^(admin|member)$")

    @field_validator("password")
    @classmethod
    def strong_password(cls, value):
        if len(value) < 12:
            raise ValueError("Use at least 12 characters")
        return value


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: str = Field(min_length=12, max_length=256)


class Review(BaseModel):
    data: ContactData
    contact_id: str | None = None
    revision: int | None = None


class MergeRequest(BaseModel):
    source_id: str
    target_id: str
    source_revision: int = Field(ge=1)
    target_revision: int = Field(ge=1)
    data: ContactData


class ImportItem(BaseModel):
    id: UUID
    data: ContactData


class ContactImport(BaseModel):
    format: Literal['omnicard-contacts']
    version: Literal[1]
    items: list[ImportItem] = Field(max_length=1000)


def search_document(data: dict):
    content = "\n".join(str(v) if not isinstance(v, list) else " ".join(v) for v in data.values() if v)
    return content + '\n' + phone_key(data.get('mobile', '')) + '\n' + phone_key(data.get('phone', ''))
