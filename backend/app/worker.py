"""Durable DB queue. Run one worker per GPU; never load models from a browser."""
import logging
import time
from sqlalchemy import select, or_, and_
from .ai import Ollama, AIUnavailable, acquire_ai_slot
from .config import Settings
from .db import database
from .models import Job, Card, Contact, Embedding, uid, now

log = logging.getLogger(__name__)


def claim(factory):
    with factory.begin() as db:
        job = db.scalar(select(Job).where(or_(
            and_(Job.status == "queued", Job.available <= now()),
            and_(Job.status == "running", Job.lease_until < now()),
        )).order_by(Job.created).with_for_update(skip_locked=True).limit(1))
        if not job:
            return None
        if job.attempts >= 3:
            job.status = "failed"
            job.error = "Job exceeded retry limit"
            return None
        job.status, job.lease_token = "running", uid()
        job.lease_until = now() + 900
        job.attempts += 1
        return job.id, job.lease_token


def run_one(factory, settings, ai=None):
    claimed = claim(factory)
    if not claimed:
        return False
    job_id, token = claimed
    ai = ai or Ollama(settings)
    try:
        with factory() as db:
            job = db.get(Job, job_id)
            kind, target_id, revision = job.kind, job.target_id, job.revision
            obj = db.get(Card if kind == "ocr" else Contact, target_id)
            if not obj:
                result = None
            elif kind == "ocr":
                acquire_ai_slot(db)
                image_path = settings.data_dir / "images" / f"{obj.sha256}.png"
                result = ai.ocr(image_path.read_bytes())
            elif obj.revision != revision:
                result = None
            else:
                acquire_ai_slot(db)
                result = ai.embed(obj.search_text)
        with factory.begin() as db:
            job = db.scalar(select(Job).where(Job.id == job_id).with_for_update())
            if not job or job.lease_token != token:
                return True
            if result is not None and kind == "ocr":
                card = db.get(Card, target_id)
                if card and not card.verified:
                    card.ocr_text = result
            elif result is not None:
                contact = db.scalar(select(Contact).where(Contact.id == target_id).with_for_update())
                if contact and contact.revision == revision:
                    vector, digest = result
                    db.merge(Embedding(contact_id=target_id, revision=revision, vector=vector, model_digest=digest))
            job.status, job.error, job.lease_token = "done", None, None
    except Exception as exc:
        with factory.begin() as db:
            job = db.get(Job, job_id)
            if job and job.lease_token == token:
                job.status = "failed" if job.attempts >= 3 else "queued"
                job.available = now() + 30 * job.attempts
                job.error = str(exc) if isinstance(exc, AIUnavailable) else "Processing failed; check service configuration"
                job.lease_token = None
        log.warning("Job %s failed (%s)", job_id, type(exc).__name__)
    return True


def main():
    settings = Settings()
    _, factory = database(settings)
    while True:
        if not run_one(factory, settings):
            time.sleep(2)


if __name__ == "__main__":
    main()
