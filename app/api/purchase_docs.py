import json
import re
from datetime import date
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, Side
from openpyxl.utils import get_column_letter
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.core.thai_baht import thai_baht_text
from app.core.record_versions import snapshot_version, serialize_version
from app.models.entities import PurchaseDocument, RecordVersion

router = APIRouter(prefix="/api/purchase-docs", tags=["Purchase Documents"])

DOC_TYPES = {"PO", "PR", "QP"}
LOGO_PATH = Path(__file__).resolve().parents[1] / "static" / "logo.png"


def _add_logo_if_present(ws, anchor: str, width: int = 170, height: int = 73) -> None:
    """PO/PR workbooks are built from scratch (no master template), so
    unlike the other exact-form exports they never had a logo to begin
    with. Never raises: a missing/corrupt logo file should never break
    the document it's decorating."""
    if not LOGO_PATH.exists():
        return
    try:
        from openpyxl.drawing.image import Image as XLImage
        img = XLImage(str(LOGO_PATH))
        img.width, img.height = width, height
        ws.add_image(img, anchor)
    except Exception:
        pass


def _check_doc_type(doc_type: str) -> str:
    d = (doc_type or "").strip().upper()
    if d not in DOC_TYPES:
        raise HTTPException(404, "Unsupported document type (expected PO, PR or QP)")
    return d


def _validate_doc_data(doc_type: str, data: dict):
    """Server-side mirror of the frontend's save-time validation -- the
    frontend check is for instant feedback, this is what actually protects
    the data (a request that skips the browser, or a future non-browser
    client, must not be able to save an empty document)."""
    items = data.get("items") or []
    if doc_type == "PO":
        if not str(data.get("supplier_name") or "").strip() and not str(data.get("supplier_code") or "").strip():
            raise HTTPException(400, "กรุณาใส่ผู้จำหน่าย (ชื่อ หรือ รหัสผู้จำหน่าย) ก่อนบันทึก")
        if not any(str(x.get("description") or "").strip() for x in items):
            raise HTTPException(400, "กรุณาใส่รายการสินค้าอย่างน้อย 1 รายการ ก่อนบันทึก")
    elif doc_type == "QP":
        if not str(data.get("customer_name") or "").strip():
            raise HTTPException(400, "กรุณาใส่ชื่อผู้ซื้อก่อนบันทึก")
        ingredients = data.get("ingredients") or []
        job_lines = data.get("job_lines") or []
        has_ingredient = any(str(x.get("ingredient_name") or "").strip() for x in ingredients)
        has_job_line = any(str(x.get("description") or "").strip() for x in job_lines)
        if not has_ingredient and not has_job_line:
            raise HTTPException(400, "กรุณาใส่รายการสารสกัดหรือรายการงานอย่างน้อย 1 รายการ ก่อนบันทึก")
    else:
        if not any(str(x.get("material_code") or "").strip() or str(x.get("description") or "").strip() for x in items):
            raise HTTPException(400, "กรุณาใส่รายการวัตถุดิบอย่างน้อย 1 รายการ (รหัสสินค้าหรือรายละเอียด) ก่อนบันทึก")


class DocSave(BaseModel):
    doc_no: str
    status: str = "DRAFT"
    data: dict
    linked_reference: str | None = None


