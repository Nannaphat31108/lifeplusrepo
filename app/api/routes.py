from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.master import router as master_router
from app.api.formulas import router as formula_router
from app.api.workflow import router as workflow_router
from app.api.dashboard import router as dashboard_router
from app.api.ui import router as ui_router
from app.api.final_ui import router as final_ui_router
from app.api.export_excel import router as export_excel_router
from app.api.original_forms import router as original_forms_router
from app.api.source_forms import router as source_forms_router
from app.api.form_workspace import router as form_workspace_router
from app.api.ai_formula import router as ai_formula_router
from app.api.fda_materials import router as fda_materials_router
from app.api.packaging import router as packaging_router

router=APIRouter()
for r in [auth_router,master_router,formula_router,workflow_router,dashboard_router,ui_router,final_ui_router,export_excel_router,original_forms_router,source_forms_router,form_workspace_router,ai_formula_router,fda_materials_router,packaging_router]:
    router.include_router(r)
