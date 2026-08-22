from datetime import timedelta, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user, can_view_pricing, require_roles
from app.models.entities import *
from app.schemas.erp import *
from app.services.formula import recalc_revision
from app.services.mrp import calculate_mrp
from app.services.audit import audit

router=APIRouter(prefix="/api",tags=["Tester / Rate / Production"])

@router.post("/tester-requests")
def create_tester(p:TesterCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    r=recalc_revision(db,p.formula_revision_id)
    tester_cost=(Decimal(r.ingredient_cost_per_unit)+Decimal(r.packaging_cost_per_unit))*p.quantity
    x=TesterRequest(**p.model_dump(),tester_cost=tester_cost)
    db.add(x);db.flush();audit(db,u.id,"CREATE","TesterRequest",x.id);db.commit();db.refresh(x)
    return {"id":x.id,"tester_no":x.tester_no,"status":x.delivery_status,
            "due_window":{"earliest":str(x.requested_date+timedelta(days=7)),"latest":str(x.requested_date+timedelta(days=14))}}

@router.get("/tester-requests/{tester_id}")
def tester_detail(tester_id:int,db:Session=Depends(get_db),u=Depends(get_current_user)):
    x=db.get(TesterRequest,tester_id)
    if not x:raise HTTPException(404,"Not found")
    data={"id":x.id,"tester_no":x.tester_no,"quotation_no":x.quotation_no,"receipt_no":x.receipt_no,
          "customer_need":x.customer_need,"characteristic":x.characteristic,"packaging":x.packaging,
          "quantity":x.quantity,"requested_date":x.requested_date,"delivery_date":x.delivery_date,
          "tester_type":x.tester_type,"pay_in_ref":x.pay_in_ref,"status":x.delivery_status}
    if can_view_pricing(u.role):
        data.update({"paid_amount":x.paid_amount,"tester_cost":x.tester_cost})
    return data

@router.post("/rate-requests")
def create_rate(p:RateCreate,db:Session=Depends(get_db),u=Depends(get_current_user)):
    rev=recalc_revision(db,p.formula_revision_id)
    cost=Decimal(rev.ingredient_cost_per_unit)+Decimal(rev.packaging_cost_per_unit)
    x=RateRequest(**p.model_dump(exclude={"tiers"}));db.add(x);db.flush()
    for t in p.tiers:
        sell=Decimal(t.selling_price_per_unit) if t.selling_price_per_unit is not None else (
            cost/(Decimal("1")-Decimal(t.margin_percent)/Decimal("100")) if Decimal(t.margin_percent)<100 else cost)
        profit=sell-cost
        total=profit*Decimal(t.quantity)
        margin=(profit*100/sell) if sell else Decimal("0")
        db.add(RateTier(rate_request_id=x.id,quantity=t.quantity,cost_per_unit=cost,
                        selling_price_per_unit=sell,profit_per_unit=profit,total_profit=total,
                        net_profit=total,margin_percent=margin))
    audit(db,u.id,"CREATE","RateRequest",x.id);db.commit();db.refresh(x);return {"id":x.id,"rate_no":x.rate_no}

@router.post("/rate-requests/{rate_id}/approve-rd")
def approve_rate_rd(rate_id:int,db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","ADMIN"))):
    x=db.get(RateRequest,rate_id)
    if not x:raise HTTPException(404,"Not found")
    x.rd_head_approved=True
    if x.sales_approved:x.status="APPROVED"
    else:x.status="WAITING_SALES"
    db.commit();return {"status":x.status}

@router.post("/rate-requests/{rate_id}/approve-sales")
def approve_rate_sales(rate_id:int,db:Session=Depends(get_db),u=Depends(require_roles("SALES","ADMIN"))):
    x=db.get(RateRequest,rate_id)
    if not x:raise HTTPException(404,"Not found")
    if not x.rd_head_approved:raise HTTPException(409,"R&D Head must approve price/profit first")
    x.sales_approved=True;x.status="APPROVED";db.commit();return {"status":x.status}

@router.post("/production-formulas")
def create_production_formula(p:ProductionFormulaCreate,db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","ADMIN"))):
    r=db.get(FormulaRevision,p.source_formula_revision_id)
    if not r or r.status!="APPROVED":raise HTTPException(409,"Source revision must be APPROVED")
    x=ProductionFormula(**p.model_dump());db.add(x);db.commit();db.refresh(x);return x

@router.post("/production-orders")
def create_production_order(p:ProductionOrderCreate,db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","PLANNING","ADMIN"))):
    planned=int((Decimal(p.ordered_quantity)*(Decimal("1")+Decimal(p.waste_percent)/Decimal("100"))).to_integral_value(rounding="ROUND_CEILING"))
    x=ProductionOrder(**p.model_dump(),planned_quantity=planned);db.add(x);db.commit();db.refresh(x)
    return {"id":x.id,"ordered_quantity":x.ordered_quantity,"planned_quantity":x.planned_quantity}

@router.get("/production-orders/{po_id}/mrp")
def mrp(po_id:int,db:Session=Depends(get_db),_=Depends(get_current_user)):
    x=calculate_mrp(db,po_id)
    if x is None:raise HTTPException(404,"Not found")
    return x

@router.post("/production-orders/{po_id}/send-planning")
def send_planning(po_id:int,note:str="",db:Session=Depends(get_db),u=Depends(require_roles("RD_HEAD","ADMIN"))):
    po=db.get(ProductionOrder,po_id)
    if not po:raise HTTPException(404,"Not found")
    po.planning_status="SENT"
    h=PlanningHandoff(production_order_id=po.id,sent_by_user_id=u.id,note=note)
    db.add(h);db.commit();return {"status":"SENT","handoff_id":h.id}
