from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.core.security import get_current_user

router=APIRouter(prefix="/api/original-forms",tags=["Original Forms"])
ROOT=Path(__file__).resolve().parents[2]/"original_forms"
FILES={
 "F-RD-001":"F-RD-001.xls",
 "F-RD-002":"F-RD-002.xlsx",
 "F-RD-002.1":"F-RD-002.1.xlsx",
 "F-RD-003":"F-RD-003.xlsx",
 "F-RD-004":"F-RD-004.xlsx",
 "ADMIN-QP":"ADMIN-QP-SOURCE.xls",
 "ADMIN-INVOICE":"ADMIN-QP-SOURCE.xls",
}
@router.get("/{code}")
def download_original(code:str,u=Depends(get_current_user)):
    name=FILES.get(code)
    if not name: raise HTTPException(404,"Form not found")
    path=ROOT/name
    if not path.exists(): raise HTTPException(404,"Original file missing")
    return FileResponse(path,filename=name)
