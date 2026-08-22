from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import FormulaRevision, FormulaItem, MaterialSupplier, PackagingSpec

D = Decimal

def recalc_revision(db: Session, revision_id: int):
    revision = db.get(FormulaRevision, revision_id)
    items = db.scalars(select(FormulaItem).where(FormulaItem.revision_id == revision_id)).all()
    total_weight = sum((D(i.dose_mg) for i in items), D("0"))
    ingredient_cost = D("0")
    for item in items:
        price = D("0")
        if item.material_supplier_id:
            link = db.get(MaterialSupplier, item.material_supplier_id)
            if link:
                price = D(link.price_per_kg)
        item.price_per_kg_snapshot = price
        item.cost_per_unit = D(item.dose_mg) * (price / D("1000000"))
        item.percentage = (D(item.dose_mg) * D("100") / total_weight) if total_weight else D("0")
        ingredient_cost += D(item.cost_per_unit)

    package = db.scalar(select(PackagingSpec).where(PackagingSpec.revision_id == revision_id))
    packaging_cost = D(package.packaging_cost_per_unit) if package else D("0")
    revision.total_weight_mg = total_weight
    revision.ingredient_cost_per_unit = ingredient_cost
    revision.packaging_cost_per_unit = packaging_cost
    db.commit()
    return revision

def revision_diff(db: Session, revision_id: int):
    current = db.get(FormulaRevision, revision_id)
    if not current:
        return []
    previous = db.scalar(
        select(FormulaRevision)
        .where(
            FormulaRevision.formula_id == current.formula_id,
            FormulaRevision.revision_no < current.revision_no
        )
        .order_by(FormulaRevision.revision_no.desc())
    )
    if not previous:
        return []

    def item_map(rid):
        rows = db.scalars(select(FormulaItem).where(FormulaItem.revision_id == rid)).all()
        return {r.material_id: r for r in rows}

    old, new = item_map(previous.id), item_map(current.id)
    result = []
    for material_id in sorted(set(old) | set(new)):
        a, b = old.get(material_id), new.get(material_id)
        if a is None:
            result.append({"material_id": material_id, "change": "ADDED", "highlight": "red"})
        elif b is None:
            result.append({"material_id": material_id, "change": "REMOVED", "highlight": "red"})
        else:
            fields = []
            if D(a.dose_mg) != D(b.dose_mg): fields.append("dose")
            if a.material_supplier_id != b.material_supplier_id: fields.append("supplier")
            if fields:
                result.append({
                    "material_id": material_id,
                    "change": "MODIFIED",
                    "fields": fields,
                    "highlight": "red"
                })
    return result
