from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import PackagingPrepItem

router = APIRouter(prefix="/api/packaging-prep", tags=["Packaging Prep (PURCHASE)"])


class PackagingPrepPayload(BaseModel):
    job_code: str
    job_name: str
    item_name: Optional[str] = None
    spec: Optional[str] = None
    supplier: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    cost: Optional[float] = None
    sell_price: Optional[float] = None


def _job_seq_map(db: Session) -> dict:
    """ลำดับ (seq) per job_code, numbered by that job's first-ever row —
    computed fresh on every read instead of stored, so it never needs
    renumbering when rows are added, edited, or deleted."""
    rows = (
        db.query(PackagingPrepItem.job_code, PackagingPrepItem.id)
        .filter(PackagingPrepItem.is_active == True)  # noqa: E712
        .order_by(PackagingPrepItem.id.asc())
        .all()
    )
    seq_map, next_seq = {}, 1
    for job_code, _id in rows:
        key = (job_code or "").strip()
        if key not in seq_map:
            seq_map[key] = next_seq
            next_seq += 1
    return seq_map


def serialize(x: PackagingPrepItem, seq_map: dict) -> dict:
    return {
        "id": x.id,
        "seq": seq_map.get((x.job_code or "").strip()),
        "job_code": x.job_code or "",
        "job_name": x.job_name or "",
        "item_name": x.item_name or "",
        "spec": x.spec or "",
        "supplier": x.supplier or "",
        "quantity": float(x.quantity) if x.quantity is not None else None,
        "unit": x.unit or "",
        "cost": float(x.cost) if x.cost is not None else None,
        "sell_price": float(x.sell_price) if x.sell_price is not None else None,
    }


@router.get("")
def list_packaging_prep(
    q: str = Query(default=""),
    job_code: str = Query(default=""),
    limit: int = Query(default=2000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    seq_map = _job_seq_map(db)
    query = db.query(PackagingPrepItem).filter(PackagingPrepItem.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            PackagingPrepItem.job_code.ilike(like),
            PackagingPrepItem.job_name.ilike(like),
            PackagingPrepItem.item_name.ilike(like),
            PackagingPrepItem.spec.ilike(like),
            PackagingPrepItem.supplier.ilike(like),
        ))
    jc = (job_code or "").strip()
    if jc:
        query = query.filter(PackagingPrepItem.job_code.ilike(jc))
    rows = query.order_by(PackagingPrepItem.id.asc()).limit(limit).all()
    rows = sorted(rows, key=lambda x: (seq_map.get((x.job_code or "").strip()) or 0, x.id))
    return [serialize(x, seq_map) for x in rows]


@router.get("/jobs")
def packaging_prep_jobs(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Distinct (job_code, job_name) pairs, for autocomplete when adding a
    new line to a job that already has other packaging items."""
    rows = (
        db.query(PackagingPrepItem.job_code, PackagingPrepItem.job_name)
        .filter(PackagingPrepItem.is_active == True)  # noqa: E712
        .distinct()
        .all()
    )
    seen, out = set(), []
    for code, name in rows:
        key = (code or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append({"job_code": code, "job_name": name})
    out.sort(key=lambda x: x["job_code"] or "")
    return out


@router.post("")
def create_packaging_prep(
    p: PackagingPrepPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "PURCHASE")),
):
    if not (p.job_code or "").strip():
        raise HTTPException(400, "กรอกรหัสงานก่อน")
    if not (p.job_name or "").strip():
        raise HTTPException(400, "กรอกชื่องานก่อน")
    x = PackagingPrepItem(
        job_code=p.job_code.strip(), job_name=p.job_name.strip(),
        item_name=p.item_name, spec=p.spec, supplier=p.supplier,
        quantity=p.quantity, unit=p.unit, cost=p.cost, sell_price=p.sell_price,
        created_by=user.id,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize(x, _job_seq_map(db))


@router.put("/{item_id}")
def update_packaging_prep(
    item_id: int,
    p: PackagingPrepPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingPrepItem, item_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Packaging prep item not found")
    if not (p.job_code or "").strip():
        raise HTTPException(400, "กรอกรหัสงานก่อน")
    if not (p.job_name or "").strip():
        raise HTTPException(400, "กรอกชื่องานก่อน")
    x.job_code = p.job_code.strip()
    x.job_name = p.job_name.strip()
    x.item_name = p.item_name
    x.spec = p.spec
    x.supplier = p.supplier
    x.quantity = p.quantity
    x.unit = p.unit
    x.cost = p.cost
    x.sell_price = p.sell_price
    db.commit(); db.refresh(x)
    return serialize(x, _job_seq_map(db))


@router.delete("/{item_id}")
def delete_packaging_prep(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingPrepItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging prep item not found")
    x.is_active = False
    db.commit()
    return {"ok": True}
