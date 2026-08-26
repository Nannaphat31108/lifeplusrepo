from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import UserCreate, LoginRequest
from app.core.security import hash_password, verify_password, create_access_token, require_roles

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register")
def register(payload: UserCreate, db: Session = Depends(get_db), _=Depends(require_roles("ADMIN"))):
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(409, "Username exists")
    user = User(
        username=payload.username, full_name=payload.full_name,
        password_hash=hash_password(payload.password), role=payload.role
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"id": user.id, "username": user.username, "role": user.role}


def department_account_map():
    departments = {
        "rd": ("R&D", "RD_HEAD"),
        "admin": ("ADMIN", "ADMIN"),
        "sale": ("SALE", "SALES"),
        "job": ("JOB", "JOB"),
        "planning": ("PLANNING", "PLANNING"),
        "stock": ("STOCK", "STOCK"),
        "purchase": ("PURCHASE", "PURCHASE"),
        "production": ("PRODUCTION", "PRODUCTION"),
        "graphic": ("GRAPHIC", "GRAPHIC"),
        "qc": ("QC", "QC"),
        "quality": ("QUALITY", "QUALITY"),
        "ceo": ("CEO", "CEO"),
    }
    result = {}
    for prefix, (dept_name, role) in departments.items():
        for n in range(1, 5):
            username = f"{prefix}{n}"
            password = f"{prefix}{n}1234"
            result[username] = {
                "full_name": f"{dept_name} - คนที่ {n}",
                "password": password,
                "role": role,
                "department": prefix.upper(),
                "person_no": n,
            }

    # Keep simple admin and legacy users too.
    result["admin"] = {
        "full_name": "Administrator",
        "password": "admin1234",
        "role": "ADMIN",
        "department": "ADMIN",
        "person_no": 1,
    }
    result["rd"] = {
        "full_name": "R&D Department",
        "password": "rd1234",
        "role": "RD_HEAD",
        "department": "RD",
        "person_no": 1,
    }
    result["sale"] = {
        "full_name": "Sale Department",
        "password": "sale1234",
        "role": "SALES",
        "department": "SALE",
        "person_no": 1,
    }
    return result

@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = (payload.username or "").strip().lower()
    password = payload.password or ""
    accounts = department_account_map()
    spec = accounts.get(username)

    user = db.scalar(select(User).where(User.username == username))

    if spec and password == spec["password"]:
        if not user:
            user = User(
                username=username,
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.full_name = spec["full_name"]
            user.role = spec["role"]
            user.is_active = True
            try:
                ok = verify_password(spec["password"], user.password_hash)
            except Exception:
                ok = False
            if not ok:
                user.password_hash = hash_password(spec["password"])
            db.commit()
            db.refresh(user)
    else:
        if not user:
            raise HTTPException(401, "Invalid username/password")
        try:
            ok = verify_password(password, user.password_hash)
        except Exception:
            ok = False
        if not ok:
            raise HTTPException(401, "Invalid username/password")

    if not user.is_active:
        raise HTTPException(401, "Inactive user")

    # Derive department/person from guaranteed account pattern.
    department = None
    person_no = None
    if spec:
        department = spec.get("department")
        person_no = spec.get("person_no")

    return {
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "role": user.role,
            "username": user.username,
            "department": department,
            "person_no": person_no,
        }
    }
