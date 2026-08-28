import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.entities import PurchaseDocument

router = APIRouter(prefix="/api/purchase-docs", tags=["Purchase Documents"])

DOC_TYPES = {"PO", "PR"}


def _check_doc_type(doc_type: str) -> str:
    d = (doc_type or "").strip().upper()
    if d not in DOC_TYPES:
        raise HTTPException(404, "Unsupported document type (expected PO or PR)")
    return d


class DocSave(BaseModel):
    doc_no: str
    status: str = "DRAFT"
    data: dict
    linked_reference: str | None = None


def _serialize(x: PurchaseDocument) -> dict:
    return {
        "id": x.id,
        "doc_type": x.doc_type,
        "doc_no": x.doc_no,
        "status": x.status,
        "data": json.loads(x.payload_json or "{}"),
        "linked_reference": x.linked_reference,
        "created_by_name": x.created_by_name,
        "created_at": x.created_at,
        "updated_at": x.updated_at,
    }


@router.post("/{doc_type}")
def save_doc(
    doc_type: str,
    p: DocSave,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    d = _check_doc_type(doc_type)
    if not p.data.get("date"):
        p.data["date"] = date.today().isoformat()

    x = PurchaseDocument(
        doc_type=d,
        doc_no=p.doc_no,
        status=p.status,
        payload_json=json.dumps(p.data, ensure_ascii=False, default=str),
        created_by=u.id,
        created_by_name=u.full_name,
        linked_reference=(p.linked_reference or "").strip() or None,
    )
    db.add(x)
    db.commit()
    db.refresh(x)
    return _serialize(x)


@router.get("/{doc_type}")
def list_docs(
    doc_type: str,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Department-shared listing -- same visibility model as Customers/Suppliers:
    any authenticated user can see every PO/PR, not just their own."""
    d = _check_doc_type(doc_type)
    rows = db.scalars(
        select(PurchaseDocument)
        .where(PurchaseDocument.doc_type == d)
        .order_by(PurchaseDocument.id.desc())
    ).all()
    return [_serialize(x) for x in rows]


@router.get("/record/{record_id}")
def get_doc(record_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    return _serialize(x)


@router.put("/record/{record_id}")
def update_doc(
    record_id: int,
    p: DocSave,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    if not p.data.get("date"):
        p.data["date"] = date.today().isoformat()
    x.doc_no = p.doc_no
    x.status = p.status
    x.payload_json = json.dumps(p.data, ensure_ascii=False, default=str)
    if p.linked_reference is not None:
        x.linked_reference = p.linked_reference.strip() or None
    db.commit()
    db.refresh(x)
    return _serialize(x)


@router.delete("/record/{record_id}")
def delete_doc(record_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    db.delete(x)
    db.commit()
    return {"ok": True}
