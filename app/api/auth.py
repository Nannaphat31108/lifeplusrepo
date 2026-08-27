from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import UserCreate, LoginRequest, ChangePasswordRequest, AdminSetPasswordRequest
from app.core.security import (
    hash_password, verify_password, create_access_token,
    require_roles, get_current_user,
)

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


def department_role_map():
    """Static username -> (department, role, display name) metadata.

    This intentionally carries NO passwords. It exists so the login response
    can label a department-pattern username (e.g. "rd1") with its department
    and person number, and so `scripts/seed.py` knows which accounts to
    bootstrap with freshly generated passwords. Real credentials only ever
    live as bcrypt hashes in the `users` table.
    """
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
            result[username] = {
                "full_name": f"{dept_name} - คนที่ {n}",
                "role": role,
                "department": prefix.upper(),
                "person_no": n,
            }

    result["admin"] = {"full_name": "Administrator", "role": "ADMIN", "department": "ADMIN", "person_no": 1}
    result["rd"] = {"full_name": "R&D Department", "role": "RD_HEAD", "department": "RD", "person_no": 1}
    result["sale"] = {"full_name": "Sale Department", "role": "SALES", "department": "SALE", "person_no": 1}
    return result


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    username = (payload.username or "").strip().lower()
    password = payload.password or ""

    user = db.scalar(select(User).where(User.username == username))
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

    # Department/person metadata is cosmetic labeling only, never an
    # authentication check — the bcrypt verification above already decided.
    meta = department_role_map().get(username, {})

    return {
        "access_token": create_access_token(user.id, user.role),
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "role": user.role,
            "username": user.username,
            "department": meta.get("department"),
            "person_no": meta.get("person_no"),
        }
    }


@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    if len(payload.new_password or "") < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True}


@router.post("/admin/set-password")
def admin_set_password(
    payload: AdminSetPasswordRequest,
    db: Session = Depends(get_db),
    _=Depends(require_roles("ADMIN")),
):
    """Let an ADMIN reset another account's password (lost-password recovery)."""
    target = db.scalar(select(User).where(User.username == payload.username.strip().lower()))
    if not target:
        raise HTTPException(404, "User not found")
    if len(payload.new_password or "") < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    target.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"ok": True, "username": target.username}
