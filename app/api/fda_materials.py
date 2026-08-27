from pathlib import Path
import json
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user
from app.models.entities import FDAMaterial


def _natural_code_key(code: str):
    """Sort key so A0002 < A0010 < A0100 (numeric, not lexicographic) while
    still grouping by letter prefix: A0001, A0002, ..., B0001, ...
    """
    raw = str(code or "").strip().upper()
    m = re.match(r"^([A-Z]*)0*(\d+)(.*)$", raw)
    if m:
        return (m.group(1), int(m.group(2)), m.group(3))
    return (raw, -1, "")


def normalize_material_code(value: str) -> str:
    raw=str(value or "").strip().upper()
    import re

    # A0001.50 -> A0001
    m=re.match(r"^([A-Z]+)0*(\d{1,4})(?:\..*)?$",raw)
    if m:
        return m.group(1)+m.group(2)[-4:].zfill(4)

    m=re.search(r"([A-Z]+)0*(\d{1,4})",raw)
    if m:
        return m.group(1)+m.group(2)[-4:].zfill(4)

    return re.sub(r"\s+","",raw)


router=APIRouter(prefix="/api/fda-materials",tags=["FDA Material Database"])


class FDAMaterialPayload(BaseModel):
    material_code: str
    supplier_category: Optional[str] = None
    product_name: Optional[str] = None
    supplier_company: Optional[str] = None
    supplier_code: Optional[str] = None
    coa: Optional[str] = None
    fda_number: Optional[str] = None
    registered_name: Optional[str] = None
    origin_country: Optional[str] = None
    price_per_kg: Optional[str] = None
    halal: Optional[str] = None
    purity: Optional[str] = None
    assay: Optional[str] = None
    ratio: Optional[str] = None
    percentage: Optional[str] = None
    note: Optional[str] = None
    image_url: Optional[str] = None


def serialize(x: FDAMaterial):
    return {
        "id":x.id,
        "material_code":x.material_code,
        "supplier_category":x.supplier_category or "",
        "product_name":x.product_name or "",
        "supplier_company":x.supplier_company or "",
        "supplier_code":x.supplier_code or "",
        "coa":x.coa or "",
        "fda_number":x.fda_number or "",
        "registered_name":x.registered_name or "",
        "origin_country":x.origin_country or "",
        "price_per_kg":x.price_per_kg or "",
        "halal":x.halal or "",
        "purity":x.purity or "",
        "assay":x.assay or "",
        "ratio":x.ratio or "",
        "percentage":x.percentage or "",
        "note":x.note or "",
        "image_url":x.image_url or "",
        "created_at":x.created_at.isoformat() if x.created_at else None,
        "updated_at":x.updated_at.isoformat() if x.updated_at else None,
    }


