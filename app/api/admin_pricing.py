import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import AdminPricingRow, AdminLaborRate

router = APIRouter(prefix="/api/admin-pricing", tags=["Admin Pricing (ADMIN)"])

PRICING_SEED_FILE = Path(__file__).resolve().parents[1] / "static" / "admin_pricing_seed.json"
LABOR_SEED_FILE = Path(__file__).resolve().parents[1] / "static" / "admin_labor_rate_seed.json"

# Fixed, shared set of order-quantity tiers for the ค่าแรง (labor rate)
# grid -- every product_type/fill_count row uses these same columns, so
# they're a code constant (returned via GET /labor-rates/tiers) rather than
# duplicated per row.
LABOR_RATE_TIERS = ["1-999", "1000-2999", "3000-4999", "5000-9999", "10000-29999", "30000-49999", "50000-99999", "100000"]


# ---------------------------------------------------------------- pricing rows (อุปกรณ์เสริม) ----

class SellTierPayload(BaseModel):
    label: str
    price: Optional[float] = None


class AdminPricingRowPayload(BaseModel):
    section: int = 1
    group_no: Optional[int] = None
    item_name: Optional[str] = None
    sell_tiers: list[SellTierPayload] = []
    spec: Optional[str] = None
    quantity_range: Optional[str] = None
    cost: Optional[float] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None


def _serialize_tiers(raw: Optional[str]) -> list[dict]:
    try:
        return json.loads(raw) if raw else []
    except Exception:
        return []


def serialize_pricing_row(x: AdminPricingRow) -> dict:
    # NOTE: deliberately no computed margin/profit % here. Tried it, then
    # caught it red-handed against the real seeded data: "ราคาต้นทุน" (cost)
    # is priced per the *purchasing* unit named in quantity_range (e.g. cost
    # 1520 for "1-20 ม้วน" -- per roll), while ราคาขาย is priced per the
    # *selling* unit (per piece a roll is later cut into, per the row's own
    # notes) -- unrelated units, so (price-cost)/cost comes out as a
    # nonsense -99.9% "loss" on a row that's actually profitable. Some rows
    # *do* share a unit and a real margin would be correct there, but nothing
    # in the data says which -- showing a number that's right some of the
    # time and wildly wrong other times is worse than showing none.
    return {
        "id": x.id,
        "section": x.section,
        "group_no": x.group_no,
        "item_name": x.item_name or "",
        "sell_tiers": _serialize_tiers(x.sell_tiers_json),
        "spec": x.spec or "",
        "quantity_range": x.quantity_range or "",
        "cost": float(x.cost) if x.cost is not None else None,
        "supplier": x.supplier or "",
        "notes": x.notes or "",
    }


