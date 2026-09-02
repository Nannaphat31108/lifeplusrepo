import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import PackagingPrepItem

router = APIRouter(prefix="/api/packaging-prep", tags=["Packaging Prep (PURCHASE)"])

SEED_FILE = Path(__file__).resolve().parents[1] / "static" / "packaging_prep_seed.json"


class PackagingPrepPayload(BaseModel):
    # job_code/job_name are optional: plenty of real historical rows (see
    # import_packaging_prep_seed below) are loose packaging-item entries
    # with no recorded job grouping at all.
    job_code: Optional[str] = None
    job_name: Optional[str] = None
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
    renumbering when rows are added, edited, or deleted. Rows with a blank
    job_code (not tied to any job) are left out — they get no seq number."""
    rows = (
        db.query(PackagingPrepItem.job_code, PackagingPrepItem.id)
        .filter(PackagingPrepItem.is_active == True)  # noqa: E712
        .order_by(PackagingPrepItem.id.asc())
        .all()
    )
    seq_map, next_seq = {}, 1
    for job_code, _id in rows:
        key = (job_code or "").strip()
        if not key or key in seq_map:
            continue
        seq_map[key] = next_seq
        next_seq += 1
    return seq_map


def serialize(x: PackagingPrepItem, seq_map: dict) -> dict:
    key = (x.job_code or "").strip()
    return {
        "id": x.id,
        "seq": seq_map.get(key) if key else None,
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


def _has_any_content(p: PackagingPrepPayload) -> bool:
    return any((p.job_code or "").strip() or (p.job_name or "").strip()
               or (p.item_name or "").strip() or (p.spec or "").strip())


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
    # rows with no job_code (seq None) sort after every grouped job, in
    # their original entry order, instead of jumbling in at position 0
    rows = sorted(rows, key=lambda x: (seq_map.get((x.job_code or "").strip()) or 10**9, x.id))
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
    if not _has_any_content(p):
        raise HTTPException(400, "กรอกข้อมูลอย่างน้อยหนึ่งช่อง (รหัสงาน / ชื่องาน / บรรจุภัณฑ์ / สเปค)")
    x = PackagingPrepItem(
        job_code=(p.job_code or "").strip() or None,
        job_name=(p.job_name or "").strip() or None,
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
    if not _has_any_content(p):
        raise HTTPException(400, "กรอกข้อมูลอย่างน้อยหนึ่งช่อง (รหัสงาน / ชื่องาน / บรรจุภัณฑ์ / สเปค)")
    x.job_code = (p.job_code or "").strip() or None
    x.job_name = (p.job_name or "").strip() or None
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


def import_packaging_prep_seed(db: Session) -> str:
    """One-time, idempotent import of the user's real "เตรียมระบบ" tracking
    spreadsheet (app/static/packaging_prep_seed.json, extracted from the
    workbook the user uploaded) into the real packaging_prep_items table.

    Matches existing rows by (job_code, item_name, spec, source_row) so
    re-running on every server start never creates duplicates and never
    touches a row an operator has since edited by hand. job_code/หน่วย/
    ราคาขาย are exactly as blank in the source as they were in the sheet —
    they were never recorded there, ready for PURCHASE to fill in.
    """
    if not SEED_FILE.exists():
        return f"import skipped: file not found at {SEED_FILE}"
    try:
        rows = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        return f"import skipped: cannot read seed file: {type(e).__name__}: {e}"

    existing = {
        (x.job_code or "", x.item_name or "", x.spec or "", x.source_row)
        for x in db.query(PackagingPrepItem).all()
    }

    inserted = 0
    for row in rows or []:
        key = (row.get("job_code") or "", row.get("item_name") or "",
               row.get("spec") or "", row.get("source_row"))
        if key in existing:
            continue
        existing.add(key)
        db.add(PackagingPrepItem(
            job_code=(row.get("job_code") or "").strip() or None,
            job_name=(row.get("job_name") or "").strip() or None,
            item_name=row.get("item_name"),
            spec=row.get("spec"),
            supplier=row.get("supplier"),
            quantity=row.get("quantity"),
            unit=row.get("unit"),
            cost=row.get("cost"),
            sell_price=row.get("sell_price"),
            source_row=row.get("source_row"),
        ))
        inserted += 1
    db.commit()
    return f"import complete: {inserted} inserted, {len(rows or []) - inserted} already existed"
