from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.core.notify import send_line_notify
from app.models.entities import WorkHandoff, SourceFormRecord, PurchaseDocument

router = APIRouter(prefix="/api/work-handoffs", tags=["Work Handoffs"])

ALL_DEPARTMENTS = [
    "RD", "ADMIN", "SALE", "JOB", "PLANNING", "STOCK", "PURCHASE",
    "PRODUCTION", "GRAPHIC", "QC", "QUALITY", "CEO",
]

# Same role -> department fallback used on the frontend/auth side, for
# legacy shared accounts that don't have User.department set directly.
_LEGACY_ROLE_DEPARTMENT = {
    "RD_HEAD": "RD", "RD_ASSISTANT": "RD", "RD_OFFICER": "RD",
    "SALES": "SALE", "JOB": "JOB", "PLANNING": "PLANNING", "STOCK": "STOCK",
    "PURCHASE": "PURCHASE", "PRODUCTION": "PRODUCTION", "GRAPHIC": "GRAPHIC",
    "QC": "QC", "QUALITY": "QUALITY", "CEO": "CEO", "ADMIN": "ADMIN",
}


def _caller_department(u) -> str:
    dept = (getattr(u, "department", None) or "").strip().upper()
    if dept:
        return dept
    dept = _LEGACY_ROLE_DEPARTMENT.get(u.role)
    if dept:
        return dept
    raise HTTPException(400, "บัญชีนี้ไม่มีแผนกที่ชัดเจน กรุณาให้ ADMIN ตั้งค่าแผนกก่อน")


class HandoffCreate(BaseModel):
    to_departments: list[str]
    subject: str
    message: str | None = None
    reference: str | None = None


def _serialize(x: WorkHandoff) -> dict:
    return {
        "id": x.id,
        "from_department": x.from_department,
        "to_department": x.to_department,
        "from_user_name": x.from_user_name,
        "subject": x.subject,
        "message": x.message,
        "reference": x.reference,
        "status": x.status,
        "created_at": x.created_at,
        "received_at": x.received_at,
        "done_at": x.done_at,
    }


@router.get("/departments")
def departments(u=Depends(get_current_user)):
    """All department codes a handoff can target, plus the caller's own
    department (so the frontend can exclude it from the "send to" picker)."""
    return {"departments": ALL_DEPARTMENTS, "own_department": _caller_department(u)}


