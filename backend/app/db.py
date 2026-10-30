from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from .config import Settings


def database(settings: Settings):
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    if engine.dialect.name == "sqlite":
        @event.listens_for(engine, "connect")
        def sqlite_fk(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    return engine, sessionmaker(engine, expire_on_commit=False)
