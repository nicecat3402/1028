FROM ghcr.io/astral-sh/uv:0.12.18 AS uv
FROM python:3.12-slim
COPY --from=uv /uv /usr/local/bin/uv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
RUN useradd -u 10001 -m omnicard && mkdir -p /data/images && chown -R omnicard:omnicard /data /app
USER omnicard
ENV OMNICARD_DATA_DIR=/data
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8091", "--no-access-log"]