def _apply_linked_pr_refs(db: Session, po_doc_no: str, data: dict, user) -> None:
    """The PO form's "เลือกจาก PR ที่ค้างอยู่" picker tags each item it pulls
    in from a pending PR with {pr_doc_no, pr_row_index} in
    data["linked_pr_refs"]. On save, write this PO's doc_no back onto that
    exact PR line item's po_no field -- the PR form already had a po_no
    column per row (manually typed before this feature existed), so this
    reuses it rather than adding a parallel status field. Never overwrites
    a po_no a PR row already has (another PO may have claimed it first).
    """
    refs = data.get("linked_pr_refs") or []
    if not refs:
        return
    touched_pr_ids: set[int] = set()
    for ref in refs:
        pr_doc_no = str((ref or {}).get("pr_doc_no") or "").strip()
        row_index = (ref or {}).get("pr_row_index")
        if not pr_doc_no or row_index is None:
            continue
        pr = db.scalar(
            select(PurchaseDocument)
            .where(PurchaseDocument.doc_type == "PR", PurchaseDocument.doc_no == pr_doc_no)
            .order_by(PurchaseDocument.id.desc())
        )
        if not pr:
            continue
        # SQLAlchemy's identity map returns the same in-memory object for
        # a repeat query by id within this session, so a second ref
        # against the same PR (two rows pulled from one PR into this PO)
        # safely accumulates onto the object already mutated below
        # instead of clobbering it with a stale re-fetch.
        try:
            pr_data = json.loads(pr.payload_json or "{}")
        except Exception:
            continue
        items = pr_data.get("items") or []
        try:
            idx = int(row_index)
        except (TypeError, ValueError):
            continue
        if idx < 0 or idx >= len(items):
            continue
        if str(items[idx].get("po_no") or "").strip():
            continue  # already claimed by another PO -- don't clobber
        if pr.id not in touched_pr_ids:
            snapshot_version(
                db, record_type="purchase_doc", record_id=pr.id,
                payload_json=pr.payload_json, label=pr.doc_no, status=pr.status, user=user,
            )
            touched_pr_ids.add(pr.id)
        items[idx]["po_no"] = po_doc_no
        pr_data["items"] = items
        pr.payload_json = json.dumps(pr_data, ensure_ascii=False, default=str)


def _serialize(x: PurchaseDocument) -> dict:
    return {
        "id": x.id,
        "doc_type": x.doc_type,
        "doc_no": x.doc_no,
        "status": x.status,
        "data": json.loads(x.payload_json or "{}"),
        "linked_reference": x.linked_reference,
        "created_by_name": x.created_by_name,
        "created_at": x.created_at,
        "updated_at": x.updated_at,
    }


# NOTE: these two GET routes must stay registered ABOVE
# `GET /{doc_type}` below -- FastAPI/Starlette matches routes in
# registration order, and `/{doc_type}` is a single-segment path
# parameter that would otherwise greedily swallow "supplier-lookup" or
# "pending-materials" as if they were a doc_type value.
@router.get("/supplier-lookup")
def supplier_lookup(name: str, db: Session = Depends(get_db), u=Depends(get_current_user)):
    """Real supplier history, mined from past PO documents -- typing a
    supplier name that's been used before should bring back its code/
    address/tax ID/contact instead of requiring them to be retyped every
    time. (The plain Supplier master table has no tax ID/address fields
    at all, so PO history is the only place this data actually lives.)"""
    term = (name or "").strip()
    if not term:
        raise HTTPException(400, "ระบุชื่อผู้จำหน่าย")
    rows = db.scalars(
        select(PurchaseDocument)
        .where(PurchaseDocument.doc_type == "PO")
        .order_by(PurchaseDocument.id.desc())
        .limit(500)
    ).all()
    for x in rows:
        try:
            data = json.loads(x.payload_json or "{}")
        except Exception:
            continue
        if str(data.get("supplier_name") or "").strip().lower() == term.lower():
            return {
                "supplier_code": data.get("supplier_code") or "",
                "supplier_name": data.get("supplier_name") or "",
                "supplier_address": data.get("supplier_address") or "",
                "supplier_tax_id": data.get("supplier_tax_id") or "",
                "contact_person": data.get("contact_person") or "",
                "contact_phone": data.get("contact_phone") or "",
                "source_doc_no": x.doc_no,
            }
    raise HTTPException(404, "ไม่พบประวัติผู้จำหน่ายรายนี้")


