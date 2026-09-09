from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import StockCardLot, StockCardTransaction, FDAMaterial

router = APIRouter(prefix="/api/stock-card", tags=["Stock Card (STOCK)"])

TX_TYPES = {"IN", "OUT", "RETURN"}


class StockCardLotPayload(BaseModel):
    material_code: str
    supplier_category: Optional[str] = None
    lot_no: str
    product_name: Optional[str] = None
    supplier_name: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    analysis_no: Optional[str] = None
    received_date: Optional[date] = None
    expiry_date: Optional[date] = None
    opening_qty_kg: Optional[float] = 0


class StockCardTxPayload(BaseModel):
    tx_type: str  # IN | OUT | RETURN
    quantity: float
    unit: str = "kg"  # kg | g
    note: Optional[str] = None
    tx_date: Optional[date] = None


def _lot_balances(db: Session, lot_ids: list[int]) -> dict[int, dict]:
    """One query for every lot's totals instead of N+1 -- keyed by lot_id,
    each value {in, out, return, balance_adjustment}. Balance itself is
    opening_qty_kg + in - out + return, added by the caller (which already
    has opening_qty_kg from the lot row)."""
    if not lot_ids:
        return {}
    rows = db.execute(
        select(
            StockCardTransaction.lot_id,
            StockCardTransaction.tx_type,
            StockCardTransaction.quantity_kg,
        ).where(
            StockCardTransaction.lot_id.in_(lot_ids),
            StockCardTransaction.is_active == True,  # noqa: E712
        )
    ).all()
    out = {lid: {"in": 0.0, "out": 0.0, "return": 0.0} for lid in lot_ids}
    for lot_id, tx_type, qty in rows:
        key = {"IN": "in", "OUT": "out", "RETURN": "return"}.get(tx_type)
        if key:
            out[lot_id][key] += float(qty or 0)
    return out


def _month_summary(db: Session, lot_ids: list[int], month: str) -> dict[int, dict]:
    """Same shape as _lot_balances but scoped to one 'YYYY-MM' -- mirrors
    the source workbook's "สรุปประจำเดือน" (this month's รับเข้า/เบิกออก/คืน),
    kept separate from the all-time balance."""
    if not lot_ids or not month:
        return {lid: {"in": 0.0, "out": 0.0, "return": 0.0} for lid in lot_ids}
    try:
        y, m = month.split("-")
        y, m = int(y), int(m)
    except Exception:
        return {lid: {"in": 0.0, "out": 0.0, "return": 0.0} for lid in lot_ids}
    rows = db.execute(
        select(
            StockCardTransaction.lot_id,
            StockCardTransaction.tx_type,
            StockCardTransaction.quantity_kg,
            StockCardTransaction.tx_date,
        ).where(
            StockCardTransaction.lot_id.in_(lot_ids),
            StockCardTransaction.is_active == True,  # noqa: E712
        )
    ).all()
    out = {lid: {"in": 0.0, "out": 0.0, "return": 0.0} for lid in lot_ids}
    for lot_id, tx_type, qty, tx_date in rows:
        if not tx_date or tx_date.year != y or tx_date.month != m:
            continue
        key = {"IN": "in", "OUT": "out", "RETURN": "return"}.get(tx_type)
        if key:
            out[lot_id][key] += float(qty or 0)
    return out


def serialize_lot(x: StockCardLot, totals: dict, month_totals: Optional[dict] = None) -> dict:
    opening = float(x.opening_qty_kg or 0)
    balance = opening + totals["in"] - totals["out"] + totals["return"]
    out = {
        "id": x.id,
        "material_code": x.material_code,
        "supplier_category": x.supplier_category or "",
        "lot_no": x.lot_no,
        "product_name": x.product_name or "",
        "supplier_name": x.supplier_name or "",
        "price": float(x.price) if x.price is not None else None,
        "notes": x.notes or "",
        "analysis_no": x.analysis_no or "",
        "received_date": x.received_date.isoformat() if x.received_date else None,
        "expiry_date": x.expiry_date.isoformat() if x.expiry_date else None,
        "opening_qty_kg": opening,
        "balance_kg": round(balance, 4),
        "total_in_kg": round(totals["in"], 4),
        "total_out_kg": round(totals["out"], 4),
        "total_return_kg": round(totals["return"], 4),
    }
    if month_totals is not None:
        out["month_in_kg"] = round(month_totals["in"], 4)
        out["month_out_kg"] = round(month_totals["out"], 4)
        out["month_return_kg"] = round(month_totals["return"], 4)
    return out


