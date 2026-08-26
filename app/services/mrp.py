from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import (
    ProductionOrder, ProductionFormula, FormulaRevision, FormulaItem,
    RawMaterial, InventoryStock
)

D = Decimal

def calculate_mrp(db: Session, production_order_id: int):
    po = db.get(ProductionOrder, production_order_id)
    if not po:
        return None
    pf = db.get(ProductionFormula, po.production_formula_id)
    rev = db.get(FormulaRevision, pf.source_formula_revision_id)
    items = db.scalars(select(FormulaItem).where(FormulaItem.revision_id == rev.id)).all()
    rows = []
    for item in items:
        material = db.get(RawMaterial, item.material_id)
        required_kg = D(item.dose_mg) * D(po.planned_quantity) / D("1000000")
        stocks = db.scalars(select(InventoryStock).where(InventoryStock.material_id == item.material_id)).all()
        on_hand = sum((D(s.on_hand_kg) for s in stocks), D("0"))
        reserved = sum((D(s.reserved_kg) for s in stocks), D("0"))
        available = max(D("0"), on_hand - reserved)
        shortage = max(D("0"), required_kg - available)
        rows.append({
            "material_id": item.material_id,
            "material_code": material.material_code if material else None,
            "material_name": material.trade_name if material else None,
            "dose_mg": item.dose_mg,
            "required_kg": required_kg,
            "on_hand_kg": on_hand,
            "reserved_kg": reserved,
            "available_kg": available,
            "shortage_kg": shortage,
            "status": "SHORTAGE" if shortage > 0 else "OK",
        })
    return {
        "production_order_id": po.id,
        "ordered_quantity": po.ordered_quantity,
        "planned_quantity": po.planned_quantity,
        "waste_percent": po.waste_percent,
        "materials": rows,
    }
