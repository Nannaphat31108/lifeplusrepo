from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user, require_roles
from app.models.entities import *
from app.schemas.erp import *
from app.services.audit import audit

router = APIRouter(prefix="/api", tags=["Master Data"])

@router.post("/customers")
def create_customer(p: CustomerCreate, db: Session=Depends(get_db), u=Depends(get_current_user)):
    x=Customer(**p.model_dump()); db.add(x); db.flush()
    audit(db,u.id,"CREATE","Customer",x.id,new_data=p.model_dump(mode="json")); db.commit(); db.refresh(x)
    return x

@router.get("/customers")
def customers(db: Session=Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(select(Customer).order_by(Customer.name)).all()

@router.post("/suppliers")
def create_supplier(p: SupplierCreate, db: Session=Depends(get_db), u=Depends(get_current_user)):
    x=Supplier(**p.model_dump()); db.add(x); db.flush(); audit(db,u.id,"CREATE","Supplier",x.id); db.commit(); db.refresh(x); return x

@router.get("/suppliers")
def suppliers(db: Session=Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(select(Supplier).order_by(Supplier.name)).all()

@router.post("/materials")
def create_material(p: MaterialCreate, db: Session=Depends(get_db), u=Depends(get_current_user)):
    x=RawMaterial(**p.model_dump()); db.add(x); db.flush(); audit(db,u.id,"CREATE","RawMaterial",x.id); db.commit(); db.refresh(x); return x

@router.get("/materials")
def materials(db: Session=Depends(get_db), _=Depends(get_current_user)):
    return db.scalars(select(RawMaterial).order_by(RawMaterial.trade_name)).all()

@router.post("/material-suppliers")
def link_material_supplier(p: MaterialSupplierCreate, db: Session=Depends(get_db), u=Depends(get_current_user)):
    if not db.get(RawMaterial,p.material_id) or not db.get(Supplier,p.supplier_id):
        raise HTTPException(404,"Material/Supplier not found")
    x=MaterialSupplier(**p.model_dump()); db.add(x); db.flush()
    db.add(MaterialPriceHistory(material_supplier_id=x.id,price_per_kg=x.price_per_kg))
    audit(db,u.id,"LINK","MaterialSupplier",x.id); db.commit(); db.refresh(x); return x

@router.post("/inventory/stock")
def set_stock(p: StockSet, db: Session=Depends(get_db), u=Depends(require_roles("ADMIN","PLANNING","RD_HEAD"))):
    x=db.scalar(select(InventoryStock).where(InventoryStock.material_id==p.material_id,InventoryStock.warehouse==p.warehouse))
    if not x:
        x=InventoryStock(**p.model_dump()); db.add(x)
    else:
        x.on_hand_kg=p.on_hand_kg; x.reserved_kg=p.reserved_kg
    db.commit(); db.refresh(x); return x