@router.get("/materials/lookup")
def lookup_material(code: str = Query(...), db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Mirrors the source workbook's =VLOOKUP(code, DATA!..., ...) that
    auto-filled หมวด/Product name from a material code -- this app already
    has a comprehensive material master (FDAMaterial, ~5000 rows), so that
    serves as the lookup source instead of needing a separate import."""
    code = (code or "").strip().upper()
    if not code:
        raise HTTPException(400, "ระบุรหัสวัตถุดิบ")
    m = db.scalar(select(FDAMaterial).where(FDAMaterial.material_code == code))
    if not m:
        raise HTTPException(404, "ไม่พบรหัสวัตถุดิบนี้ในฐาน FDA/รหัสสาร")
    return {
        "material_code": m.material_code,
        "supplier_category": m.supplier_category or "",
        "product_name": m.product_name or "",
        "supplier_name": m.supplier_company or "",
    }


@router.get("/lots")
def list_lots(
    q: str = Query(default=""),
    material_code: str = Query(default=""),
    month: str = Query(default=""),
    limit: int = Query(default=3000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(StockCardLot).filter(StockCardLot.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            StockCardLot.material_code.ilike(like),
            StockCardLot.lot_no.ilike(like),
            StockCardLot.product_name.ilike(like),
            StockCardLot.supplier_name.ilike(like),
            StockCardLot.analysis_no.ilike(like),
        ))
    code = (material_code or "").strip()
    if code:
        query = query.filter(StockCardLot.material_code.ilike(code))
    rows = query.order_by(StockCardLot.material_code.asc(), StockCardLot.lot_no.asc()).limit(limit).all()
    lot_ids = [x.id for x in rows]
    totals = _lot_balances(db, lot_ids)
    month_totals = _month_summary(db, lot_ids, month) if month else None
    return [
        serialize_lot(x, totals.get(x.id, {"in": 0, "out": 0, "return": 0}),
                      month_totals.get(x.id) if month_totals else None)
        for x in rows
    ]


@router.post("/lots")
def create_lot(
    p: StockCardLotPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "STOCK")),
):
    if not (p.material_code or "").strip():
        raise HTTPException(400, "กรอกรหัสวัตถุดิบก่อน")
    if not (p.lot_no or "").strip():
        raise HTTPException(400, "กรอกเลข Lot ก่อน")
    x = StockCardLot(
        material_code=p.material_code.strip().upper(), lot_no=p.lot_no.strip(),
        supplier_category=p.supplier_category, product_name=p.product_name,
        supplier_name=p.supplier_name, price=p.price, notes=p.notes,
        analysis_no=p.analysis_no, received_date=p.received_date, expiry_date=p.expiry_date,
        opening_qty_kg=p.opening_qty_kg or 0, created_by=user.id,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize_lot(x, {"in": 0, "out": 0, "return": 0})


@router.put("/lots/{lot_id}")
def update_lot(
    lot_id: int,
    p: StockCardLotPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK")),
):
    x = db.get(StockCardLot, lot_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Lot not found")
    if not (p.material_code or "").strip():
        raise HTTPException(400, "กรอกรหัสวัตถุดิบก่อน")
    if not (p.lot_no or "").strip():
        raise HTTPException(400, "กรอกเลข Lot ก่อน")
    x.material_code = p.material_code.strip().upper()
    x.lot_no = p.lot_no.strip()
    x.supplier_category = p.supplier_category
    x.product_name = p.product_name
    x.supplier_name = p.supplier_name
    x.price = p.price
    x.notes = p.notes
    x.analysis_no = p.analysis_no
    x.received_date = p.received_date
    x.expiry_date = p.expiry_date
    x.opening_qty_kg = p.opening_qty_kg or 0
    db.commit(); db.refresh(x)
    totals = _lot_balances(db, [x.id]).get(x.id, {"in": 0, "out": 0, "return": 0})
    return serialize_lot(x, totals)


@router.delete("/lots/{lot_id}")
def delete_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK")),
):
    x = db.get(StockCardLot, lot_id)
    if not x:
        raise HTTPException(404, "Lot not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/lots/{lot_id}/transactions")
def list_transactions(
    lot_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    lot = db.get(StockCardLot, lot_id)
    if not lot:
        raise HTTPException(404, "Lot not found")
    rows = db.scalars(
        select(StockCardTransaction)
        .where(StockCardTransaction.lot_id == lot_id, StockCardTransaction.is_active == True)  # noqa: E712
        .order_by(StockCardTransaction.tx_date.desc(), StockCardTransaction.id.desc())
    ).all()
    return [{
        "id": t.id, "tx_type": t.tx_type, "quantity_kg": float(t.quantity_kg),
        "tx_date": t.tx_date.isoformat() if t.tx_date else None, "note": t.note or "",
    } for t in rows]


@router.post("/lots/{lot_id}/transactions")
def create_transaction(
    lot_id: int,
    p: StockCardTxPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "STOCK")),
):
    """The 'ตัดสตอค' button: pick a lot (already selected by material
    code + lot in the UI), IN/OUT/RETURN, quantity in kg or g -- the
    running balance is never touched directly, it's just this lot's
    opening_qty_kg plus the sum of its (now one more) transactions,
    computed fresh on every read."""
    lot = db.get(StockCardLot, lot_id)
    if not lot or not lot.is_active:
        raise HTTPException(404, "Lot not found")
    tx_type = (p.tx_type or "").strip().upper()
    if tx_type not in TX_TYPES:
        raise HTTPException(400, "ประเภทรายการต้องเป็น รับเข้า / เบิกออก / คืน")
    if p.quantity is None or p.quantity <= 0:
        raise HTTPException(400, "กรอกจำนวนมากกว่า 0")
    unit = (p.unit or "kg").strip().lower()
    if unit not in ("kg", "g"):
        raise HTTPException(400, "หน่วยต้องเป็น kg หรือ g")
    qty_kg = p.quantity if unit == "kg" else p.quantity / 1000

    tx = StockCardTransaction(
        lot_id=lot_id, tx_type=tx_type, quantity_kg=qty_kg,
        tx_date=p.tx_date or date.today(), note=p.note, created_by=user.id,
    )
    db.add(tx); db.commit(); db.refresh(tx)
    totals = _lot_balances(db, [lot_id]).get(lot_id, {"in": 0, "out": 0, "return": 0})
    return {"ok": True, "transaction_id": tx.id, "lot": serialize_lot(lot, totals)}


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK")),
):
    tx = db.get(StockCardTransaction, tx_id)
    if not tx:
        raise HTTPException(404, "Transaction not found")
    tx.is_active = False
    db.commit()
    return {"ok": True}
