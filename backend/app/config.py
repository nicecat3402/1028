from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OMNICARD_", extra="ignore")
    database_url: str = "postgresql+psycopg://omnicard@localhost/omnicard"
    data_dir: Path = Path("./data")
    origin: str = "http://localhost:8090"
    cookie_secure: bool = True
    session_hours: int = 12
    ollama_url: str = "http://127.0.0.1:11434"
    embedding_model: str = "bge-m3:latest"
    # Pin to the digest from /api/tags in production, so replacing a tag cannot mix vector spaces.
    embedding_digest: str = ""
    ocr_model: str = "glm-ocr:latest"
    ai_timeout: float = 180
    allow_sqlite: bool = False  # Tests / local development only, never production semantic search.

    @model_validator(mode="after")
    def validate_settings(self):
        if self.database_url.startswith("sqlite") and not self.allow_sqlite:
            raise ValueError("SQLite is for tests only; production requires PostgreSQL + pgvector")
        if not 1 <= self.session_hours <= 72:
            raise ValueError("session_hours must be between 1 and 72")
        self.origin = self.origin.rstrip("/")
        self.ollama_url = self.ollama_url.rstrip("/")
        return self
