from __future__ import annotations
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    String, Integer, Date, DateTime, ForeignKey, Numeric, Text, Boolean,
    UniqueConstraint, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base, TimestampMixin):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), default="RD_OFFICER")
    # Real department this employee belongs to (RD, ADMIN, SALE, ...). Replaces
    # the old convention of inferring department from a shared username
    # pattern like "rd1".."rd4" — real employee accounts carry it directly.
    department: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Customer(Base, TimestampMixin):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class RawMaterial(Base, TimestampMixin):
    __tablename__ = "raw_materials"
    id: Mapped[int] = mapped_column(primary_key=True)
    material_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    trade_name: Mapped[str] = mapped_column(String(255), index=True)
    ingredient_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), default="kg")
    halal: Mapped[bool] = mapped_column(Boolean, default=False)
    probiotic: Mapped[bool] = mapped_column(Boolean, default=False)
    specification_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    fda_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class MaterialSupplier(Base, TimestampMixin):
    __tablename__ = "material_suppliers"
    __table_args__ = (UniqueConstraint("material_id", "supplier_id", name="uq_material_supplier"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("raw_materials.id"))
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    price_per_kg: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    currency: Mapped[str] = mapped_column(String(10), default="THB")
    lead_time_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_preferred: Mapped[bool] = mapped_column(Boolean, default=False)

class MaterialPriceHistory(Base, TimestampMixin):
    __tablename__ = "material_price_history"
    id: Mapped[int] = mapped_column(primary_key=True)
    material_supplier_id: Mapped[int] = mapped_column(ForeignKey("material_suppliers.id"))
    price_per_kg: Mapped[Decimal] = mapped_column(Numeric(16, 6))
    effective_date: Mapped[date] = mapped_column(Date, default=date.today)

class ProductProject(Base, TimestampMixin):
    __tablename__ = "product_projects"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    salesperson: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    product_name: Mapped[str] = mapped_column(String(255))
    supplement_code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    product_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    target_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requirement_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    claims: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flavor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    packaging_requirement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="NEW")

class ProjectSupplementItem(Base, TimestampMixin):
    __tablename__ = "project_supplement_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("product_projects.id"), index=True)
    supplement_code: Mapped[str] = mapped_column(String(80), index=True)
    supplement_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    unit: Mapped[str] = mapped_column(String(30), default="mg")

class Formula(Base, TimestampMixin):
    __tablename__ = "formulas"
    id: Mapped[int] = mapped_column(primary_key=True)
    formula_no: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("product_projects.id"))
    formula_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    registration_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

class FormulaRevision(Base, TimestampMixin):
    __tablename__ = "formula_revisions"
    __table_args__ = (UniqueConstraint("formula_id", "revision_no", name="uq_formula_revision"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    formula_id: Mapped[int] = mapped_column(ForeignKey("formulas.id"))
    revision_no: Mapped[int] = mapped_column(Integer)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_weight_mg: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    ingredient_cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    packaging_cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    selling_price_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class FormulaItem(Base, TimestampMixin):
    __tablename__ = "formula_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    material_id: Mapped[int] = mapped_column(ForeignKey("raw_materials.id"))
    material_supplier_id: Mapped[Optional[int]] = mapped_column(ForeignKey("material_suppliers.id"), nullable=True)
    dose_mg: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    percentage: Mapped[Decimal] = mapped_column(Numeric(10, 6), default=0)
    price_per_kg_snapshot: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 8), default=0)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class FormulaProcessStep(Base, TimestampMixin):
    __tablename__ = "formula_process_steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    sequence_no: Mapped[int] = mapped_column(Integer)
    instruction: Mapped[str] = mapped_column(Text)
    sieve_spec: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

class PackagingSpec(Base, TimestampMixin):
    __tablename__ = "packaging_specs"
    id: Mapped[int] = mapped_column(primary_key=True)
    revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    dosage_form: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    capsule_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    capsule_color: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tablet_shape: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    sachet_size: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    water_ml: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 4), nullable=True)
    serving_per_day: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    packaging_cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=0)

