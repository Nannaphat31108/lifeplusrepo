from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import FinishedGoodsLot, FinishedGoodsTransaction, ProductionWorkOrder
import json

router = APIRouter(prefix="/api/finished-goods-stock", tags=["Stock Card สำเร็จรูป (STOCK)"])

TX_TYPES = {"RECEIVE", "ISSUE"}


class FGLotPayload(BaseModel):
    order_no: Optional[str] = None
    lot_no: Optional[str] = None
    product_name: str
    customer_name: Optional[str] = None
    packing_desc: Optional[str] = None
    order_qty: Optional[float] = None
    opening_received_qty: Optional[float] = 0
    opening_issued_qty: Optional[float] = 0
    notes: Optional[str] = None


class FGTxPayload(BaseModel):
    tx_type: str  # RECEIVE | ISSUE
    quantity: float
    note: Optional[str] = None
    tx_date: Optional[date] = None


def _lot_totals(db: Session, lot_ids: list[int]) -> dict[int, dict]:
    if not lot_ids:
        return {}
    rows = db.execute(
        select(
            FinishedGoodsTransaction.lot_id,
            FinishedGoodsTransaction.tx_type,
            FinishedGoodsTransaction.quantity,
        ).where(
            FinishedGoodsTransaction.lot_id.in_(lot_ids),
            FinishedGoodsTransaction.is_active == True,  # noqa: E712
        )
    ).all()
    out = {lid: {"receive": 0.0, "issue": 0.0} for lid in lot_ids}
    for lot_id, tx_type, qty in rows:
        key = {"RECEIVE": "receive", "ISSUE": "issue"}.get(tx_type)
        if key:
            out[lot_id][key] += float(qty or 0)
    return out


def serialize_lot(x: FinishedGoodsLot, totals: dict) -> dict:
    opening_received = float(x.opening_received_qty or 0)
    opening_issued = float(x.opening_issued_qty or 0)
    received_total = opening_received + totals["receive"]
    issued_total = opening_issued + totals["issue"]
    balance = received_total - issued_total
    return {
        "id": x.id,
        "order_no": x.order_no or "",
        "lot_no": x.lot_no or "",
        "product_name": x.product_name,
        "customer_name": x.customer_name or "",
        "packing_desc": x.packing_desc or "",
        "order_qty": float(x.order_qty) if x.order_qty is not None else None,
        "opening_received_qty": opening_received,
        "opening_issued_qty": opening_issued,
        "notes": x.notes or "",
        "total_received": round(received_total, 2),
        "total_issued": round(issued_total, 2),
        "balance": round(balance, 2),
    }


