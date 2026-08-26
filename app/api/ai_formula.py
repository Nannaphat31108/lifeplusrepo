from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db.session import get_db
from app.models.entities import FormulaAIFeedback

router = APIRouter(prefix="/api/ai", tags=["AI Formula"])

DATA_FILE = Path(__file__).resolve().parents[1] / "static" / "supplement_codes.json"


class FormulaDraftRequest(BaseModel):
    form_code: str
    product_name: str | None = None
    product_type: str | None = None
    objective: str | None = None
    customer_requirement: str | None = None
    claims: str | None = None
    flavor: str | None = None
    target_price: float | None = None
    desired_ingredient_count: int = Field(default=5, ge=1, le=200)
    notes: str | None = None


class FormulaFeedbackItem(BaseModel):
    material_code: str
    material_name: str | None = None
    suggested_reason: str | None = None
    comment: str | None = None


class FormulaFeedbackRequest(BaseModel):
    form_code: str
    product_name: str | None = None
    product_type: str | None = None
    objective: str | None = None
    customer_requirement: str | None = None
    items: list[FormulaFeedbackItem]


def _load_materials() -> list[dict[str, Any]]:
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[A-Za-z0-9][A-Za-z0-9%+\-_.]{1,}|[ก-๙]{2,}", (text or "").lower())
    stop = {"และ", "หรือ", "ของ", "ให้", "ที่", "เป็น", "with", "and", "for", "the", "from", "product"}
    return [w for w in words if w not in stop]


def _feedback_context(req: FormulaDraftRequest) -> str:
    return " ".join(filter(None, [
        req.product_name, req.product_type, req.objective,
        req.customer_requirement, req.claims, req.flavor, req.notes,
    ])).lower()


def _load_relevant_feedback(db: Session, req: FormulaDraftRequest, limit: int = 250) -> list[FormulaAIFeedback]:
    rows = db.scalars(
        select(FormulaAIFeedback)
        .where(FormulaAIFeedback.form_code == req.form_code)
        .order_by(FormulaAIFeedback.created_at.desc())
        .limit(limit)
    ).all()
    if not rows:
        return []

    target_tokens = set(_tokens(_feedback_context(req)))
    ranked: list[tuple[int, FormulaAIFeedback]] = []
    for x in rows:
        ctx = " ".join(filter(None, [x.product_name, x.product_type, x.objective, x.customer_requirement])).lower()
        fb_tokens = set(_tokens(ctx))
        overlap = len(target_tokens & fb_tokens)
        # Product type is particularly useful for matching formula context.
        if req.product_type and x.product_type and req.product_type.strip().lower() == x.product_type.strip().lower():
            overlap += 6
        # Keep general feedback available, but rank contextual examples first.
        ranked.append((overlap, x))
    ranked.sort(key=lambda t: (t[0], t[1].created_at), reverse=True)
    return [x for score, x in ranked[:80] if score > 0] or [x for _, x in ranked[:30]]


