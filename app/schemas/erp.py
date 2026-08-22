from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class CustomerCreate(BaseModel):
    customer_code: str
    name: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class SupplierCreate(BaseModel):
    supplier_code: str
    name: str
    country: Optional[str] = None

class MaterialCreate(BaseModel):
    material_code: str
    trade_name: str
    ingredient_name: Optional[str] = None
    halal: bool = False
    probiotic: bool = False
    specification_ref: Optional[str] = None
    fda_ref: Optional[str] = None

class MaterialSupplierCreate(BaseModel):
    material_id: int
    supplier_id: int
    country: Optional[str] = None
    price_per_kg: Decimal
    currency: str = "THB"
    lead_time_days: Optional[int] = None
    is_preferred: bool = False

class ProjectSupplementItemCreate(BaseModel):
    supplement_code: str
    supplement_name: Optional[str] = None
    amount: Decimal = Field(gt=0)
    unit: str = "mg"

class ProjectCreate(BaseModel):
    project_no: str
    customer_id: int
    salesperson: Optional[str] = None
    product_name: str
    supplement_code: Optional[str] = None
    supplement_items: list[ProjectSupplementItemCreate] = []
    product_type: Optional[str] = None
    target_price: Optional[Decimal] = None
    target_quantity: Optional[int] = None
    requirement_text: Optional[str] = None
    claims: Optional[str] = None
    flavor: Optional[str] = None
    packaging_requirement: Optional[str] = None
    deadline: Optional[date] = None

class FormulaCreate(BaseModel):
    formula_no: str
    project_id: int
    formula_name: Optional[str] = None

class RevisionCreate(BaseModel):
    revision_no: int
    reason: Optional[str] = None
    customer_feedback: Optional[str] = None
    selling_price_per_unit: Decimal = Decimal("0")

class FormulaItemCreate(BaseModel):
    material_id: int
    material_supplier_id: Optional[int] = None
    dose_mg: Decimal = Field(gt=0)
    note: Optional[str] = None

class ProcessStepCreate(BaseModel):
    sequence_no: int
    instruction: str
    sieve_spec: Optional[str] = None

class PackagingSpecCreate(BaseModel):
    dosage_form: Optional[str] = None
    capsule_size: Optional[str] = None
    capsule_color: Optional[str] = None
    tablet_shape: Optional[str] = None
    sachet_size: Optional[str] = None
    water_ml: Optional[Decimal] = None
    serving_per_day: Optional[str] = None
    packaging_cost_per_unit: Decimal = Decimal("0")

class TesterCreate(BaseModel):
    tester_no: str
    project_id: int
    formula_revision_id: int
    quotation_no: Optional[str] = None
    receipt_no: Optional[str] = None
    customer_need: Optional[str] = None
    characteristic: Optional[str] = None
    packaging: Optional[str] = None
    quantity: int = Field(gt=0)
    requested_date: date = Field(default_factory=date.today)
    delivery_date: Optional[date] = None
    tester_type: str = "FREE"
    paid_amount: Decimal = Decimal("0")
    pay_in_ref: Optional[str] = None
    requester_name: Optional[str] = None
    rd_maker_name: Optional[str] = None

class RateTierInput(BaseModel):
    quantity: int = Field(gt=0)
    selling_price_per_unit: Optional[Decimal] = None
    margin_percent: Decimal = Decimal("30")

class RateCreate(BaseModel):
    rate_no: str
    project_id: int
    formula_revision_id: int
    quotation_no: Optional[str] = None
    product_name: Optional[str] = None
    notes: Optional[str] = None
    tiers: list[RateTierInput] = []

class ApprovalDecision(BaseModel):
    approve: bool
    comment: Optional[str] = None

class ProductionFormulaCreate(BaseModel):
    production_formula_no: str
    source_formula_revision_id: int
    version_no: int = 1

class ProductionOrderCreate(BaseModel):
    production_order_no: str
    production_formula_id: int
    ordered_quantity: int = Field(gt=0)
    waste_percent: Decimal = Decimal("5")
    unit_name: str = "unit"

class StockSet(BaseModel):
    material_id: int
    warehouse: str = "MAIN"
    on_hand_kg: Decimal = Decimal("0")
    reserved_kg: Decimal = Decimal("0")

class RegistrationCreate(BaseModel):
    formula_id: int
    formula_revision_id: int
    registration_no: Optional[str] = None
    sent_to_admin: bool = False
    deposit_50_received: bool = False
    notes: Optional[str] = None
