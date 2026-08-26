from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user, can_view_pricing, require_roles
from app.models.entities import *
from app.schemas.erp import *
from app.services.audit import audit
from app.services.formula import recalc_revision, revision_diff

router=APIRouter(prefix="/api",tags=["R&D Formula"])

@router.post("/projects")
def create_project(p: ProjectCreate, db:Session=Depends(get_db), u=Depends(get_current_user)):
    if not db.get(Customer,p.customer_id): raise HTTPException(404,"Customer not found")
    data=p.model_dump(exclude={"supplement_items"}); x=ProductProject(**data); db.add(x); db.flush()
    for item in p.supplement_items: db.add(ProjectSupplementItem(project_id=x.id, **item.model_dump()))
    audit(db,u.id,"CREATE","ProductProject",x.id); db.commit(); db.refresh(x); return x

@router.get("/projects")
def list_projects(db:Session=Depends(get_db),_=Depends(get_current_user)):
    return db.scalars(select(ProductProject).order_by(ProductProject.id.desc())).all()

@router.post("/formulas")
def create_formula(p:FormulaCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=Formula(**p.model_dump());db.add(x);db.flush();audit(db,u.id,"CREATE","Formula",x.id);db.commit();db.refresh(x);return x

@router.post("/formulas/{formula_id}/revisions")
def create_revision(formula_id:int,p:RevisionCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    if not db.get(Formula,formula_id):raise HTTPException(404,"Formula not found")
    x=FormulaRevision(formula_id=formula_id,**p.model_dump());db.add(x);db.flush();audit(db,u.id,"CREATE","FormulaRevision",x.id);db.commit();db.refresh(x);return x

@router.post("/revisions/{revision_id}/items")
def add_item(revision_id:int,p:FormulaItemCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    rev=db.get(FormulaRevision,revision_id)
    if not rev:raise HTTPException(404,"Revision not found")
    link=db.get(MaterialSupplier,p.material_supplier_id) if p.material_supplier_id else None
    if link and link.material_id!=p.material_id:raise HTTPException(400,"Supplier link belongs to another material")
    x=FormulaItem(revision_id=revision_id,**p.model_dump());db.add(x);db.flush();recalc_revision(db,revision_id);audit(db,u.id,"ADD_ITEM","FormulaRevision",revision_id);db.commit();db.refresh(x);return x

@router.post("/revisions/{revision_id}/process-steps")
def add_process(revision_id:int,p:ProcessStepCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=FormulaProcessStep(revision_id=revision_id,**p.model_dump());db.add(x);db.commit();db.refresh(x);return x

@router.put("/revisions/{revision_id}/packaging")
def set_packaging(revision_id:int,p:PackagingSpecCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=db.scalar(select(PackagingSpec).where(PackagingSpec.revision_id==revision_id))
    if not x:x=PackagingSpec(revision_id=revision_id,**p.model_dump());db.add(x)
    else:
        for k,v in p.model_dump().items():setattr(x,k,v)
    db.commit();recalc_revision(db,revision_id);db.refresh(x);return x

@router.get("/revisions/{revision_id}")
def get_revision(revision_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    r=db.get(FormulaRevision,revision_id)
    if not r:raise HTTPException(404,"Not found")
    items=db.scalars(select(FormulaItem).where(FormulaItem.revision_id==revision_id)).all()
    visible=can_view_pricing(u.role)
    data={
      "id":r.id,"revision_no":r.revision_no,"status":r.status,"total_weight_mg":r.total_weight_mg,
      "items":[{"id":i.id,"material_id":i.material_id,"material_supplier_id":i.material_supplier_id,
                "dose_mg":i.dose_mg,"percentage":i.percentage,
                **({"price_per_kg":i.price_per_kg_snapshot,"cost_per_unit":i.cost_per_unit} if visible else {})} for i in items],
      "diff":revision_diff(db,revision_id)
    }
    if visible:
        data.update({"ingredient_cost_per_unit":r.ingredient_cost_per_unit,
                     "packaging_cost_per_unit":r.packaging_cost_per_unit,
                     "selling_price_per_unit":r.selling_price_per_unit})
    return data

@router.post("/revisions/{revision_id}/approve")
def approve_revision(revision_id:int,db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","ADMIN"))):
    r=db.get(FormulaRevision,revision_id)
    if not r:raise HTTPException(404,"Not found")
    r.status="APPROVED";r.approved_at=datetime.utcnow();audit(db,u.id,"APPROVE","FormulaRevision",r.id);db.commit()
    return {"status":"APPROVED"}

@router.post("/registration-formulas")
def create_registration(p:RegistrationCreate,db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","RD_OFFICER","ADMIN"))):
    x=RegistrationFormula(**p.model_dump());db.add(x);db.commit();db.refresh(x);return x