@router.post("")
def create_handoff(
    p: HandoffCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Send the same piece of work to one or more departments at once --
    one WorkHandoff row per department (so each department's inbox/status
    tracking stays exactly as if it had been sent individually), created
    together in one request."""
    if not (p.subject or "").strip():
        raise HTTPException(400, "กรุณาใส่หัวข้องาน")

    # Dedupe while preserving order, validate every target up front so a
    # request with one bad department code fails atomically (nothing half-sent).
    seen = set()
    to_depts = []
    for raw in p.to_departments or []:
        d = (raw or "").strip().upper()
        if d and d not in seen:
            seen.add(d)
            to_depts.append(d)
    if not to_depts:
        raise HTTPException(400, "กรุณาเลือกแผนกปลายทางอย่างน้อย 1 แผนก")
    bad = [d for d in to_depts if d not in ALL_DEPARTMENTS]
    if bad:
        raise HTTPException(400, f"ไม่พบแผนกปลายทาง: {', '.join(bad)}")

    from_dept = _caller_department(u)
    to_depts = [d for d in to_depts if d != from_dept]
    if not to_depts:
        raise HTTPException(400, "ไม่สามารถส่งงานถึงแผนกตัวเองได้")

    created = []
    for to_dept in to_depts:
        x = WorkHandoff(
            from_department=from_dept,
            to_department=to_dept,
            from_user_id=u.id,
            from_user_name=u.full_name,
            subject=p.subject.strip(),
            message=(p.message or "").strip() or None,
            reference=(p.reference or "").strip() or None,
            status="SENT",
        )
        db.add(x)
        created.append(x)
    db.commit()
    for x in created:
        db.refresh(x)

    # Best-effort, never blocks the response -- see app/core/notify.py.
    notify_text = f"📋 งานใหม่จาก {from_dept} ถึง {', '.join(to_depts)}\nโดย {u.full_name}\nหัวข้อ: {created[0].subject}"
    if created[0].message:
        notify_text += f"\n{created[0].message}"
    background_tasks.add_task(send_line_notify, notify_text)

    return [_serialize(x) for x in created]


@router.get("/reference-search")
def reference_search(
    q: str,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    x_person_key: str | None = Header(default=None, alias="X-Person-Key"),
):
    """Typeahead for the handoff "reference" field: matching record numbers
    the caller can point at, so they type/pick a real เลขที่รายการ instead
    of a free-text guess. Two sources, combined:
      - the caller's own F-RD-*/ADMIN-* records (private, so scoped to
        this person -- only searched when X-Person-Key is present)
      - PO/PR documents (department-shared, same as everywhere else they
        appear, so always searched regardless of person key)
    """
    q = (q or "").strip()
    if len(q) < 1:
        return []
    like = f"%{q}%"
    results = []

    if x_person_key:
        rows = db.execute(
            select(SourceFormRecord.record_no, SourceFormRecord.form_code)
            .where(
                SourceFormRecord.created_by == u.id,
                SourceFormRecord.owner_person_key == x_person_key.strip().upper(),
                SourceFormRecord.record_no.ilike(like),
            )
            .order_by(SourceFormRecord.id.desc())
            .limit(15)
        ).all()
        for record_no, form_code in rows:
            results.append({"value": record_no, "label": f"{record_no} ({form_code})"})

    rows = db.execute(
        select(PurchaseDocument.doc_no, PurchaseDocument.doc_type)
        .where(PurchaseDocument.doc_no.ilike(like))
        .order_by(PurchaseDocument.id.desc())
        .limit(15)
    ).all()
    for doc_no, doc_type in rows:
        results.append({"value": doc_no, "label": f"{doc_no} ({doc_type})"})

    return results[:20]


@router.get("/inbox")
def inbox(
    status: str | None = None,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Work sent TO the caller's own department."""
    dept = _caller_department(u)
    conditions = [WorkHandoff.to_department == dept]
    if status:
        conditions.append(WorkHandoff.status == status.strip().upper())
    rows = db.scalars(
        select(WorkHandoff).where(*conditions).order_by(WorkHandoff.id.desc())
    ).all()
    return [_serialize(x) for x in rows]


@router.get("/sent")
def sent(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Work the caller's own department has sent out, to track its status."""
    dept = _caller_department(u)
    rows = db.scalars(
        select(WorkHandoff)
        .where(WorkHandoff.from_department == dept)
        .order_by(WorkHandoff.id.desc())
    ).all()
    return [_serialize(x) for x in rows]


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Count of items in the caller's inbox still at SENT (not yet
    acknowledged) -- for a sidebar badge."""
    dept = _caller_department(u)
    n = db.scalar(
        select(func.count()).select_from(WorkHandoff).where(
            WorkHandoff.to_department == dept,
            WorkHandoff.status == "SENT",
        )
    ) or 0
    return {"count": int(n)}


def _get_inbox_item(db: Session, u, handoff_id: int) -> WorkHandoff:
    x = db.get(WorkHandoff, handoff_id)
    if not x or x.to_department != _caller_department(u):
        raise HTTPException(404, "ไม่พบงานนี้")
    return x


@router.post("/{handoff_id}/receive")
def mark_received(handoff_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = _get_inbox_item(db, u, handoff_id)
    if x.status == "SENT":
        x.status = "RECEIVED"
        x.received_at = datetime.utcnow()
        db.commit()
    return _serialize(x)


@router.post("/{handoff_id}/done")
def mark_done(handoff_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = _get_inbox_item(db, u, handoff_id)
    if x.status != "DONE":
        if not x.received_at:
            x.received_at = datetime.utcnow()
        x.status = "DONE"
        x.done_at = datetime.utcnow()
        db.commit()
    return _serialize(x)
