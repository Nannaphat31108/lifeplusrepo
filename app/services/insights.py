from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import TesterRequest, RateRequest, FormulaRevision, ProductionOrder

def system_insights(db: Session):
    today = date.today()
    testers = db.scalars(select(TesterRequest)).all()
    overdue = []
    due_soon = []
    for t in testers:
        due = t.delivery_date or (t.requested_date + timedelta(days=t.sla_max_days))
        if t.delivery_status not in {"DELIVERED", "CLOSED"}:
            if due < today:
                overdue.append(t.tester_no)
            elif due <= today + timedelta(days=3):
                due_soon.append(t.tester_no)
    pending_rates = db.scalars(select(RateRequest).where(RateRequest.status != "APPROVED")).all()
    draft_formulas = db.scalars(select(FormulaRevision).where(FormulaRevision.status == "DRAFT")).all()
    planning = db.scalars(select(ProductionOrder).where(ProductionOrder.planning_status == "NOT_SENT")).all()
    return {
        "tester_overdue": overdue,
        "tester_due_within_3_days": due_soon,
        "pending_rate_requests": len(pending_rates),
        "draft_formula_revisions": len(draft_formulas),
        "production_orders_not_sent_to_planning": len(planning),
        "summary": (
            f"Tester overdue {len(overdue)}, due soon {len(due_soon)}, "
            f"rate pending {len(pending_rates)}, formula draft {len(draft_formulas)}, "
            f"planning pending {len(planning)}."
        )
    }
