
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.security import get_current_user

router = APIRouter(prefix="/api/department-access", tags=["Department Access"])

DEPARTMENT_CODES = {
    "RD": "1201",
    "ADMIN": "1202",
    "SALE": "1203",
    "JOB": "1204",
    "PLANNING": "1205",
    "STOCK": "1206",
    "PURCHASE": "1207",
    "PRODUCTION": "1208",
    "GRAPHIC": "1209",
    "QC": "1210",
    "QUALITY": "1211",
    "CEO": "1212",
}

# 4 people in every department.
# Each PIN is unique to department + person.
PERSON_CODES = {
    dept: {n: f"{base}{n}" for n in range(1,5)}
    for dept, base in {
        "RD":"21",
        "ADMIN":"22",
        "SALE":"23",
        "JOB":"24",
        "PLANNING":"25",
        "STOCK":"26",
        "PURCHASE":"27",
        "PRODUCTION":"28",
        "GRAPHIC":"29",
        "QC":"30",
        "QUALITY":"31",
        "CEO":"32",
    }.items()
}

class DepartmentCodeRequest(BaseModel):
    department: str
    code: str

class PersonCodeRequest(BaseModel):
    department: str
    person_no: int
    code: str

@router.post("/verify")
def verify_department_code(
    p: DepartmentCodeRequest,
    user=Depends(get_current_user),
):
    dept=(p.department or "").strip().upper()
    expected=DEPARTMENT_CODES.get(dept)
    if not expected:
        raise HTTPException(404, "Department not found")
    if (p.code or "").strip() != expected:
        raise HTTPException(401, "รหัสแผนกไม่ถูกต้อง")
    return {"ok": True, "department": dept, "user_id": user.id}

@router.post("/verify-person")
def verify_person_code(
    p: PersonCodeRequest,
    user=Depends(get_current_user),
):
    dept=(p.department or "").strip().upper()
    if dept not in PERSON_CODES:
        raise HTTPException(404, "Department not found")
    if p.person_no not in (1,2,3,4):
        raise HTTPException(400, "Person must be 1-4")
    expected=PERSON_CODES[dept][p.person_no]
    if (p.code or "").strip() != expected:
        raise HTTPException(401, "รหัสของคนนี้ไม่ถูกต้อง")
    return {
        "ok": True,
        "department": dept,
        "person_no": p.person_no,
        "person_name": f"คนที่ {p.person_no}",
        "user_id": user.id,
        "person_key": f"{dept}-{p.person_no}",
    }

@router.get("/departments")
def departments(user=Depends(get_current_user)):
    return [{"department": k} for k in DEPARTMENT_CODES]