class TesterRequest(Base, TimestampMixin):
    __tablename__ = "tester_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    tester_no: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("product_projects.id"))
    formula_revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    quotation_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    receipt_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    customer_need: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    characteristic: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    packaging: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    requested_date: Mapped[date] = mapped_column(Date, default=date.today)
    delivery_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sla_min_days: Mapped[int] = mapped_column(Integer, default=7)
    sla_max_days: Mapped[int] = mapped_column(Integer, default=14)
    tester_type: Mapped[str] = mapped_column(String(20), default="FREE")
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    pay_in_ref: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    requester_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rd_maker_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    delivery_status: Mapped[str] = mapped_column(String(40), default="REQUESTED")
    tester_cost: Mapped[Decimal] = mapped_column(Numeric(14, 6), default=0)

class RateRequest(Base, TimestampMixin):
    __tablename__ = "rate_requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    rate_no: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("product_projects.id"))
    formula_revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    quotation_no: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    product_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    rd_head_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    sales_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class RateTier(Base, TimestampMixin):
    __tablename__ = "rate_tiers"
    id: Mapped[int] = mapped_column(primary_key=True)
    rate_request_id: Mapped[int] = mapped_column(ForeignKey("rate_requests.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    cost_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    selling_price_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    profit_per_unit: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    total_profit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=0)
    net_profit: Mapped[Decimal] = mapped_column(Numeric(18, 4), default=0)
    margin_percent: Mapped[Decimal] = mapped_column(Numeric(10, 4), default=0)

class RegistrationFormula(Base, TimestampMixin):
    __tablename__ = "registration_formulas"
    id: Mapped[int] = mapped_column(primary_key=True)
    formula_id: Mapped[int] = mapped_column(ForeignKey("formulas.id"))
    formula_revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    registration_no: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    sent_to_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    deposit_50_received: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class ProductionFormula(Base, TimestampMixin):
    __tablename__ = "production_formulas"
    id: Mapped[int] = mapped_column(primary_key=True)
    production_formula_no: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    source_formula_revision_id: Mapped[int] = mapped_column(ForeignKey("formula_revisions.id"))
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(40), default="LOCKED")

class ProductionOrder(Base, TimestampMixin):
    __tablename__ = "production_orders"
    id: Mapped[int] = mapped_column(primary_key=True)
    production_order_no: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    production_formula_id: Mapped[int] = mapped_column(ForeignKey("production_formulas.id"))
    ordered_quantity: Mapped[int] = mapped_column(Integer)
    waste_percent: Mapped[Decimal] = mapped_column(Numeric(8, 4), default=5)
    planned_quantity: Mapped[int] = mapped_column(Integer)
    unit_name: Mapped[str] = mapped_column(String(30), default="unit")
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    planning_status: Mapped[str] = mapped_column(String(40), default="NOT_SENT")

class PlanningHandoff(Base, TimestampMixin):
    __tablename__ = "planning_handoffs"
    id: Mapped[int] = mapped_column(primary_key=True)
    production_order_id: Mapped[int] = mapped_column(ForeignKey("production_orders.id"))
    sent_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(40), default="SENT")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

class InventoryStock(Base, TimestampMixin):
    __tablename__ = "inventory_stocks"
    __table_args__ = (UniqueConstraint("material_id", "warehouse", name="uq_stock_material_warehouse"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    material_id: Mapped[int] = mapped_column(ForeignKey("raw_materials.id"))
    warehouse: Mapped[str] = mapped_column(String(100), default="MAIN")
    on_hand_kg: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)
    reserved_kg: Mapped[Decimal] = mapped_column(Numeric(16, 6), default=0)

class Approval(Base, TimestampMixin):
    __tablename__ = "approvals"
    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    step_name: Mapped[str] = mapped_column(String(100))
    required_role: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(30), default="PENDING")
    approver_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class FDAMaterial(Base, TimestampMixin):
    __tablename__ = "fda_materials"

    id: Mapped[int] = mapped_column(primary_key=True)
    material_code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    supplier_category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    product_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    supplier_company: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    supplier_code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, index=True)
    coa: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fda_number: Mapped[Optional[str]] = mapped_column(Text, nullable=True, index=True)
    registered_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    origin_country: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_per_kg: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    halal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    purity: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assay: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Bulk-quantity price tiers: same material_code/fda_number, different
    # total quantity needed -> different price_per_kg. JSON list of
    # {"min_qty_kg": <number>, "price_per_kg": <number>}; price_per_kg above
    # remains the flat/base price used below the smallest tier threshold.
    price_tiers_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ratio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    percentage: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Attached อย. spec document from the supplier (PDF or image), stored as
    # base64 in the DB — same reasoning as PackagingItem's image: this app's
    # Render deployment has no persistent disk, so a file saved to disk
    # would vanish on the next deploy.
    spec_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    spec_mime: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    spec_filename: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

