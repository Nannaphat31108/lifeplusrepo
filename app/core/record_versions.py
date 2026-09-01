"""Shared version-history snapshot helper for SourceFormRecord (F-RD-*) and
PurchaseDocument (PO/PR). Both routers call this right before they overwrite
a record's payload_json/status/etc on update, so past states stay
recoverable. One RecordVersion table for both record kinds (see
app/models/entities.py) via a `record_type` discriminator, rather than two
near-identical tables.

No version is written on create -- there's nothing to snapshot yet.
"""
from sqlalchemy.orm import Session

from app.models.entities import RecordVersion


def snapshot_version(
    db: Session,
    *,
    record_type: str,
    record_id: int,
    payload_json: str,
    label: str | None,
    status: str | None,
    user,
) -> None:
    db.add(RecordVersion(
        record_type=record_type,
        record_id=record_id,
        payload_json=payload_json,
        label=label,
        status=status,
        saved_by=getattr(user, "id", None),
        saved_by_name=getattr(user, "full_name", None),
    ))


def serialize_version(v: RecordVersion) -> dict:
    return {
        "id": v.id,
        "label": v.label,
        "status": v.status,
        "saved_by_name": v.saved_by_name,
        "saved_at": v.saved_at,
    }
