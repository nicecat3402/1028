from datetime import date, timedelta
from sqlalchemy import select, func
from .models import Contact, Embedding
from .ai import AIUnavailable, acquire_ai_slot
from .domain import phone_key


def search_contacts(db, ai, query, company='', department='', days=None):
    conditions = []
    if company:
        conditions.append(Contact.data['company'].as_string() == company)
    if department:
        conditions.append(Contact.data['department'].as_string() == department)
    if days is not None:
        conditions += [Contact.data['acquired_at'].as_string() >= (date.today() - timedelta(days=days)).isoformat(),
                       Contact.data['acquired_at'].as_string() <= date.today().isoformat()]
    base = select(Contact).where(*conditions)
    if not query:
        return {"items": [{"id": c.id, "revision": c.revision, "data": c.data, "score": None, "sources": []}
                          for c in db.scalars(base.order_by(Contact.updated.desc(), Contact.id).limit(100))],
                "semantic": "not_requested", "fuzzy": "not_requested", "limit": 100}
    normalized = phone_key(query) if query.strip().startswith(('+', '0', '886')) else ''
    from sqlalchemy import or_
    literal_condition = func.lower(Contact.search_text).contains(query.lower(), autoescape=True)
    if normalized:
        literal_condition = or_(literal_condition, Contact.mobile_key == normalized)
    literal = list(db.scalars(base.where(literal_condition)
                             .order_by(Contact.updated.desc(), Contact.id).limit(100)))
    postgres = db.bind.dialect.name == 'postgresql'
    fuzzy, vector = [], []
    semantic_status = 'unavailable'
    if postgres:
        similarity = func.word_similarity(query.lower(), func.lower(Contact.search_text))
        fuzzy = list(db.scalars(base.where(similarity >= 0.2).order_by(similarity.desc(), Contact.id).limit(100)))
        try:
            acquire_ai_slot(db)
            embedding, digest = ai.embed(query)
            vector = list(db.scalars(base.join(Embedding, Embedding.contact_id == Contact.id).where(
                Embedding.model_digest == digest, Embedding.revision == Contact.revision,
            ).order_by(Embedding.vector.cosine_distance(embedding), Contact.id).limit(100)))
            semantic_status = 'ready' if vector else 'index_empty'
        except AIUnavailable:
            semantic_status = 'unavailable'
    else:
        semantic_status = 'disabled_sqlite'
    results = {}
    for name, path in [('exact', literal), ('fuzzy', fuzzy), ('semantic', vector)]:
        for rank, contact in enumerate(path, 1):
            item = results.setdefault(contact.id, {"id": contact.id, "revision": contact.revision,
                                                  "data": contact.data, "score": 0, "sources": []})
            item['score'] += 1 / (60 + rank)
            item['sources'].append(name)
    return {"items": sorted(results.values(), key=lambda r: (-r['score'], r['id']))[:100],
            "semantic": semantic_status, "fuzzy": 'ready' if postgres else 'disabled_sqlite', "limit": 100}
