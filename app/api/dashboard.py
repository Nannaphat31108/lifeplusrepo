from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.entities import *
from app.services.insights import system_insights

router=APIRouter(prefix="/api",tags=["Dashboard"])

@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db),_=Depends(get_current_user)):
    def count(model): return db.scalar(select(func.count()).select_from(model))
    return {
      "customers":count(Customer),"projects":count(ProductProject),"materials":count(RawMaterial),
      "suppliers":count(Supplier),"formulas":count(Formula),"testers":count(TesterRequest),
      "rate_requests":count(RateRequest),"production_orders":count(ProductionOrder),
      "insights":system_insights(db)
    }

@router.get("/ai/insights")
def ai_insights(db:Session=Depends(get_db),_=Depends(get_current_user)):
    # AI-ready endpoint: deterministic ERP insight layer.
    # สามารถต่อ LLM ภายหลังโดยส่งผลลัพธ์ structured นี้เป็น context.
    return system_insights(db)
