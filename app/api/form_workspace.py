from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_current_user, verify_password
from app.models.entities import FormWorkspaceUser

router = APIRouter(prefix="/api/form-workspaces", tags=["Private Form Workspaces"])

class WorkspaceLogin(BaseModel):
    slot_no: int
    pin: str

@router.get("")
def slots(db: Session = Depends(get_db), u=Depends(get_current_user)):
    rows = db.scalars(
        select(FormWorkspaceUser)
        .where(FormWorkspaceUser.is_active == True)
        .order_by(FormWorkspaceUser.slot_no)
    ).all()
    return [{"id": x.id, "slot_no": x.slot_no, "display_name": x.display_name} for x in rows]

@router.post("/login")
def login(p: WorkspaceLogin, db: Session = Depends(get_db), u=Depends(get_current_user)):
    x = db.scalar(
        select(FormWorkspaceUser)
        .where(FormWorkspaceUser.slot_no == p.slot_no, FormWorkspaceUser.is_active == True)
    )
    if not x or not verify_password(p.pin, x.pin_hash):
        raise HTTPException(401, "รหัสไม่ถูกต้อง")
    # Local ERP private-workspace session token.
    workspace_token = f"{x.id}:{x.slot_no}:{x.pin_hash[-20:]}"
    return {
        "workspace_user_id": x.id,
        "slot_no": x.slot_no,
        "display_name": x.display_name,
        "workspace_token": workspace_token
    }

def require_workspace(
    x_workspace_user: str | None = Header(default=None),
    x_workspace_token: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    if not x_workspace_user or not x_workspace_token:
        raise HTTPException(401, "กรุณาเลือกคน 1-4 และใส่รหัสก่อน")
    try:
        user_id = int(x_workspace_user)
    except ValueError:
        raise HTTPException(401, "Workspace ไม่ถูกต้อง")

    x = db.get(FormWorkspaceUser, user_id)
    if not x or not x.is_active:
        raise HTTPException(401, "ไม่พบพื้นที่ผู้ใช้")

    expected = f"{x.id}:{x.slot_no}:{x.pin_hash[-20:]}"
    if x_workspace_token != expected:
        raise HTTPException(401, "Workspace session ไม่ถูกต้อง")
    return x