@router.get("")
def list_fda_materials(
    q: str = Query(default=""),
    code: str = Query(default=""),
    name: str = Query(default=""),
    category: str = Query(default=""),
    limit: int = Query(default=300,ge=1,le=3000),
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    query=db.query(FDAMaterial)
    term=(q or "").strip()
    if term:
        like=f"%{term}%"
        query=query.filter(or_(
            FDAMaterial.material_code.ilike(like),
            FDAMaterial.product_name.ilike(like),
            FDAMaterial.supplier_company.ilike(like),
            FDAMaterial.fda_number.ilike(like),
            FDAMaterial.registered_name.ilike(like),
            FDAMaterial.origin_country.ilike(like),
        ))
    # Separate code/name search boxes, usable together or on their own.
    code_term=(code or "").strip()
    if code_term:
        query=query.filter(FDAMaterial.material_code.ilike(f"%{code_term}%"))
    name_term=(name or "").strip()
    if name_term:
        like=f"%{name_term}%"
        query=query.filter(or_(
            FDAMaterial.product_name.ilike(like),
            FDAMaterial.registered_name.ilike(like),
        ))
    cat=(category or "").strip()
    if cat:
        query=query.filter(FDAMaterial.supplier_category.ilike(cat))
    # Natural (numeric) sort so A0002 < A0010 < A0100 — plain string sort
    # would put A0100 before A0002. Fetch matching rows unsorted from the DB
    # and sort in Python; the FDA table tops out around a few thousand rows.
    rows=query.limit(max(limit,3000)).all()
    rows.sort(key=lambda x: _natural_code_key(x.material_code))
    return [serialize(x) for x in rows[:limit]]


@router.get("/categories")
def fda_categories(db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Distinct supplier_category values (A, B, C, ...) with item counts, for
    building category tabs in the PURCHASE FDA + material-code database."""
    from sqlalchemy import func
    rows=(
        db.query(FDAMaterial.supplier_category, func.count(FDAMaterial.id))
        .group_by(FDAMaterial.supplier_category)
        .all()
    )
    out=[{"category": (c or "").strip(), "count": n} for c, n in rows if (c or "").strip()]
    out.sort(key=lambda x: x["category"])
    return out


@router.get("/map")
def fda_map(
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    rows=db.query(FDAMaterial.material_code,FDAMaterial.fda_number).all()
    result={}
    for code,fda in rows:
        key=normalize_material_code(code or "")
        if not key:
            continue
        result[key]=str(fda or "").strip()
    return result


@router.get("/catalog/live")
def unified_material_catalog(
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Single source of truth used by R&D dropdowns and PURCHASE master data."""
    rows=db.query(FDAMaterial).order_by(FDAMaterial.material_code.asc()).all()
    return [{
        "code":x.material_code or "",
        "base_code":x.material_code or "",
        "variant_code":x.material_code or "",
        "name":x.product_name or x.registered_name or "",
        "registered_name":x.registered_name or "",
        "vendor":x.supplier_company or "",
        "origin":x.origin_country or "",
        "price":x.price_per_kg or "",
        "halal":x.halal or "",
        "fda":x.fda_number or "",
    } for x in rows]


def _require_purchase_editor(u):
    role=str(getattr(u,"role","") or "").upper()
    if role not in {"PURCHASE","ADMIN","CEO"}:
        raise HTTPException(403,"ฐาน FDA / รหัสสาร จัดการโดยแผนก PURCHASE")


@router.get("/{item_id}")
def get_fda_material(item_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=db.get(FDAMaterial,item_id)
    if not x:
        raise HTTPException(404,"FDA material not found")
    return serialize(x)


@router.post("")
def create_fda_material(p:FDAMaterialPayload,db:Session=Depends(get_db),u=Depends(get_current_user)):
    _require_purchase_editor(u)
    code=normalize_material_code(p.material_code)
    if not code:
        raise HTTPException(400,"material_code is required")
    if db.query(FDAMaterial).filter(FDAMaterial.material_code==code).first():
        raise HTTPException(409,"รหัสวัตถุดิบนี้มีอยู่แล้ว")
    x=FDAMaterial(material_code=code,created_by=u.id)
    for k,v in p.model_dump(exclude={"material_code"}).items():
        setattr(x,k,v)
    db.add(x)
    db.commit()
    db.refresh(x)
    return serialize(x)


@router.put("/{item_id}")
def update_fda_material(item_id:int,p:FDAMaterialPayload,db:Session=Depends(get_db),u=Depends(get_current_user)):
    _require_purchase_editor(u)
    x=db.get(FDAMaterial,item_id)
    if not x:
        raise HTTPException(404,"FDA material not found")
    code=normalize_material_code(p.material_code)
    duplicate=db.query(FDAMaterial).filter(FDAMaterial.material_code==code,FDAMaterial.id!=item_id).first()
    if duplicate:
        raise HTTPException(409,"รหัสวัตถุดิบนี้มีอยู่แล้ว")
    for k,v in p.model_dump().items():
        setattr(x,k,code if k=="material_code" else v)
    db.commit()
    db.refresh(x)
    return serialize(x)


@router.delete("/{item_id}")
def delete_fda_material(item_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    _require_purchase_editor(u)
    x=db.get(FDAMaterial,item_id)
    if not x:
        raise HTTPException(404,"FDA material not found")
    db.delete(x)
    db.commit()
    return {"ok":True}





@router.post("/seed")
def seed_fda_now(
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    _require_purchase_editor(u)
    result=seed_fda_materials(db)
    return {"ok":True,"result":result}



def seed_fda_materials(db: Session):
    project_root=Path(__file__).resolve().parents[2]
    path=project_root/"data"/"fda_seed.json"

    if not path.exists():
        return f"seed skipped: file not found at {path}"

    try:
        rows=json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return f"seed skipped: cannot read seed file: {type(e).__name__}: {e}"

    text_fields=(
        "supplier_category","product_name","supplier_company","coa",
        "fda_number","registered_name","origin_country","price_per_kg","halal","assay","ratio",
        "percentage","note","image_url"
    )

    dedup={}
    for raw in rows:
        code=normalize_material_code(raw.get("material_code") or "")
        if not code:
            continue

        current=dedup.setdefault(code,{
            "material_code":code,
            **{k:"" for k in text_fields}
        })

        for key in text_fields:
            value=str(raw.get(key) or "").strip()
            if not current.get(key) and value:
                current[key]=value

    if not dedup:
        return "seed skipped: no valid material codes"

    existing_rows={
        str(x.material_code or "").strip().upper(): x
        for x in db.query(FDAMaterial).all()
        if x.material_code
    }

    # Enrich existing records only where the database field is blank.
    # This preserves any value already edited by PURCHASE users.
    enriched=0
    for code,d in dedup.items():
        x=existing_rows.get(code)
        if not x:
            continue
        changed=False
        for key in text_fields:
            incoming=str(d.get(key) or "").strip()
            current=str(getattr(x,key,None) or "").strip()
            if not current and incoming:
                setattr(x,key,incoming)
                changed=True
        if changed:
            enriched+=1
    if enriched:
        db.commit()

    existing_codes=set(existing_rows)
    missing=[d for code,d in dedup.items() if code not in existing_codes]
    if not missing:
        return f"seed complete: 0 inserted, {enriched} existing records enriched"

    def make_obj(d):
        return FDAMaterial(
            material_code=d["material_code"][:80],
            supplier_category=(d.get("supplier_category") or None),
            product_name=(d.get("product_name") or None),
            supplier_company=(d.get("supplier_company") or None),
            coa=(d.get("coa") or None),
            fda_number=(d.get("fda_number") or None),
            registered_name=(d.get("registered_name") or None),
            origin_country=(d.get("origin_country") or None),
            price_per_kg=(d.get("price_per_kg") or None),
            halal=(d.get("halal") or None),
            assay=(d.get("assay") or None),
            ratio=(d.get("ratio") or None),
            percentage=(d.get("percentage") or None),
            note=(d.get("note") or None),
            image_url=(d.get("image_url") or None),
        )

    inserted=0
    skipped=0
    batch_size=100

    for start in range(0,len(missing),batch_size):
        batch=missing[start:start+batch_size]
        try:
            db.add_all([make_obj(d) for d in batch])
            db.commit()
            inserted+=len(batch)
        except Exception as batch_error:
            db.rollback()
            print(f"[FDA SEED] Batch fallback: {type(batch_error).__name__}: {batch_error}")

            # Retry one by one so one malformed record cannot block all others
            for d in batch:
                try:
                    if db.query(FDAMaterial).filter(
                        FDAMaterial.material_code==d["material_code"]
                    ).first():
                        continue
                    db.add(make_obj(d))
                    db.commit()
                    inserted+=1
                except Exception as row_error:
                    db.rollback()
                    skipped+=1
                    print(
                        f"[FDA SEED] Skipped {d['material_code']}: "
                        f"{type(row_error).__name__}: {row_error}"
                    )

    return (
        f"seed complete: {inserted} inserted, "
        f"{len(existing_codes)} existed, {skipped} skipped, "
        f"{len(dedup)} unique in source"
    )

