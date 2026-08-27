import base64
import io
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import PackagingItem

router = APIRouter(prefix="/api/packaging", tags=["Packaging Database"])

MARKUP = 1.20  # ราคาจริง = ต้นทุน + 20%
CATALOG_FILE = Path(__file__).resolve().parents[1] / "static" / "package_catalog.json"
MAX_IMAGE_DIMENSION = 900  # px, longest side after resize
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB raw upload cap, before resize/compress


def _sell_price(cost) -> Optional[float]:
    try:
        if cost is None or str(cost).strip() == "":
            return None
        return round(float(cost) * MARKUP, 2)
    except (TypeError, ValueError):
        return None


class PackagingTierPayload(BaseModel):
    rate: Optional[str] = None
    cost: Optional[float] = None
    lead_time: Optional[str] = None
    packing: Optional[str] = None
    supplier: Optional[str] = None


class PackagingItemPayload(BaseModel):
    category: Optional[str] = None
    spec: str
    official_name: Optional[str] = None
    cost: Optional[float] = None
    supplier: Optional[str] = None
    rate: Optional[str] = None
    lead_time: Optional[str] = None
    packing: Optional[str] = None
    tiers: list[PackagingTierPayload] = []


def _serialize_tiers(raw: Optional[str]) -> list[dict]:
    try:
        tiers = json.loads(raw) if raw else []
    except Exception:
        tiers = []
    out = []
    for t in tiers or []:
        cost = t.get("cost")
        out.append({
            "rate": t.get("rate"),
            "cost": cost,
            "price": _sell_price(cost),
            "lead_time": t.get("lead_time"),
            "packing": t.get("packing"),
            "supplier": t.get("supplier"),
        })
    return out


def serialize(x: PackagingItem) -> dict:
    return {
        "id": x.id,
        "category": x.category or "",
        "spec": x.spec or "",
        "official_name": x.official_name or "",
        "cost": float(x.cost) if x.cost is not None else None,
        # "price" is the real/selling price the rest of the app reads —
        # cost + 20% markup, computed here so it can never go stale.
        "price": _sell_price(x.cost),
        "supplier": x.supplier or "",
        "rate": x.rate or "",
        "lead_time": x.lead_time or "",
        "packing": x.packing or "",
        "tiers": _serialize_tiers(x.tiers_json),
        "is_active": x.is_active,
        # Image bytes are never inlined into the list payload (they're
        # already resized/compressed but still too big for a list of
        # hundreds of rows) — the browser fetches them lazily via <img src>.
        "image_url": f"/api/packaging/{x.id}/image" if x.image_data else "",
    }


