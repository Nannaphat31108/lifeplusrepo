from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, can_view_pricing, require_roles
from app.models.entities import (
    User, Customer, Supplier, RawMaterial, MaterialSupplier,
    ProductProject, Formula, FormulaRevision, FormulaItem,
    TesterRequest, RateRequest, RateTier, ProductionFormula,
    ProductionOrder, PlanningHandoff, RegistrationFormula,
    Approval, AuditLog, InventoryStock
)
from app.services.formula import revision_diff
from app.services.mrp import calculate_mrp

router = APIRouter(prefix="/api/ui", tags=["Frontend UI"])


@router.get("/me")
def me(u=Depends(get_current_user)):
    return {
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name,
        "role": u.role,
        "can_view_pricing": can_view_pricing(u.role),
    }


@router.get("/formulas")
def formulas(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(select(Formula).order_by(Formula.id.desc())).all()
    result = []
    for f in rows:
        revs = db.scalars(
            select(FormulaRevision)
            .where(FormulaRevision.formula_id == f.id)
            .order_by(FormulaRevision.revision_no.desc())
        ).all()
        latest = revs[0] if revs else None
        result.append({
            "id": f.id,
            "formula_no": f.formula_no,
            "formula_name": f.formula_name,
            "project_id": f.project_id,
            "status": f.status,
            "latest_revision_id": latest.id if latest else None,
            "latest_revision_no": latest.revision_no if latest else None,
            "latest_revision_status": latest.status if latest else None,
            **({
                "latest_cost": (
                    Decimal(latest.ingredient_cost_per_unit) +
                    Decimal(latest.packaging_cost_per_unit)
                ) if latest else Decimal("0")
            } if can_view_pricing(u.role) else {})
        })
    return result


@router.get("/formulas/{formula_id}/revisions")
def formula_revisions(formula_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(
        select(FormulaRevision)
        .where(FormulaRevision.formula_id == formula_id)
        .order_by(FormulaRevision.revision_no.desc())
    ).all()
    out = []
    for r in rows:
        d = {
            "id": r.id,
            "revision_no": r.revision_no,
            "reason": r.reason,
            "customer_feedback": r.customer_feedback,
            "status": r.status,
            "total_weight_mg": r.total_weight_mg,
            "approved_at": r.approved_at,
            "diff": revision_diff(db, r.id),
        }
        if can_view_pricing(u.role):
            d.update({
                "ingredient_cost_per_unit": r.ingredient_cost_per_unit,
                "packaging_cost_per_unit": r.packaging_cost_per_unit,
                "selling_price_per_unit": r.selling_price_per_unit,
            })
        out.append(d)
    return out


@router.get("/tester-requests")
def tester_requests(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(select(TesterRequest).order_by(TesterRequest.id.desc())).all()
    out = []
    for x in rows:
        d = {
            "id": x.id, "tester_no": x.tester_no, "project_id": x.project_id,
            "formula_revision_id": x.formula_revision_id, "quotation_no": x.quotation_no,
            "receipt_no": x.receipt_no, "quantity": x.quantity,
            "requested_date": x.requested_date, "delivery_date": x.delivery_date,
            "tester_type": x.tester_type, "delivery_status": x.delivery_status,
            "requester_name": x.requester_name, "rd_maker_name": x.rd_maker_name,
        }
        if can_view_pricing(u.role):
            d.update({"paid_amount": x.paid_amount, "tester_cost": x.tester_cost})
        out.append(d)
    return out


@router.patch("/tester-requests/{tester_id}/status")
def update_tester_status(
    tester_id: int, status: str, db: Session = Depends(get_db),
    u=Depends(require_roles("ADMIN", "RD_HEAD", "RD_OFFICER"))
):
    x = db.get(TesterRequest, tester_id)
    if not x:
        raise HTTPException(404, "Tester not found")
    allowed = {"REQUESTED", "ACCEPTED", "IN_PROGRESS", "READY", "DELIVERED", "CUSTOMER_REVIEW", "CLOSED"}
    if status not in allowed:
        raise HTTPException(400, f"Invalid status. Allowed: {sorted(allowed)}")
    x.delivery_status = status
    db.commit()
    return {"id": x.id, "status": x.delivery_status}


@router.get("/rate-requests")
def rate_requests(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(select(RateRequest).order_by(RateRequest.id.desc())).all()
    out = []
    for x in rows:
        tiers = db.scalars(select(RateTier).where(RateTier.rate_request_id == x.id)).all()
        item = {
            "id": x.id, "rate_no": x.rate_no, "project_id": x.project_id,
            "formula_revision_id": x.formula_revision_id, "quotation_no": x.quotation_no,
            "product_name": x.product_name, "status": x.status,
            "rd_head_approved": x.rd_head_approved, "sales_approved": x.sales_approved,
            "notes": x.notes,
        }
        if can_view_pricing(u.role):
            item["tiers"] = [{
                "id": t.id, "quantity": t.quantity, "cost_per_unit": t.cost_per_unit,
                "selling_price_per_unit": t.selling_price_per_unit,
                "profit_per_unit": t.profit_per_unit, "total_profit": t.total_profit,
                "net_profit": t.net_profit, "margin_percent": t.margin_percent
            } for t in tiers]
        out.append(item)
    return out


@router.get("/production-formulas")
def production_formulas(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.scalars(select(ProductionFormula).order_by(ProductionFormula.id.desc())).all()


@router.get("/production-orders")
def production_orders(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.scalars(select(ProductionOrder).order_by(ProductionOrder.id.desc())).all()


@router.get("/registration-formulas")
def registration_formulas(db: Session = Depends(get_db), u=Depends(get_current_user)):
    return db.scalars(select(RegistrationFormula).order_by(RegistrationFormula.id.desc())).all()


@router.get("/stocks")
def stocks(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(select(InventoryStock).order_by(InventoryStock.id.desc())).all()
    result = []
    for s in rows:
        m = db.get(RawMaterial, s.material_id)
        result.append({
            "id": s.id, "material_id": s.material_id,
            "material_code": m.material_code if m else None,
            "material_name": m.trade_name if m else None,
            "warehouse": s.warehouse, "on_hand_kg": s.on_hand_kg,
            "reserved_kg": s.reserved_kg,
            "available_kg": Decimal(s.on_hand_kg) - Decimal(s.reserved_kg),
        })
    return result


@router.get("/users")
def users(db: Session = Depends(get_db), u=Depends(require_roles("ADMIN"))):
    return [{
        "id": x.id, "username": x.username, "full_name": x.full_name,
        "role": x.role, "is_active": x.is_active
    } for x in db.scalars(select(User).order_by(User.id)).all()]


@router.get("/audit")
def audit(db: Session = Depends(get_db), u=Depends(require_roles("ADMIN", "RD_HEAD"))):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(200)).all()
    return [{
        "id": x.id, "user_id": x.user_id, "action": x.action,
        "entity_type": x.entity_type, "entity_id": x.entity_id,
        "created_at": x.created_at
    } for x in rows]


@router.get("/mrp/{production_order_id}")
def mrp(production_order_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    result = calculate_mrp(db, production_order_id)
    if result is None:
        raise HTTPException(404, "Production order not found")
    return result