class PackagingItem(Base, TimestampMixin):
    """Packaging master data (บรรจุภัณฑ์), managed by ADMIN/PURCHASE.

    `cost` is the internal cost from the supplier catalog. The real/selling
    price shown to forms is derived at read time as cost * 1.20 (20% markup)
    — see app/api/packaging.py — so it never drifts out of sync with cost.
    """
    __tablename__ = "packaging_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    spec: Mapped[str] = mapped_column(String(500), index=True)
    official_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(16, 6), nullable=True)
    supplier: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rate: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    lead_time: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    packing: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    tiers_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_row: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Image stored as base64 in the DB rather than on local disk: this app's
    # Render deployment has no declared persistent disk, so anything saved
    # to the filesystem would vanish on the next deploy. Kept small via the
    # resize/compress step in app/api/packaging.py before it's ever stored.
    image_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_mime: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    old_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class SourceFormRecord(Base, TimestampMixin):
    __tablename__ = "source_form_records"
    id: Mapped[int] = mapped_column(primary_key=True)
    form_code: Mapped[str] = mapped_column(String(30), index=True)
    record_no: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(40), default="DRAFT")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    workspace_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("form_workspace_users.id"), nullable=True, index=True)
    owner_person_key: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    # F-RD-002 (สูตร) only: which month the user chose to file this record
    # under, format "YYYY-MM". User-selectable at save time, not auto-derived
    # from created_at.
    filed_month: Mapped[Optional[str]] = mapped_column(String(7), nullable=True, index=True)
    # F-RD-002.1 (สูตรผลิต) only: which person's name the user chose to file
    # this record under. Independent of who is actually logged in/saving it.
    filed_person_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)


class FormWorkspaceUser(Base, TimestampMixin):
    __tablename__ = "form_workspace_users"
    id: Mapped[int] = mapped_column(primary_key=True)
    slot_no: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    pin_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class PurchaseDocument(Base, TimestampMixin):
    """Purchase Order (ใบสั่งซื้อ, to an external supplier) and Purchase
    Request (ใบขอซื้อ / PR, Stock -> Purchasing). Unlike SourceFormRecord
    (private per-person R&D drafts), these are shared department documents:
    anyone who can see the PURCHASE/STOCK nav can see all of them, same as
    Customers/Suppliers master data elsewhere in this app.
    """
    __tablename__ = "purchase_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    doc_type: Mapped[str] = mapped_column(String(10), index=True)  # "PO" or "PR"
    doc_no: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT")
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Free-text cross-reference: a PO's "อ้างอิง" pointing at the PR number it
    # was raised from, or vice versa -- not a foreign key since either side
    # can be created first.
    linked_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)


class WorkHandoff(Base, TimestampMixin):
    """A general-purpose "send work to another department" message.

    Deliberately generic (subject/message/optional free-text reference)
    rather than tied to a specific document type, so any department can send
    work to any other department without each workflow needing its own
    bespoke handoff table.
    """
    __tablename__ = "work_handoffs"
    id: Mapped[int] = mapped_column(primary_key=True)
    from_department: Mapped[str] = mapped_column(String(30), index=True)
    to_department: Mapped[str] = mapped_column(String(30), index=True)
    from_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    from_user_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subject: Mapped[str] = mapped_column(String(255))
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Optional loose reference to another document, e.g. "F-RD-002-001" or a
    # PO number -- free text, not a foreign key, so it works for any form.
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SENT")  # SENT -> RECEIVED -> DONE
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    done_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SupplementAlias(Base, TimestampMixin):
    __tablename__ = "supplement_aliases"
    id: Mapped[int] = mapped_column(primary_key=True)
    supplement_code: Mapped[str] = mapped_column(String(80), index=True)
    primary_name: Mapped[str] = mapped_column(String(255))
    alternate_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class FormulaAIFeedback(Base, TimestampMixin):
    __tablename__ = "formula_ai_feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    form_code: Mapped[str] = mapped_column(String(30), index=True)
    product_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    product_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    objective: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    customer_requirement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    material_code: Mapped[str] = mapped_column(String(80), index=True)
    material_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    suggested_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    reviewer_comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