@router.get("")
def list_packaging(
    q: str = Query(default=""),
    category: str = Query(default=""),
    limit: int = Query(default=2000, ge=1, le=5000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query = db.query(PackagingItem).filter(PackagingItem.is_active == True)  # noqa: E712
    term = (q or "").strip()
    if term:
        like = f"%{term}%"
        query = query.filter(or_(
            PackagingItem.spec.ilike(like),
            PackagingItem.official_name.ilike(like),
            PackagingItem.category.ilike(like),
            PackagingItem.supplier.ilike(like),
        ))
    cat = (category or "").strip()
    if cat:
        query = query.filter(PackagingItem.category.ilike(cat))
    rows = query.order_by(PackagingItem.category.asc(), PackagingItem.spec.asc()).limit(limit).all()
    return [serialize(x) for x in rows]


@router.get("/categories")
def packaging_categories(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = (
        db.query(PackagingItem.category)
        .filter(PackagingItem.is_active == True)  # noqa: E712
        .distinct()
        .all()
    )
    cats = sorted({(c or "").strip() for (c,) in rows if (c or "").strip()})
    return cats


@router.get("/{item_id}")
def get_packaging(item_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = db.get(PackagingItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging item not found")
    return serialize(x)


@router.post("")
def create_packaging(
    p: PackagingItemPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = PackagingItem(
        category=p.category, spec=p.spec, official_name=p.official_name,
        cost=p.cost, supplier=p.supplier, rate=p.rate,
        lead_time=p.lead_time, packing=p.packing,
        tiers_json=json.dumps([t.model_dump() for t in p.tiers], ensure_ascii=False) if p.tiers else None,
    )
    db.add(x); db.commit(); db.refresh(x)
    return serialize(x)


@router.put("/{item_id}")
def update_packaging(
    item_id: int,
    p: PackagingItemPayload,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging item not found")
    x.category = p.category
    x.spec = p.spec
    x.official_name = p.official_name
    x.cost = p.cost
    x.supplier = p.supplier
    x.rate = p.rate
    x.lead_time = p.lead_time
    x.packing = p.packing
    if p.tiers:
        x.tiers_json = json.dumps([t.model_dump() for t in p.tiers], ensure_ascii=False)
    db.commit(); db.refresh(x)
    return serialize(x)


@router.delete("/{item_id}")
def delete_packaging(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging item not found")
    x.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/{item_id}/image")
async def upload_packaging_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging item not found")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, "ไฟล์รูปใหญ่เกินไป (จำกัด 8MB)")

    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=82)
        encoded = base64.b64encode(buf.getvalue()).decode("ascii")
        mime = "image/jpeg"
    except Exception as e:
        raise HTTPException(400, f"ไฟล์นี้ไม่ใช่รูปภาพที่ใช้ได้: {type(e).__name__}: {e}")

    x.image_data = encoded
    x.image_mime = mime
    db.commit()
    return {"ok": True, "image_url": f"/api/packaging/{x.id}/image"}


@router.get("/{item_id}/image")
def get_packaging_image(item_id: int, db: Session = Depends(get_db)):
    # Deliberately not behind get_current_user: a plain <img src="..."> tag
    # can't attach an Authorization header, and these are just packaging
    # product photos (not sensitive), matching how FDAMaterial.image_url
    # already links out to unauthenticated external images.
    x = db.get(PackagingItem, item_id)
    if not x or not x.image_data:
        raise HTTPException(404, "No image for this packaging item")
    raw = base64.b64decode(x.image_data)
    return Response(content=raw, media_type=x.image_mime or "image/jpeg")


@router.delete("/{item_id}/image")
def delete_packaging_image(
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN", "PURCHASE")),
):
    x = db.get(PackagingItem, item_id)
    if not x:
        raise HTTPException(404, "Packaging item not found")
    x.image_data = None
    x.image_mime = None
    db.commit()
    return {"ok": True}


def import_package_catalog(db: Session) -> str:
    """One-time, idempotent import of the static package_catalog.json into the
    real packaging_items table. Matches existing rows by (category, spec) so
    re-running (e.g. on every server start) never creates duplicates and
    never overwrites data an operator has since edited by hand.
    """
    if not CATALOG_FILE.exists():
        return f"import skipped: file not found at {CATALOG_FILE}"
    try:
        rows = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        return f"import skipped: cannot read catalog file: {type(e).__name__}: {e}"

    existing = {
        (str(x.category or "").strip().lower(), str(x.spec or "").strip().lower())
        for x in db.query(PackagingItem.category, PackagingItem.spec).all()
    }

    inserted = 0
    for row in rows or []:
        spec = str(row.get("spec") or "").strip()
        if not spec:
            continue
        category = str(row.get("category") or "").strip()
        key = (category.lower(), spec.lower())
        if key in existing:
            continue
        existing.add(key)
        tiers = row.get("tiers") or []
        db.add(PackagingItem(
            category=category or None,
            spec=spec,
            cost=row.get("price"),
            supplier=row.get("supplier"),
            rate=str(row.get("rate")) if row.get("rate") is not None else None,
            lead_time=str(row.get("lead_time")) if row.get("lead_time") is not None else None,
            packing=row.get("packing"),
            source_row=row.get("source_row"),
            tiers_json=json.dumps([{
                "rate": t.get("rate"), "cost": t.get("price"),
                "lead_time": t.get("lead_time"), "packing": t.get("packing"),
                "supplier": t.get("supplier"),
            } for t in tiers], ensure_ascii=False) if tiers else None,
        ))
        inserted += 1
    db.commit()
    return f"import complete: {inserted} inserted, {len(rows or []) - inserted} already existed"