@router.get("/pending-materials")
def pending_materials(
    supplier: str = "",
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """The PR→PO linking queue: every PR line item that has a material/
    description but no po_no yet (i.e. requested but nobody has opened a
    PO for it). Used by the PO form's "เลือกจาก PR ที่ค้างอยู่" checkbox
    picker -- when a supplier name is given, matching items (by the
    material's FDAMaterial.supplier_company) sort first, but nothing is
    ever hidden just because the match isn't exact, so a PR item never
    silently disappears from view. Each row also carries the material's
    supplier name and ราคา/กก. (price_per_kg) from the FDA/รหัสสาร
    database unconditionally -- not just when filtering by supplier --
    so the picker can show a Supplier column and the PO form can
    auto-fill ราคาต่อหน่วย from it once a row is picked."""
    from app.models.entities import FDAMaterial

    supplier_term = (supplier or "").strip().lower()
    material_info: dict[str, dict] = {}
    for code, vendor, price in db.query(
        FDAMaterial.material_code, FDAMaterial.supplier_company, FDAMaterial.price_per_kg
    ).all():
        if code:
            material_info[code.strip().upper()] = {
                "supplier": (vendor or "").strip(),
                "price_per_kg": (price or "").strip(),
            }

    rows = db.scalars(
        select(PurchaseDocument)
        .where(PurchaseDocument.doc_type == "PR")
        .order_by(PurchaseDocument.id.desc())
        .limit(1000)
    ).all()
    out = []
    for x in rows:
        try:
            data = json.loads(x.payload_json or "{}")
        except Exception:
            continue
        for i, it in enumerate(data.get("items") or []):
            material_code = str(it.get("material_code") or "").strip()
            description = str(it.get("description") or "").strip()
            if not material_code and not description:
                continue
            if str(it.get("po_no") or "").strip():
                continue  # already has a PO -- not pending
            info = material_info.get(material_code.upper(), {})
            vendor = info.get("supplier", "")
            out.append({
                "pr_id": x.id,
                "pr_doc_no": x.doc_no,
                "pr_row_index": i,
                "material_code": material_code,
                "description": description,
                "quantity": it.get("quantity"),
                "unit": it.get("unit") or "",
                "product_name": it.get("product_name") or "",
                "production_order_no": it.get("production_order_no") or "",
                "requested_date": x.created_at.isoformat() if x.created_at else None,
                "supplier": vendor,
                "price_per_kg": info.get("price_per_kg", ""),
                "matches_supplier": bool(supplier_term and vendor.lower() == supplier_term),
            })
    if supplier_term:
        out.sort(key=lambda r: not r["matches_supplier"])
    return out


@router.post("/{doc_type}")
def save_doc(
    doc_type: str,
    p: DocSave,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    d = _check_doc_type(doc_type)
    if not p.data.get("date"):
        p.data["date"] = date.today().isoformat()
    _validate_doc_data(d, p.data)

    x = PurchaseDocument(
        doc_type=d,
        doc_no=p.doc_no,
        status=p.status,
        payload_json=json.dumps(p.data, ensure_ascii=False, default=str),
        created_by=u.id,
        created_by_name=u.full_name,
        linked_reference=(p.linked_reference or "").strip() or None,
    )
    db.add(x)
    if d == "PO":
        _apply_linked_pr_refs(db, p.doc_no, p.data, u)
    db.commit()
    db.refresh(x)
    return _serialize(x)


@router.get("/{doc_type}")
def list_docs(
    doc_type: str,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Department-shared listing -- same visibility model as Customers/Suppliers:
    any authenticated user can see every PO/PR, not just their own."""
    d = _check_doc_type(doc_type)
    rows = db.scalars(
        select(PurchaseDocument)
        .where(PurchaseDocument.doc_type == d)
        .order_by(PurchaseDocument.id.desc())
    ).all()
    return [_serialize(x) for x in rows]


@router.get("/record/{record_id}")
def get_doc(record_id: int, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    return _serialize(x)


@router.put("/record/{record_id}")
def update_doc(
    record_id: int,
    p: DocSave,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    if not p.data.get("date"):
        p.data["date"] = date.today().isoformat()
    _validate_doc_data(x.doc_type, p.data)

    snapshot_version(
        db,
        record_type="purchase_doc",
        record_id=x.id,
        payload_json=x.payload_json,
        label=x.doc_no,
        status=x.status,
        user=u,
    )

    x.doc_no = p.doc_no
    x.status = p.status
    x.payload_json = json.dumps(p.data, ensure_ascii=False, default=str)
    if p.linked_reference is not None:
        x.linked_reference = p.linked_reference.strip() or None
    if x.doc_type == "PO":
        _apply_linked_pr_refs(db, x.doc_no, p.data, u)
    db.commit()
    db.refresh(x)
    return _serialize(x)


@router.delete("/record/{record_id}")
def delete_doc(
    record_id: int,
    db: Session = Depends(get_db),
    u=Depends(require_roles("ADMIN", "PURCHASE", "STOCK")),
):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    db.delete(x)
    db.commit()
    return {"ok": True}


@router.get("/record/{record_id}/versions")
def list_doc_versions(
    record_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    if not db.get(PurchaseDocument, record_id):
        raise HTTPException(404, "Record not found")
    rows = db.scalars(
        select(RecordVersion)
        .where(RecordVersion.record_type == "purchase_doc", RecordVersion.record_id == record_id)
        .order_by(RecordVersion.id.desc())
    ).all()
    return [serialize_version(v) for v in rows]


@router.get("/record/{record_id}/versions/{version_id}")
def get_doc_version(
    record_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    if not db.get(PurchaseDocument, record_id):
        raise HTTPException(404, "Record not found")
    v = db.get(RecordVersion, version_id)
    if not v or v.record_type != "purchase_doc" or v.record_id != record_id:
        raise HTTPException(404, "Version not found")
    out = serialize_version(v)
    out["data"] = json.loads(v.payload_json or "{}")
    return out


@router.post("/record/{record_id}/versions/{version_id}/restore")
def restore_doc_version(
    record_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    """Bring back an older version as the current one. The state being
    replaced is snapshotted first, same as any other update -- so restoring
    is itself undoable."""
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    v = db.get(RecordVersion, version_id)
    if not v or v.record_type != "purchase_doc" or v.record_id != record_id:
        raise HTTPException(404, "Version not found")

    snapshot_version(
        db,
        record_type="purchase_doc",
        record_id=x.id,
        payload_json=x.payload_json,
        label=x.doc_no,
        status=x.status,
        user=u,
    )
    x.payload_json = v.payload_json
    if v.label:
        x.doc_no = v.label
    if v.status:
        x.status = v.status
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Restore failed: {type(e).__name__}: {e}")
    return {"id": x.id, "doc_no": x.doc_no, "restored_from": version_id}


# ---------------------------------------------------------------------------
# Excel export
#
# Unlike every other form in the app, PO/PR have no real Excel master to
# patch cell-by-cell (they were built from screenshots of paper documents,
# not sourced from an .xlsx file -- see PR that introduced them). So this
# builds a fresh, readable workbook that mirrors the on-screen layout,
# rather than reusing the "preserve master, patch values" pattern used for
# the other exact forms.
# ---------------------------------------------------------------------------

_THIN = Side(style="thin", color="999999")
_BORDER = Border(left=_THIN, right=_THIN, top=_THIN, bottom=_THIN)
_HEAD_FONT = Font(bold=True)
_TITLE_FONT = Font(bold=True, size=14)
_WRAP = Alignment(wrap_text=True, vertical="top")


def _label_value(ws, row, label_col, label, value, value_col=None):
    lc = get_column_letter(label_col)
    vc = get_column_letter(value_col or label_col + 1)
    ws[f"{lc}{row}"] = label
    ws[f"{lc}{row}"].font = _HEAD_FONT
    ws[f"{vc}{row}"] = value or ""
    ws[f"{vc}{row}"].border = _BORDER


def _build_po_workbook(doc_no: str, data: dict) -> Workbook:
    wb = Workbook()
    ws = wb.active
    ws.title = "PO"
    for col, width in zip("ABCDEF", [4, 34, 10, 10, 14, 14]):
        ws.column_dimensions[col].width = width

    ws.merge_cells("A1:F1")
    ws["A1"] = "ใบสั่งซื้อ (Purchase Order)"
    ws["A1"].font = _TITLE_FONT
    ws.row_dimensions[1].height = 56
    _add_logo_if_present(ws, "G1")

    r = 3
    _label_value(ws, r, 1, "เลขที่", doc_no); r += 1
    _label_value(ws, r, 1, "วันที่", data.get("date")); r += 1
    _label_value(ws, r, 1, "ครบกำหนด", data.get("due_date")); r += 1
    _label_value(ws, r, 1, "ผู้สั่งซื้อ", data.get("buyer_name")); r += 1
    _label_value(ws, r, 1, "อ้างอิง (เลขที่ PR)", data.get("reference")); r += 1
    _label_value(ws, r, 1, "ผู้ติดต่อ", data.get("contact_person")); r += 1
    _label_value(ws, r, 1, "เบอร์โทร", data.get("contact_phone")); r += 1
    _label_value(ws, r, 1, "รหัสผู้จำหน่าย", data.get("supplier_code")); r += 1
    _label_value(ws, r, 1, "ผู้จำหน่าย", data.get("supplier_name")); r += 1
    _label_value(ws, r, 1, "ที่อยู่ผู้จำหน่าย", data.get("supplier_address")); r += 1
    _label_value(ws, r, 1, "เลขประจำตัวผู้เสียภาษี", data.get("supplier_tax_id")); r += 1

    r += 1
    headers = ["#", "รายละเอียด", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "ยอดรวม"]
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=r, column=i, value=h)
        c.font = _HEAD_FONT
        c.border = _BORDER
        c.alignment = Alignment(horizontal="center")
    table_head_row = r
    r += 1

    items = data.get("items") or []
    subtotal = 0.0
    for i, item in enumerate(items, start=1):
        if not str(item.get("description") or "").strip():
            continue
        qty = float(item.get("quantity") or 0) if str(item.get("quantity") or "").strip() else 0
        price = float(item.get("unit_price") or 0) if str(item.get("unit_price") or "").strip() else 0
        amount = qty * price
        subtotal += amount
        vals = [i, item.get("description") or "", item.get("quantity") or "", item.get("unit") or "",
                item.get("unit_price") or "", round(amount, 2) if amount else ""]
        for col, v in enumerate(vals, start=1):
            c = ws.cell(row=r, column=col, value=v)
            c.border = _BORDER
            if col == 2:
                c.alignment = _WRAP
        r += 1
    if r == table_head_row + 1:
        # no rows written -- keep at least one bordered blank row for readability
        for col in range(1, 7):
            ws.cell(row=r, column=col).border = _BORDER
        r += 1

    vat = subtotal * 0.07
    grand_total = subtotal + vat
    r += 1
    _label_value(ws, r, 4, "รวมเป็นเงิน", round(subtotal, 2), value_col=5); r += 1
    _label_value(ws, r, 4, "ภาษีมูลค่าเพิ่ม 7%", round(vat, 2), value_col=5); r += 1
    _label_value(ws, r, 4, "จำนวนเงินรวมทั้งสิ้น", round(grand_total, 2), value_col=5); r += 1
    ws.merge_cells(f"A{r}:F{r}")
    ws[f"A{r}"] = f"({thai_baht_text(grand_total)})"
    r += 2

    _label_value(ws, r, 1, "ผู้ซื้อ", data.get("buyer_sign")); r += 1
    _label_value(ws, r, 1, "วันที่ (ผู้ซื้อ)", data.get("buyer_sign_date")); r += 1
    _label_value(ws, r, 1, "ผู้อนุมัติ", data.get("approver_sign")); r += 1
    _label_value(ws, r, 1, "วันที่ (ผู้อนุมัติ)", data.get("approver_sign_date")); r += 1

    return wb


def _build_pr_workbook(doc_no: str, data: dict) -> Workbook:
    wb = Workbook()
    ws = wb.active
    ws.title = "PR"
    widths = [6, 12, 24, 8, 8, 14, 18, 12, 14, 12]
    for col, width in zip("ABCDEFGHIJ", widths):
        ws.column_dimensions[col].width = width

    ws.merge_cells("A1:J1")
    ws["A1"] = "ใบขอซื้อ (Purchase Request)"
    ws["A1"].font = _TITLE_FONT
    ws.row_dimensions[1].height = 56
    _add_logo_if_present(ws, "K1")

    r = 3
    _label_value(ws, r, 1, "เลขที่แบบฟอร์ม", data.get("form_no")); r += 1
    _label_value(ws, r, 1, "แก้ไขครั้งที่", data.get("revision_no")); r += 1
    _label_value(ws, r, 1, "เลขที่ PR", doc_no); r += 1
    _label_value(ws, r, 1, "วันที่", data.get("date")); r += 1
    _label_value(ws, r, 1, "เวลา", data.get("time")); r += 1
    _label_value(ws, r, 1, "เตรียมโดย", data.get("prepared_by")); r += 1
    _label_value(ws, r, 1, "อนุมัติโดย", data.get("approved_by")); r += 1
    # ref_no/ref_product are the split fields the PR form now collects
    # (was a single combined "อ้างอิงสูตร/ผลิตภัณฑ์" field); product_ref is
    # kept only as a fallback for records saved before the split.
    _label_value(ws, r, 1, "เลขที่ใบสั่งผลิต/เลขที่สูตร", data.get("ref_no") or data.get("product_ref")); r += 1
    _label_value(ws, r, 1, "ชื่อผลิตภัณฑ์", data.get("ref_product")); r += 1

    r += 1
    headers = ["ลำดับ", "รหัสสินค้า", "รายละเอียด", "จำนวน", "หน่วย", "เลขที่ใบสั่งผลิต",
               "ชื่อผลิตภัณฑ์/แผนก", "เลขที่ PO", "หมายเหตุ", "วันที่รับเข้า"]
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=r, column=i, value=h)
        c.font = _HEAD_FONT
        c.border = _BORDER
        c.alignment = Alignment(horizontal="center")
    table_head_row = r
    r += 1

    items = data.get("items") or []
    subs = ["material_code", "description", "quantity", "unit", "production_order_no",
            "product_name", "po_no", "note", "received_date"]
    for i, item in enumerate(items, start=1):
        if not any(str(item.get(k) or "").strip() for k in subs):
            continue
        vals = [i] + [item.get(k) or "" for k in subs]
        for col, v in enumerate(vals, start=1):
            c = ws.cell(row=r, column=col, value=v)
            c.border = _BORDER
            if col == 3:
                c.alignment = _WRAP
        r += 1
    if r == table_head_row + 1:
        for col in range(1, 11):
            ws.cell(row=r, column=col).border = _BORDER
        r += 1

    r += 1
    for key, label in [
        ("requester", "ผู้ขอซื้อ"),
        ("warehouse_officer", "จนท.คลังสินค้า"),
        ("purchasing_officer", "เจ้าหน้าที่จัดซื้อ"),
        ("reviewer", "ผู้ตรวจสอบ (ผจก.แผนก)"),
        ("warehouse_manager", "ผจก.คลังสินค้า"),
    ]:
        name = data.get(f"sign_{key}") or ""
        sign_date = data.get(f"sign_{key}_date") or ""
        _label_value(ws, r, 1, label, name, value_col=3)
        _label_value(ws, r, 6, "วันที่", sign_date, value_col=7)
        r += 1

    return wb


def _build_qp_workbook(doc_no: str, data: dict) -> Workbook:
    """ใบเสนอราคา (QP) -- same free-HTML-form shape as PO/PR rather than
    the old pixel-exact ADMIN-QP master template, but every section the
    old exact-form had: header, active/inactive ingredient tables (no
    longer capped at 9/7 rows), the job-code/บรรจุภัณฑ์/quantity/price
    table, totals, and both signature lines."""
    wb = Workbook()
    ws = wb.active
    ws.title = "QP"
    for col, width in zip("ABCDEFG", [4, 10, 34, 12, 12, 14, 14]):
        ws.column_dimensions[col].width = width

    ws.merge_cells("A1:G1")
    ws["A1"] = "ใบเสนอราคา (Quotation)"
    ws["A1"].font = _TITLE_FONT
    ws.row_dimensions[1].height = 56
    _add_logo_if_present(ws, "H1")

    r = 3
    _label_value(ws, r, 1, "เลขที่", doc_no); r += 1
    _label_value(ws, r, 1, "วันที่", data.get("date")); r += 1
    _label_value(ws, r, 1, "ชื่อผู้ซื้อ", data.get("customer_name")); r += 1
    _label_value(ws, r, 1, "ที่อยู่", data.get("address")); r += 1
    _label_value(ws, r, 1, "โทรศัพท์ / แฟกซ์ / E-mail", data.get("phone_fax")); r += 1
    _label_value(ws, r, 1, "ชื่อสินค้า", data.get("product_name")); r += 1
    _label_value(ws, r, 1, "เลขที่สูตร", data.get("formula_no")); r += 1
    if data.get("installment_1"):
        _label_value(ws, r, 1, "งวดที่ 1", data.get("installment_1")); r += 1
    if data.get("installment_2"):
        _label_value(ws, r, 1, "งวดที่ 2", data.get("installment_2")); r += 1

    def _write_ingredient_table(title, rows):
        nonlocal r
        rows = [x for x in rows if str(x.get("ingredient_name") or "").strip()]
        if not rows:
            return
        r += 1
        ws.merge_cells(f"A{r}:G{r}")
        ws[f"A{r}"] = title
        ws[f"A{r}"].font = _HEAD_FONT
        r += 1
        headers = ["ลำดับ", "รายการสารสกัด", "ประเทศที่มา", "ปริมาณ (มก.)"]
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=r, column=i, value=h)
            c.font = _HEAD_FONT
            c.border = _BORDER
        r += 1
        for i, x in enumerate(rows, start=1):
            vals = [i, x.get("ingredient_name") or "", x.get("origin") or "", x.get("quantity_mg") or ""]
            for col, v in enumerate(vals, start=1):
                c = ws.cell(row=r, column=col, value=v)
                c.border = _BORDER
            r += 1

    _write_ingredient_table("สารสกัด (Active Ingredient)", data.get("ingredients") or [])
    _write_ingredient_table("สารไม่สำคัญ (Inactive Ingredient)", data.get("inactive_ingredients") or [])

    job_lines = data.get("job_lines") or []
    job_lines = [x for x in job_lines if str(x.get("description") or "").strip() or str(x.get("job_code") or "").strip()]
    subtotal = 0.0
    if job_lines:
        r += 1
        headers = ["ลำดับ", "รหัสงาน", "รายละเอียด (บรรจุภัณฑ์)", "จำนวน/แพ็ค", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "จำนวนเงิน"]
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=r, column=i, value=h)
            c.font = _HEAD_FONT
            c.border = _BORDER
        r += 1
        for i, x in enumerate(job_lines, start=1):
            qty = float(x.get("quantity") or 0) if str(x.get("quantity") or "").strip() else 0
            price = float(x.get("unit_price") or 0) if str(x.get("unit_price") or "").strip() else 0
            amount = qty * price
            subtotal += amount
            pack = f"{x.get('pack_qty') or ''} {x.get('pack_unit_text') or ''}".strip()
            vals = [i, x.get("job_code") or "", x.get("description") or "", pack,
                    x.get("quantity") or "", x.get("unit") or "", x.get("unit_price") or "",
                    round(amount, 2) if amount else ""]
            for col, v in enumerate(vals, start=1):
                c = ws.cell(row=r, column=col, value=v)
                c.border = _BORDER
                if col == 3:
                    c.alignment = _WRAP
            r += 1

    discount = float(data.get("discount") or 0) if str(data.get("discount") or "").strip() else 0
    after_discount = max(0.0, subtotal - discount)
    vat = after_discount * 0.07
    grand_total = after_discount + vat
    r += 1
    _label_value(ws, r, 5, "มูลค่ารวม", round(subtotal, 2), value_col=6); r += 1
    if discount:
        _label_value(ws, r, 5, "ส่วนลด", round(discount, 2), value_col=6); r += 1
    _label_value(ws, r, 5, "ภาษีมูลค่าเพิ่ม 7%", round(vat, 2), value_col=6); r += 1
    _label_value(ws, r, 5, "ยอดรวมสุทธิ", round(grand_total, 2), value_col=6); r += 1
    ws.merge_cells(f"A{r}:G{r}")
    ws[f"A{r}"] = f"({thai_baht_text(grand_total)})"
    r += 1
    if str(data.get("notes") or "").strip():
        _label_value(ws, r, 1, "หมายเหตุ", data.get("notes")); r += 1
    r += 1

    _label_value(ws, r, 1, "ผู้เสนอราคา (Sales Executive)", data.get("sales_executive"))
    _label_value(ws, r, 5, "วันที่", data.get("sales_signature_date"), value_col=6); r += 1
    _label_value(ws, r, 1, "ผู้จัดทำใบเสนอราคา (Admin)", data.get("admin_officer"))
    _label_value(ws, r, 5, "วันที่", data.get("admin_signature_date"), value_col=6); r += 1

    return wb


@router.get("/record/{record_id}/excel")
def export_doc_excel(
    record_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
):
    x = db.get(PurchaseDocument, record_id)
    if not x:
        raise HTTPException(404, "Record not found")
    data = json.loads(x.payload_json or "{}")

    try:
        if x.doc_type == "PO":
            wb = _build_po_workbook(x.doc_no, data)
        elif x.doc_type == "QP":
            wb = _build_qp_workbook(x.doc_no, data)
        else:
            wb = _build_pr_workbook(x.doc_no, data)
        output = BytesIO()
        wb.save(output)
        output.seek(0)
    except Exception as e:
        raise HTTPException(500, f"Excel export failed: {type(e).__name__}: {e}")

    safe_doc_no = re.sub(r"[^A-Za-z0-9._-]+", "_", str(x.doc_no or x.id)).strip("_") or str(x.id)
    filename = f"{x.doc_type}_{safe_doc_no}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