@router.get("/orders/lookup")
def lookup_order(order_no: str = Query(...), db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Auto-fill ชื่อผลิตภัณฑ์ from an already-saved ใบสั่งผลิต (Production
    Work Order) with the same order_no, so the finished-goods stock card
    doesn't require re-typing the product name -- same reuse-existing-data
    approach as StockCard's material lookup against FDAMaterial."""
    order_no = (order_no or "").strip()
    if not order_no:
        raise HTTPException(400, "ระบุเลขที่สั่งผลิต")
    x = db.scalar(
        select(ProductionWorkOrder)
        .where(ProductionWorkOrder.order_no == order_no)
        .order_by(ProductionWorkOrder.id.desc())
    )
    if not x:
        raise HTTPException(404, "ไม่พบเลขที่สั่งผลิตนี้ในใบสั่งผลิต")
    data = json.loads(x.payload_json or "{}")
    return {
        "order_no": x.order_no,
        "product_name": data.get("product_name") or "",
        "customer_name": data.get("customer_code") or "",
        "lot_no": data.get("lot_no") or "",
    }


@router.get("/lots")
def list_lots(
    q: str = Query(default=""),
    limit: int = Query(default=3000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(FinishedGoodsLot).filter(FinishedGoodsLot.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            FinishedGoodsLot.order_no.ilike(like),
            FinishedGoodsLot.lot_no.ilike(like),
            FinishedGoodsLot.product_name.ilike(like),
            FinishedGoodsLot.customer_name.ilike(like),
        ))
    rows = query.order_by(FinishedGoodsLot.id.desc()).limit(limit).all()
    totals = _lot_totals(db, [x.id for x in rows])
    return [serialize_lot(x, totals.get(x.id, {"receive": 0, "issue": 0})) for x in rows]


@router.post("/lots")
def create_lot(
    p: FGLotPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "STOCK", "PLANNING")),
):
    if not (p.product_name or "").strip():
        raise HTTPException(400, "กรอกชื่อผลิตภัณฑ์ก่อน")
    x = FinishedGoodsLot(
        order_no=(p.order_no or "").strip() or None, lot_no=(p.lot_no or "").strip() or None,
        product_name=p.product_name.strip(), customer_name=p.customer_name,
        packing_desc=p.packing_desc, order_qty=p.order_qty,
        opening_received_qty=p.opening_received_qty or 0, opening_issued_qty=p.opening_issued_qty or 0,
        notes=p.notes, created_by=user.id,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize_lot(x, {"receive": 0, "issue": 0})


@router.put("/lots/{lot_id}")
def update_lot(
    lot_id: int,
    p: FGLotPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK", "PLANNING")),
):
    x = db.get(FinishedGoodsLot, lot_id)
    if not x or not x.is_active:
        raise HTTPException(404, "Lot not found")
    if not (p.product_name or "").strip():
        raise HTTPException(400, "กรอกชื่อผลิตภัณฑ์ก่อน")
    x.order_no = (p.order_no or "").strip() or None
    x.lot_no = (p.lot_no or "").strip() or None
    x.product_name = p.product_name.strip()
    x.customer_name = p.customer_name
    x.packing_desc = p.packing_desc
    x.order_qty = p.order_qty
    x.opening_received_qty = p.opening_received_qty or 0
    x.opening_issued_qty = p.opening_issued_qty or 0
    x.notes = p.notes
    db.commit(); db.refresh(x)
    totals = _lot_totals(db, [x.id]).get(x.id, {"receive": 0, "issue": 0})
    return serialize_lot(x, totals)


@router.delete("/lots/{lot_id}")
def delete_lot(
    lot_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK", "PLANNING")),
):
    x = db.get(FinishedGoodsLot, lot_id)
    if not x:
        raise HTTPException(404, "Lot not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


@router.get("/lots/{lot_id}/transactions")
def list_transactions(lot_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    lot = db.get(FinishedGoodsLot, lot_id)
    if not lot:
        raise HTTPException(404, "Lot not found")
    rows = db.scalars(
        select(FinishedGoodsTransaction)
        .where(FinishedGoodsTransaction.lot_id == lot_id, FinishedGoodsTransaction.is_active == True)  # noqa: E712
        .order_by(FinishedGoodsTransaction.tx_date.desc(), FinishedGoodsTransaction.id.desc())
    ).all()
    return [{
        "id": t.id, "tx_type": t.tx_type, "quantity": float(t.quantity),
        "tx_date": t.tx_date.isoformat() if t.tx_date else None, "note": t.note or "",
    } for t in rows]


@router.post("/lots/{lot_id}/transactions")
def create_transaction(
    lot_id: int,
    p: FGTxPayload,
    db: Session = Depends(get_db),
    user=Depends(require_roles("ADMIN", "STOCK", "PLANNING")),
):
    """The 'ตัดสตอค' button for finished goods -- รับเข้าจากผลิต (RECEIVE,
    goods coming off the production line) or เบิกออกให้จัดส่ง (ISSUE, goods
    shipped to the customer). Balance is never stored, always recomputed."""
    lot = db.get(FinishedGoodsLot, lot_id)
    if not lot or not lot.is_active:
        raise HTTPException(404, "Lot not found")
    tx_type = (p.tx_type or "").strip().upper()
    if tx_type not in TX_TYPES:
        raise HTTPException(400, "ประเภทรายการต้องเป็น รับเข้าจากผลิต / เบิกออกให้จัดส่ง")
    if p.quantity is None or p.quantity <= 0:
        raise HTTPException(400, "กรอกจำนวนมากกว่า 0")

    tx = FinishedGoodsTransaction(
        lot_id=lot_id, tx_type=tx_type, quantity=p.quantity,
        tx_date=p.tx_date or date.today(), note=p.note, created_by=user.id,
    )
    db.add(tx); db.commit(); db.refresh(tx)
    totals = _lot_totals(db, [lot_id]).get(lot_id, {"receive": 0, "issue": 0})
    return {"ok": True, "transaction_id": tx.id, "lot": serialize_lot(lot, totals)}


@router.delete("/transactions/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "STOCK", "PLANNING")),
):
    tx = db.get(FinishedGoodsTransaction, tx_id)
    if not tx:
        raise HTTPException(404, "Transaction not found")
    tx.is_active = False
    db.commit()
    return {"ok": True}