@router.get("/rows")
def list_pricing_rows(
    q: str = Query(default=""),
    section: Optional[int] = Query(default=None),
    limit: int = Query(default=2000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(AdminPricingRow).filter(AdminPricingRow.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            AdminPricingRow.item_name.ilike(like),
            AdminPricingRow.spec.ilike(like),
            AdminPricingRow.supplier.ilike(like),
            AdminPricingRow.notes.ilike(like),
        ))
    if section is not None:
        query = query.filter(AdminPricingRow.section == section)
    rows = query.order_by(AdminPricingRow.section.asc(), AdminPricingRow.group_no.asc(), AdminPricingRow.id.asc()).limit(limit).all()
    return [serialize_pricing_row(x) for x in rows]


@router.post("/rows")
def create_pricing_row(
    p: AdminPricingRowPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN")),
):
    if not (p.item_name or "").strip() and not (p.spec or "").strip():
        raise HTTPException(400, "กรอกรายการหรือสเปคอย่างน้อยหนึ่งอย่าง")
    x = AdminPricingRow(
        section=p.section or 1, group_no=p.group_no,
        item_name=(p.item_name or "").strip() or None,
        sell_tiers_json=json.dumps([t.model_dump() for t in p.sell_tiers], ensure_ascii=False) if p.sell_tiers else None,
        spec=p.spec, quantity_range=p.quantity_range, cost=p.cost, supplier=p.supplier, notes=p.notes,
        created_by=user.id,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize_pricing_row(x)


@router.put("/rows/{row_id}")
def update_pricing_row(
    row_id: int,
    p: AdminPricingRowPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
):
    x = db.get(AdminPricingRow, row_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Pricing row not found")
    if not (p.item_name or "").strip() and not (p.spec or "").strip():
        raise HTTPException(400, "กรอกรายการหรือสเปคอย่างน้อยหนึ่งอย่าง")
    x.section = p.section or 1
    x.group_no = p.group_no
    x.item_name = (p.item_name or "").strip() or None
    x.sell_tiers_json = json.dumps([t.model_dump() for t in p.sell_tiers], ensure_ascii=False) if p.sell_tiers else None
    x.spec = p.spec
    x.quantity_range = p.quantity_range
    x.cost = p.cost
    x.supplier = p.supplier
    x.notes = p.notes
    db.commit(); db.refresh(x)
    return serialize_pricing_row(x)


@router.delete("/rows/{row_id}")
def delete_pricing_row(
    row_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
):
    x = db.get(AdminPricingRow, row_id)
    if not x:
        raise HTTPException(404, "Pricing row not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- labor rate card (ค่าแรง) ----

class LaborRatePayload(BaseModel):
    product_type: str
    fill_count: str
    tiers: dict[str, Optional[float]] = {}


def serialize_labor_rate(x: AdminLaborRate) -> dict:
    tiers = {}
    try:
        tiers = json.loads(x.tiers_json) if x.tiers_json else {}
    except Exception:
        tiers = {}
    return {
        "id": x.id,
        "product_type": x.product_type or "",
        "fill_count": x.fill_count or "",
        "tiers": {lbl: tiers.get(lbl) for lbl in LABOR_RATE_TIERS},
    }


@router.get("/labor-rates/tiers")
def labor_rate_tiers(u=Depends(get_current_user)):
    return LABOR_RATE_TIERS


@router.get("/labor-rates")
def list_labor_rates(
    q: str = Query(default=""),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(AdminLaborRate).filter(AdminLaborRate.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(AdminLaborRate.product_type.ilike(like), AdminLaborRate.fill_count.ilike(like)))
    rows = query.order_by(AdminLaborRate.id.asc()).all()
    return [serialize_labor_rate(x) for x in rows]


@router.post("/labor-rates")
def create_labor_rate(
    p: LaborRatePayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN")),
):
    if not (p.product_type or "").strip():
        raise HTTPException(400, "กรอกประเภทก่อน")
    if not (p.fill_count or "").strip():
        raise HTTPException(400, "กรอกจำนวนการบรรจุก่อน")
    x = AdminLaborRate(
        product_type=p.product_type.strip(), fill_count=p.fill_count.strip(),
        tiers_json=json.dumps({k: v for k, v in p.tiers.items() if k in LABOR_RATE_TIERS}, ensure_ascii=False),
        created_by=user.id,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize_labor_rate(x)


@router.put("/labor-rates/{row_id}")
def update_labor_rate(
    row_id: int,
    p: LaborRatePayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
):
    x = db.get(AdminLaborRate, row_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Labor rate row not found")
    if not (p.product_type or "").strip():
        raise HTTPException(400, "กรอกประเภทก่อน")
    if not (p.fill_count or "").strip():
        raise HTTPException(400, "กรอกจำนวนการบรรจุก่อน")
    x.product_type = p.product_type.strip()
    x.fill_count = p.fill_count.strip()
    # merge (not replace) so setting one tier via PUT never wipes the rest
    # -- the grid's per-cell edit sends only the tiers it has, but a
    # from-scratch payload with the full dict works identically either way.
    current = {}
    try:
        current = json.loads(x.tiers_json) if x.tiers_json else {}
    except Exception:
        current = {}
    current.update({k: v for k, v in p.tiers.items() if k in LABOR_RATE_TIERS})
    x.tiers_json = json.dumps(current, ensure_ascii=False)
    db.commit(); db.refresh(x)
    return serialize_labor_rate(x)


@router.delete("/labor-rates/{row_id}")
def delete_labor_rate(
    row_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
):
    x = db.get(AdminLaborRate, row_id)
    if not x:
        raise HTTPException(404, "Labor rate row not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- seed import ----

def _parse_tier_bounds(label: str):
    """"1-999" -> (1,999); "100000" (last, open-ended tier) -> (100000, None)."""
    nums = [int(n.replace(",", "")) for n in re.findall(r"[\d,]+", label)]
    if len(nums) >= 2:
        return nums[0], nums[1]
    if len(nums) == 1:
        return nums[0], None
    return None, None


def import_admin_pricing_seed(db: Session) -> str:
    """Idempotent import of app/static/admin_pricing_seed.json (อุปกรณ์เสริม
    cost/sell-price rows) -- same match-and-skip pattern as the other
    seeded catalogs in this app."""
    if not PRICING_SEED_FILE.exists():
        return f"import skipped: file not found at {PRICING_SEED_FILE}"
    try:
        rows = json.loads(PRICING_SEED_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        return f"import skipped: cannot read seed file: {type(e).__name__}: {e}"

    existing = {
        (x.section, x.group_no, x.item_name or "", x.spec or "", x.source_row)
        for x in db.query(AdminPricingRow).all()
    }
    inserted = 0
    for row in rows or []:
        key = (row.get("section") or 1, row.get("group_no"), row.get("item_name") or "",
               row.get("spec") or "", row.get("source_row"))
        if key in existing:
            continue
        existing.add(key)
        sell_tiers = row.get("sell_tiers") or []
        db.add(AdminPricingRow(
            section=row.get("section") or 1,
            group_no=row.get("group_no"),
            item_name=row.get("item_name"),
            sell_tiers_json=json.dumps(sell_tiers, ensure_ascii=False) if sell_tiers else None,
            spec=row.get("spec"),
            quantity_range=row.get("quantity_range"),
            cost=row.get("cost"),
            supplier=row.get("supplier"),
            notes=row.get("notes"),
            source_row=row.get("source_row"),
        ))
        inserted += 1
    db.commit()
    return f"pricing rows: {inserted} inserted, {len(rows or []) - inserted} already existed"


def import_admin_labor_rate_seed(db: Session) -> str:
    """Idempotent import of app/static/admin_labor_rate_seed.json (the
    blank ค่าแรง rate-card template -- structure only, every rate null,
    ready for ADMIN to fill in through the grid)."""
    if not LABOR_SEED_FILE.exists():
        return f"import skipped: file not found at {LABOR_SEED_FILE}"
    try:
        data = json.loads(LABOR_SEED_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        return f"import skipped: cannot read seed file: {type(e).__name__}: {e}"
    rows = data.get("rows") or []

    existing = {
        (x.product_type or "", x.fill_count or "", x.source_row)
        for x in db.query(AdminLaborRate).all()
    }
    inserted = 0
    for row in rows:
        key = (row.get("product_type") or "", row.get("fill_count") or "", row.get("source_row"))
        if key in existing:
            continue
        existing.add(key)
        db.add(AdminLaborRate(
            product_type=row.get("product_type"),
            fill_count=row.get("fill_count"),
            tiers_json=json.dumps(row.get("tiers") or {}, ensure_ascii=False),
            source_row=row.get("source_row"),
        ))
        inserted += 1
    db.commit()
    return f"labor rate rows: {inserted} inserted, {len(rows) - inserted} already existed"
