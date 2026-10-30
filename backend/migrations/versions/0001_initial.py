"""Initial team library, sessions, cards, durable jobs and 1024-dimensional vectors."""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = '0001'
down_revision = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute('CREATE EXTENSION IF NOT EXISTS vector')
        op.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    # Frozen schema: later ORM changes must never rewrite this historical migration.
    op.create_table('users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(80), nullable=False, unique=True),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('role', sa.String(16), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False))
    op.create_table('sessions',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('expires', sa.Integer(), nullable=False))
    op.create_table('login_attempts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('client', sa.String(64), nullable=False),
        sa.Column('created', sa.Integer(), nullable=False))
    op.create_table('contacts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('search_text', sa.Text(), nullable=False),
        sa.Column('email_key', sa.String(254), nullable=False),
        sa.Column('mobile_key', sa.String(60), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('updated', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False))
    op.create_table('cards',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('sha256', sa.String(64), nullable=False, unique=True),
        sa.Column('contact_id', sa.String(36), sa.ForeignKey('contacts.id', ondelete='SET NULL')),
        sa.Column('uploaded_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created', sa.Integer(), nullable=False),
        sa.Column('ocr_text', sa.Text()),
        sa.Column('proposal', sa.JSON()),
        sa.Column('verified', sa.Boolean(), nullable=False))
    op.create_table('embeddings',
        sa.Column('contact_id', sa.String(36), sa.ForeignKey('contacts.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('model_digest', sa.String(100), nullable=False),
        sa.Column('vector', Vector(1024).with_variant(sa.JSON(), 'sqlite'), nullable=False))
    op.create_table('jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('kind', sa.String(16), nullable=False),
        sa.Column('target_id', sa.String(36), nullable=False),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(16), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('available', sa.Integer(), nullable=False),
        sa.Column('lease_until', sa.Integer(), nullable=False),
        sa.Column('lease_token', sa.String(36)),
        sa.Column('error', sa.String(240)),
        sa.Column('created', sa.Integer(), nullable=False))
    op.create_table('audit',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(60), nullable=False),
        sa.Column('target_id', sa.String(36), nullable=False),
        sa.Column('created', sa.Integer(), nullable=False))
    for table, columns in {
        'sessions': ['user_id', 'expires'], 'login_attempts': ['client', 'created'],
        'contacts': ['email_key', 'mobile_key'], 'jobs': ['status'],
    }.items():
        for column in columns:
            op.create_index(f'ix_{table}_{column}', table, [column])
    if bind.dialect.name == 'postgresql':
        op.execute('CREATE INDEX contacts_trgm ON contacts USING gin (lower(search_text) gin_trgm_ops)')
        op.execute('CREATE INDEX embeddings_hnsw ON embeddings USING hnsw (vector vector_cosine_ops)')


def downgrade():
    raise RuntimeError('Destructive downgrade disabled; restore an explicitly selected backup instead')
