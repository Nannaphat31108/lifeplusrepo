from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user, can_view_pricing
from app.models.entities import *
from app.services.formula import recalc_revision, revision_diff

router=APIRouter(prefix="/api/final",tags=["Final ERP UI"])

def val(v, placeholder="ให้ใส่ Data"):
    return v if v not in (None,"") else placeholder

@router.get("/project/{project_id}")
def project_detail(project_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    p=db.get(ProductProject,project_id)
    if not p: raise HTTPException(404,"Project not found")
    c=db.get(Customer,p.customer_id)
    return {
      "id":p.id,"project_no":p.project_no,
      "customer":{"id":c.id,"code":c.customer_code,"name":c.name,"contact":val(c.contact_name),"phone":val(c.phone),"email":val(c.email)} if c else None,
      "salesperson":val(p.salesperson),"product_name":p.product_name,"supplement_code":val(p.supplement_code),"product_type":val(p.product_type),
      "target_price":p.target_price,"target_quantity":p.target_quantity,
      "requirement_text":val(p.requirement_text),"claims":val(p.claims),"flavor":val(p.flavor),
      "packaging_requirement":val(p.packaging_requirement),"deadline":p.deadline,"status":p.status
    }

@router.get("/revision/{revision_id}")
def revision_detail(revision_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    r=db.get(FormulaRevision,revision_id)
    if not r: raise HTTPException(404,"Revision not found")
    f=db.get(Formula,r.formula_id); p=db.get(ProductProject,f.project_id) if f else None
    c=db.get(Customer,p.customer_id) if p else None
    items=db.scalars(select(FormulaItem).where(FormulaItem.revision_id==r.id).order_by(FormulaItem.id)).all()
    steps=db.scalars(select(FormulaProcessStep).where(FormulaProcessStep.revision_id==r.id).order_by(FormulaProcessStep.sequence_no)).all()
    pack=db.scalar(select(PackagingSpec).where(PackagingSpec.revision_id==r.id))
    rows=[]
    for i in items:
        m=db.get(RawMaterial,i.material_id)
        ms=db.get(MaterialSupplier,i.material_supplier_id) if i.material_supplier_id else None
        s=db.get(Supplier,ms.supplier_id) if ms else None
        row={"id":i.id,"material_id":i.material_id,"material_code":m.material_code if m else "-",
             "material_name":m.trade_name if m else "-","ingredient_name":val(m.ingredient_name) if m else "-",
             "dose_mg":i.dose_mg,"percentage":i.percentage,"supplier":val(s.name) if s else "ให้ใส่ Data",
             "country":val(ms.country) if ms else "ให้ใส่ Data","halal":m.halal if m else False,
             "specification_ref":val(m.specification_ref) if m else "ให้ใส่ Data","fda_ref":val(m.fda_ref) if m else "ให้ใส่ Data",
             "note":val(i.note)}
        if can_view_pricing(u.role): row.update({"price_per_kg":i.price_per_kg_snapshot,"cost_per_unit":i.cost_per_unit})
        rows.append(row)
    out={"id":r.id,"formula_id":r.formula_id,"formula_no":f.formula_no if f else "-","formula_name":val(f.formula_name) if f else "-",
         "customer":c.name if c else "ให้ใส่ Data","project_no":p.project_no if p else "-","product_name":p.product_name if p else "-",
         "revision_no":r.revision_no,"reason":val(r.reason),"customer_feedback":val(r.customer_feedback),"status":r.status,
         "total_weight_mg":r.total_weight_mg,"items":rows,"diff":revision_diff(db,r.id),
         "process_steps":[{"sequence_no":x.sequence_no,"instruction":x.instruction,"sieve_spec":val(x.sieve_spec)} for x in steps],
         "packaging":{"dosage_form":val(pack.dosage_form),"capsule_size":val(pack.capsule_size),"capsule_color":val(pack.capsule_color),
                      "tablet_shape":val(pack.tablet_shape),"sachet_size":val(pack.sachet_size),"water_ml":pack.water_ml,
                      "serving_per_day":val(pack.serving_per_day)} if pack else {
                        "dosage_form":"ให้ใส่ Data","capsule_size":"ให้ใส่ Data","capsule_color":"ให้ใส่ Data",
                        "tablet_shape":"ให้ใส่ Data","sachet_size":"ให้ใส่ Data","water_ml":None,"serving_per_day":"ให้ใส่ Data"}
    }
    if can_view_pricing(u.role): out.update({"ingredient_cost_per_unit":r.ingredient_cost_per_unit,"packaging_cost_per_unit":r.packaging_cost_per_unit,"selling_price_per_unit":r.selling_price_per_unit})
    return out

@router.delete("/revision-items/{item_id}")
def delete_item(item_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=db.get(FormulaItem,item_id)
    if not x: raise HTTPException(404,"Item not found")
    rid=x.revision_id; db.delete(x);db.flush();recalc_revision(db,rid);db.commit()
    return {"ok":True}

@router.post("/revision/{revision_id}/clone")
def clone_revision(revision_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    old=db.get(FormulaRevision,revision_id)
    if not old: raise HTTPException(404,"Revision not found")
    maxno=max([x.revision_no for x in db.scalars(select(FormulaRevision).where(FormulaRevision.formula_id==old.formula_id)).all()] or [0])
    n=FormulaRevision(formula_id=old.formula_id,revision_no=maxno+1,reason="ปรับสูตรจาก Revision ก่อนหน้า",
                      customer_feedback=old.customer_feedback,selling_price_per_unit=old.selling_price_per_unit)
    db.add(n);db.flush()
    for x in db.scalars(select(FormulaItem).where(FormulaItem.revision_id==old.id)).all():
        db.add(FormulaItem(revision_id=n.id,material_id=x.material_id,material_supplier_id=x.material_supplier_id,
                           dose_mg=x.dose_mg,percentage=x.percentage,price_per_kg_snapshot=x.price_per_kg_snapshot,
                           cost_per_unit=x.cost_per_unit,note=x.note))
    for x in db.scalars(select(FormulaProcessStep).where(FormulaProcessStep.revision_id==old.id)).all():
        db.add(FormulaProcessStep(revision_id=n.id,sequence_no=x.sequence_no,instruction=x.instruction,sieve_spec=x.sieve_spec))
    pk=db.scalar(select(PackagingSpec).where(PackagingSpec.revision_id==old.id))
    if pk:
        db.add(PackagingSpec(revision_id=n.id,dosage_form=pk.dosage_form,capsule_size=pk.capsule_size,capsule_color=pk.capsule_color,
                             tablet_shape=pk.tablet_shape,sachet_size=pk.sachet_size,water_ml=pk.water_ml,
                             serving_per_day=pk.serving_per_day,packaging_cost_per_unit=pk.packaging_cost_per_unit))
    db.flush();recalc_revision(db,n.id);db.commit();db.refresh(n)
    return {"id":n.id,"revision_no":n.revision_no}

@router.get("/registration")
def registration(db:Session=Depends(get_db),u=Depends(get_current_user)):
    rows=db.scalars(select(RegistrationFormula).order_by(RegistrationFormula.id.desc())).all()
    return [{"id":x.id,"formula_id":x.formula_id,"formula_revision_id":x.formula_revision_id,
             "registration_no":val(x.registration_no),"sent_to_admin":x.sent_to_admin,
             "deposit_50_received":x.deposit_50_received,"notes":val(x.notes)} for x in rows]

@router.get("/material-suppliers")
def material_suppliers(db:Session=Depends(get_db),u=Depends(get_current_user)):
    rows=db.scalars(select(MaterialSupplier).order_by(MaterialSupplier.id.desc())).all()
    out=[]
    for x in rows:
        m=db.get(RawMaterial,x.material_id);s=db.get(Supplier,x.supplier_id)
        d={"id":x.id,"material_id":x.material_id,"material":m.trade_name if m else "-","supplier_id":x.supplier_id,
           "supplier":s.name if s else "-","country":val(x.country),"lead_time_days":x.lead_time_days,"is_preferred":x.is_preferred}
        if can_view_pricing(u.role): d.update({"price_per_kg":x.price_per_kg,"currency":x.currency})
        out.append(d)
    return out

@router.get("/projects-full")
def projects_full(db:Session=Depends(get_db),u=Depends(get_current_user)):
 out=[]
 for p in db.scalars(select(ProductProject).order_by(ProductProject.id.desc())).all():
  c=db.get(Customer,p.customer_id);ss=db.scalars(select(ProjectSupplementItem).where(ProjectSupplementItem.project_id==p.id)).all()
  out.append({"id":p.id,"project_no":p.project_no,"customer":c.name if c else "ให้ใส่ Data","product_name":p.product_name,"target_quantity":p.target_quantity,"deadline":p.deadline,"status":p.status,"supplements":[{"code":x.supplement_code,"name":x.supplement_name or "ให้ใส่ Data","amount":x.amount,"unit":x.unit} for x in ss]})
 return out