def _feedback_stats(feedback: list[FormulaAIFeedback]) -> dict[str, dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    for f in feedback:
        code = (f.material_code or "").strip()
        if not code:
            continue
        row = stats.setdefault(code, {"accepted": 0, "rejected": 0, "comments": []})
        if f.is_accepted:
            row["accepted"] += 1
        else:
            row["rejected"] += 1
            if f.reviewer_comment:
                row["comments"].append(f.reviewer_comment.strip())
    return stats


def _candidate_score(item: dict[str, Any], tokens: list[str], feedback_stats: dict[str, dict[str, Any]]) -> float:
    hay = " ".join(str(item.get(k) or "") for k in ("name", "model", "category", "origin", "vendor", "fda", "halal")).lower()
    score = 0.0
    for t in tokens:
        if t in hay:
            score += 8.0
        if t in str(item.get("name") or "").lower():
            score += 8.0
        if t in str(item.get("model") or "").lower():
            score += 5.0
    if item.get("model"):
        score += 1.5
    if item.get("vendor"):
        score += 0.5
    if item.get("price"):
        score += 0.4
    if item.get("halal"):
        score += 0.2

    # Learned preference from R&D feedback in similar contexts.
    fb = feedback_stats.get(str(item.get("code") or ""))
    if fb:
        score += min(fb["accepted"], 5) * 4.0
        score -= min(fb["rejected"], 5) * 18.0
    return score


def _shortlist(req: FormulaDraftRequest, feedback: list[FormulaAIFeedback], limit: int = 80) -> list[dict[str, Any]]:
    materials = _load_materials()
    context = _feedback_context(req)
    tokens = _tokens(context)
    stats = _feedback_stats(feedback)

    seen = set()
    rows = []
    for x in materials:
        code = str(x.get("code") or "").strip()
        name = str(x.get("name") or "").strip()
        if not code or not name:
            continue
        key = (code.lower(), name.lower())
        if key in seen:
            continue
        seen.add(key)
        score = _candidate_score(x, tokens, stats)
        rows.append((score, x))

    rows.sort(key=lambda t: (t[0], bool(t[1].get("price")), bool(t[1].get("vendor"))), reverse=True)
    return [x for _, x in rows[:limit]]


def _material_view(x: dict[str, Any], reason: str = "ตรงกับเงื่อนไขที่กรอก") -> dict[str, Any]:
    price = x.get("price")
    try:
        price = float(price) if str(price).strip() else None
    except Exception:
        price = None
    return {
        "code": x.get("code") or "",
        "name": x.get("name") or "",
        "reason": reason,
        "supplier": x.get("vendor") or "",
        "import_country": x.get("origin") or "",
        "price_kg": price,
        "halal": x.get("halal") or "",
        "model": x.get("model") or "",
        "quantity_mg": None,
    }


def _local_draft(req: FormulaDraftRequest, candidates: list[dict[str, Any]], feedback: list[FormulaAIFeedback]) -> dict[str, Any]:
    count = min(max(req.desired_ingredient_count, 1), len(candidates))
    picked = candidates[:count]
    return {
        "mode": "local-assisted",
        "model": None,
        "summary": "สูตรร่างจาก Requirement + ฐานรหัสสาร + Feedback ของ R&D ที่เคยบันทึก เพื่อให้ R&D ตรวจและกำหนดปริมาณเอง",
        "ingredients": [_material_view(x) for x in picked],
        "feedback_examples_used": len(feedback),
        "warnings": [
            "เป็นสูตรร่างสำหรับงาน R&D ไม่ใช่สูตรพร้อมผลิต",
            "ระบบไม่กำหนดขนาดรับประทานหรือปริมาณ mg อัตโนมัติ ให้ R&D/QA ตรวจและกรอกเอง",
            "Feedback ช่วยจัดอันดับ/หลีกเลี่ยงข้อเสนอเดิม แต่ R&D ต้องตรวจข้อกำหนดและความเหมาะสมทุกครั้ง",
        ],
    }


def _extract_response_text(data: dict[str, Any]) -> str:
    for item in data.get("output") or []:
        for content in item.get("content") or []:
            if content.get("type") == "output_text" and content.get("text"):
                return content["text"]
    return ""


def _parse_json_text(text: str) -> dict[str, Any] | None:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


def _feedback_prompt_rows(feedback: list[FormulaAIFeedback]) -> list[dict[str, Any]]:
    rows = []
    for f in feedback[:60]:
        rows.append({
            "product_type": f.product_type,
            "objective": f.objective,
            "customer_requirement": f.customer_requirement,
            "material_code": f.material_code,
            "material_name": f.material_name,
            "accepted": bool(f.is_accepted),
            "reviewer_comment": f.reviewer_comment or "",
        })
    return rows


def _openai_draft(req: FormulaDraftRequest, candidates: list[dict[str, Any]], feedback: list[FormulaAIFeedback]) -> dict[str, Any] | None:
    if not settings.openai_api_key:
        return None

    compact = [{
        "code": x.get("code"), "name": x.get("name"), "model": x.get("model"),
        "supplier": x.get("vendor"), "origin": x.get("origin"), "price_kg": x.get("price"), "halal": x.get("halal")
    } for x in candidates]

    prompt = {
        "task": "Select a draft ingredient shortlist for an R&D dietary-supplement/product formula.",
        "rules": [
            "Choose ONLY codes that exist in candidate_materials.",
            "Use rd_feedback as reviewer training examples. Empty-comment accepted examples mean the ingredient was considered correct in that context.",
            "For rejected examples, pay close attention to reviewer_comment and avoid repeating the same mistake when the current context is similar.",
            "Do not treat feedback as a universal ban when product context differs; explain selections based on the current requirement.",
            "Do not invent ingredients, suppliers, prices, regulatory status, health claims, dosage, serving size, or quantity.",
            "Do not give medical advice. Quantity/dose must remain null and be decided by qualified R&D/QA staff.",
            "Return JSON only with keys summary, selected_codes, reasons, warnings.",
            f"Select up to {req.desired_ingredient_count} unique codes.",
        ],
        "requirement": req.model_dump(),
        "rd_feedback": _feedback_prompt_rows(feedback),
        "candidate_materials": compact,
    }

    payload = {
        "model": settings.openai_model,
        "input": json.dumps(prompt, ensure_ascii=False),
        "max_output_tokens": 2200,
    }
    headers = {"Authorization": f"Bearer {settings.openai_api_key}", "Content-Type": "application/json"}
    try:
        r = httpx.post("https://api.openai.com/v1/responses", headers=headers, json=payload, timeout=45.0)
        r.raise_for_status()
        parsed = _parse_json_text(_extract_response_text(r.json()))
        if not parsed:
            return None
    except Exception:
        return None

    allowed = {str(x.get("code")): x for x in candidates}
    reasons = parsed.get("reasons") or {}
    codes = []
    for c in parsed.get("selected_codes") or []:
        c = str(c)
        if c in allowed and c not in codes:
            codes.append(c)
        if len(codes) >= req.desired_ingredient_count:
            break
    if not codes:
        return None

    items = []
    for c in codes:
        x = allowed[c]
        reason = reasons.get(c) if isinstance(reasons, dict) else None
        items.append(_material_view(x, reason or "AI เลือกจาก Requirement ฐานสาร และ Feedback ของ R&D"))

    warnings = list(parsed.get("warnings") or [])
    warnings.extend([
        "เป็นสูตรร่างสำหรับงาน R&D ไม่ใช่สูตรพร้อมผลิต",
        "AI ไม่กำหนดขนาดรับประทานหรือปริมาณ mg; ต้องให้ R&D/QA ตรวจและกรอกเอง",
    ])
    return {
        "mode": "openai",
        "model": settings.openai_model,
        "summary": parsed.get("summary") or "AI formula draft",
        "ingredients": items,
        "feedback_examples_used": len(feedback),
        "warnings": list(dict.fromkeys(str(x) for x in warnings if x)),
    }


@router.post("/formula-draft")
def formula_draft(req: FormulaDraftRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if req.form_code not in {"F-RD-002", "F-RD-002.1"}:
        raise HTTPException(400, "AI Formula ใช้กับสูตรและสูตรผลิตเท่านั้น")
    feedback = _load_relevant_feedback(db, req)
    candidates = _shortlist(req, feedback)
    if not candidates:
        raise HTTPException(400, "ไม่พบข้อมูลรหัสสารสำหรับสร้างสูตรร่าง")
    result = _openai_draft(req, candidates, feedback) or _local_draft(req, candidates, feedback)
    result["form_code"] = req.form_code
    result["requested_count"] = req.desired_ingredient_count
    return result


@router.post("/formula-feedback")
def save_formula_feedback(req: FormulaFeedbackRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if req.form_code not in {"F-RD-002", "F-RD-002.1"}:
        raise HTTPException(400, "Feedback ใช้กับสูตรและสูตรผลิตเท่านั้น")
    saved = 0
    accepted = 0
    rejected = 0
    for item in req.items:
        code = (item.material_code or "").strip()
        if not code:
            continue
        comment = (item.comment or "").strip()
        is_accepted = not bool(comment)
        db.add(FormulaAIFeedback(
            user_id=getattr(user, "id", None),
            form_code=req.form_code,
            product_name=req.product_name,
            product_type=req.product_type,
            objective=req.objective,
            customer_requirement=req.customer_requirement,
            material_code=code,
            material_name=item.material_name,
            suggested_reason=item.suggested_reason,
            is_accepted=is_accepted,
            reviewer_comment=comment or None,
        ))
        saved += 1
        accepted += int(is_accepted)
        rejected += int(not is_accepted)
    db.commit()
    return {
        "ok": True,
        "saved": saved,
        "accepted": accepted,
        "rejected": rejected,
        "rule": "ไม่มีคอมเมนต์ = ผ่าน; มีคอมเมนต์ = Feedback ให้ AI เรียนรู้ข้อผิดพลาด",
    }


@router.get("/formula-feedback-summary")
def formula_feedback_summary(form_code: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(FormulaAIFeedback)
        .where(FormulaAIFeedback.form_code == form_code)
        .order_by(FormulaAIFeedback.created_at.desc())
        .limit(300)
    ).all()
    return {
        "total": len(rows),
        "accepted": sum(1 for x in rows if x.is_accepted),
        "rejected": sum(1 for x in rows if not x.is_accepted),
    }


@router.get("/formula-status")
def formula_status(user=Depends(get_current_user)):
    return {
        "enabled": True,
        "provider": "OpenAI" if settings.openai_api_key else "Local assisted fallback",
        "model": settings.openai_model if settings.openai_api_key else None,
        "quantity_policy": "R&D must enter/verify quantities manually",
        "feedback_learning": True,
        "feedback_rule": "empty comment = accepted; comment = negative reviewer feedback",
    }
