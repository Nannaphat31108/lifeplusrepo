import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import PackagingOption, PackagingPrepItem

router = APIRouter(prefix="/api/packaging-options", tags=["Packaging Options (PURCHASE)"])

SEED_FILE = Path(__file__).resolve().parents[1] / "static" / "packaging_options_seed.json"


class PackagingOptionPayload(BaseModel):
    category: str
    item_name: Optional[str] = None
    pack_qty: Optional[str] = None
    purpose: Optional[str] = None
    spec: Optional[str] = None
    supplier: Optional[str] = None
    quantity: Optional[float] = None
    rate: Optional[str] = None
    cost: Optional[float] = None
    lead_time: Optional[str] = None
    packing: Optional[str] = None
    yield_qty: Optional[str] = None
    sample_job: Optional[str] = None


class UsePackagingOptionPayload(BaseModel):
    job_code: Optional[str] = None
    job_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None


def serialize(x: PackagingOption) -> dict:
    return {
        "id": x.id,
        "category": x.category or "",
        "item_name": x.item_name or "",
        "pack_qty": x.pack_qty or "",
        "purpose": x.purpose or "",
        "spec": x.spec or "",
        "supplier": x.supplier or "",
        "quantity": float(x.quantity) if x.quantity is not None else None,
        "rate": x.rate or "",
        "cost": float(x.cost) if x.cost is not None else None,
        "lead_time": x.lead_time or "",
        "packing": x.packing or "",
        "yield_qty": x.yield_qty or "",
        # sample_job last on purpose -- it's a trailing reference note, not
        # part of the option's identity (see the model docstring).
        "sample_job": x.sample_job or "",
    }


@router.get("")
def list_packaging_options(
    q: str = Query(default=""),
    category: str = Query(default=""),
    limit: int = Query(default=2000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(PackagingOption).filter(PackagingOption.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            PackagingOption.item_name.ilike(like),
            PackagingOption.spec.ilike(like),
            PackagingOption.supplier.ilike(like),
            PackagingOption.purpose.ilike(like),
            PackagingOption.sample_job.ilike(like),
        ))
    cat = (category or "").strip()
    if cat:
        query = query.filter(PackagingOption.category == cat)
    rows = query.order_by(PackagingOption.category.asc(), PackagingOption.id.asc()).limit(limit).all()
    return [serialize(x) for x in rows]


@router.get("/categories")
def packaging_option_categories(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = (
        db.query(PackagingOption.category)
        .filter(PackagingOption.is_active == True)  # noqa: E712
        .distinct()
        .all()
    )
    return sorted({(c or "").strip() for (c,) in rows if (c or "").strip()})


@router.post("")
def create_packaging_option(
    p: PackagingOptionPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "PURCHASE")),
):
    if not (p.category or "").strip():
        raise HTTPException(400, "กรอกประเภทบรรจุภัณฑ์ก่อน")
    x = PackagingOption(category=p.category.strip(), created_by=user.id, **{
        k: v for k, v in p.model_dump().items() if k != "category"
    })
    db.add(x); db.commit(); db.refresh(x)
    return serialize(x)


@router.put("/{item_id}")
def update_packaging_option(
    item_id: int,
    p: PackagingOptionPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingOption, item_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Packaging option not found")
    if not (p.category or "").strip():
        raise HTTPException(400, "กรอกประเภทบรรจุภัณฑ์ก่อน")
    for k, v in p.model_dump().items():
        setattr(x, k, v.strip() if k == "category" and isinstance(v, str) else v)
    db.commit(); db.refresh(x)
    return serialize(x)


@router.delete("/{item_id}")
def delete_packaging_option(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingOption, item_id)
    if not x:
        raise HTTPException(404, "Packaging option not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/{item_id}/use")
def use_packaging_option(
    item_id: int,
    p: UsePackagingOptionPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "PURCHASE")),
):
    """'เลือกใช้งาน' -- files this catalog option into the เตรียมระบบ job
    list (PackagingPrepItem): job_code/job_name/quantity come from what the
    user picked it *for*, everything identifying the packaging itself
    (item_name/spec/supplier/cost) is copied straight from the option."""
    opt = db.get(PackagingOption, item_id)
    if not opt or not opt.is_active:
        raise HTTPException(404, "Packaging option not found")
    row = PackagingPrepItem(
        job_code=(p.job_code or "").strip() or None,
        job_name=(p.job_name or "").strip() or None,
        item_name=opt.item_name,
        spec=opt.spec,
        supplier=opt.supplier,
        quantity=p.quantity,
        unit=p.unit,
        cost=opt.cost,
        sell_price=None,
        created_by=user.id,
    )
    db.add(row); db.commit(); db.refresh(row)
    return {"ok": True, "packaging_prep_item_id": row.id}


def import_packaging_options_seed(db: Session) -> str:
    """One-time, idempotent import of app/static/packaging_options_seed.json
    (extracted from the workbook the user uploaded, one sheet per packaging
    category) into packaging_options. Matches existing rows by
    (category, item_name, spec, source_row), same pattern as
    import_package_catalog / import_packaging_prep_seed."""
    if not SEED_FILE.exists():
        return f"import skipped: file not found at {SEED_FILE}"
    try:
        rows = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        return f"import skipped: cannot read seed file: {type(e).__name__}: {e}"

    existing = {
        (x.category or "", x.item_name or "", x.spec or "", x.source_row)
        for x in db.query(PackagingOption).all()
    }

    inserted = 0
    for row in rows or []:
        category = (row.get("category") or "").strip()
        if not category:
            continue
        key = (category, row.get("item_name") or "", row.get("spec") or "", row.get("source_row"))
        if key in existing:
            continue
        existing.add(key)
        db.add(PackagingOption(
            category=category,
            item_name=row.get("item_name"),
            pack_qty=row.get("pack_qty"),
            purpose=row.get("purpose"),
            spec=row.get("spec"),
            supplier=row.get("supplier"),
            quantity=row.get("quantity"),
            rate=row.get("rate"),
            cost=row.get("cost"),
            lead_time=row.get("lead_time"),
            packing=row.get("packing"),
            yield_qty=row.get("yield_qty"),
            sample_job=row.get("sample_job"),
            source_row=row.get("source_row"),
        ))
        inserted += 1
    db.commit()
    return f"import complete: {inserted} inserted, {len(rows or []) - inserted} already existed"
