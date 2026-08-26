from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.api.routes import router
import app.models  # noqa

Base.metadata.create_all(bind=engine)


def ensure_fda_material_schema():
    """Expand FDA text columns for existing PostgreSQL databases."""
    from sqlalchemy import text
    from app.db.session import engine

    statements = [
        "ALTER TABLE fda_materials ALTER COLUMN product_name TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN supplier_company TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN coa TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN fda_number TYPE TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS origin_country TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS price_per_kg TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS halal TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN registered_name TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN assay TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN ratio TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN percentage TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN note TYPE TEXT",
        "ALTER TABLE fda_materials ALTER COLUMN image_url TYPE TEXT",
    ]

    try:
        with engine.begin() as conn:
            dialect=conn.dialect.name
            if dialect=="postgresql":
                for stmt in statements:
                    conn.execute(text(stmt))
                print("[FDA SCHEMA] PostgreSQL FDA text columns expanded")
            elif dialect=="sqlite":
                cols={r[1] for r in conn.execute(text("PRAGMA table_info(fda_materials)")).fetchall()}
                for name in ("origin_country","price_per_kg","halal"):
                    if name not in cols:
                        conn.execute(text(f"ALTER TABLE fda_materials ADD COLUMN {name} TEXT"))
                print("[FDA SCHEMA] SQLite unified FDA/material columns ensured")
            else:
                print(f"[FDA SCHEMA] No migration needed for {dialect}")
    except Exception as e:
        print(f"[FDA SCHEMA] Warning: {type(e).__name__}: {e}")

ensure_fda_material_schema()


def normalize_existing_fda_material_codes():
    """Convert legacy database codes such as A001 to canonical A0001."""
    from app.db.session import SessionLocal
    from app.models.entities import FDAMaterial
    from app.api.fda_materials import normalize_material_code

    db=SessionLocal()
    try:
        rows=db.query(FDAMaterial).all()
        changed=0
        merged=0

        for row in rows:
            canonical=normalize_material_code(row.material_code)
            if not canonical or canonical==row.material_code:
                continue

            target=db.query(FDAMaterial).filter(
                FDAMaterial.material_code==canonical,
                FDAMaterial.id!=row.id
            ).first()

            if target:
                for field in (
                    "supplier_category","product_name","supplier_company","coa",
                    "fda_number","registered_name","origin_country","price_per_kg","halal","assay","ratio",
                    "percentage","note","image_url"
                ):
                    if not getattr(target,field,None) and getattr(row,field,None):
                        setattr(target,field,getattr(row,field))
                db.delete(row)
                merged+=1
            else:
                row.material_code=canonical
                changed+=1

        db.commit()
        print(f"[FDA CODE NORMALIZE] changed={changed}, merged={merged}")
    except Exception as e:
        db.rollback()
        print(f"[FDA CODE NORMALIZE] Warning: {type(e).__name__}: {e}")
    finally:
        db.close()

normalize_existing_fda_material_codes()



def ensure_fda_material_database():
    from app.db.session import SessionLocal
    from app.api.fda_materials import seed_fda_materials

    db=SessionLocal()
    try:
        result=seed_fda_materials(db)
        print(f"[FDA STARTUP] {result}")
    except Exception as e:
        db.rollback()
        print(f"[FDA STARTUP] Warning: {type(e).__name__}: {e}")
    finally:
        db.close()

ensure_fda_material_database()



def ensure_source_form_owner_schema():
    """Upgrade existing databases created before per-person source-form ownership."""
    from sqlalchemy import text

    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            tables = {r[0] for r in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()}
            if "source_form_records" not in tables:
                return

            cols = [r[1] for r in conn.execute(
                text("PRAGMA table_info(source_form_records)")
            ).fetchall()]

            if "workspace_user_id" not in cols:
                conn.execute(text(
                    "ALTER TABLE source_form_records ADD COLUMN workspace_user_id INTEGER"
                ))
            if "owner_person_key" not in cols:
                conn.execute(text(
                    "ALTER TABLE source_form_records ADD COLUMN owner_person_key VARCHAR(40)"
                ))

        elif engine.dialect.name == "postgresql":
            conn.execute(text(
                "ALTER TABLE source_form_records "
                "ADD COLUMN IF NOT EXISTS workspace_user_id INTEGER"
            ))
            conn.execute(text(
                "ALTER TABLE source_form_records "
                "ADD COLUMN IF NOT EXISTS owner_person_key VARCHAR(40)"
            ))

ensure_source_form_owner_schema()





def ensure_v13_department_accounts():
    from app.db.session import SessionLocal
    from app.models.entities import User
    from app.core.security import hash_password
    from app.api.auth import department_account_map

    db = SessionLocal()
    try:
        for username, spec in department_account_map().items():
            user = db.query(User).filter(User.username == username).first()
            if not user:
                db.add(User(
                    username=username,
                    full_name=spec["full_name"],
                    password_hash=hash_password(spec["password"]),
                    role=spec["role"],
                    is_active=True,
                ))
            else:
                user.full_name = spec["full_name"]
                user.role = spec["role"]
                user.is_active = True
                # Reset to documented demo/UAT password every server start.
                user.password_hash = hash_password(spec["password"])
        db.commit()
    finally:
        db.close()

ensure_v13_department_accounts()





def ensure_final_schema():
    # Compatibility migration for an existing local SQLite demo database.
    if engine.dialect.name == "sqlite":
        from sqlalchemy import text
        with engine.begin() as conn:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(product_projects)")).fetchall()]
            if "supplement_code" not in cols:
                conn.execute(text("ALTER TABLE product_projects ADD COLUMN supplement_code VARCHAR(80)"))

ensure_final_schema()
app=FastAPI(title=settings.app_name,version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=True,allow_methods=["*"],allow_headers=["*"])
app.include_router(router)
app.mount("/static",StaticFiles(directory="app/static"),name="static")
templates=Jinja2Templates(directory="app/templates")

@app.get("/")
def home(request:Request):
    return templates.TemplateResponse("index.html",{"request":request,"app_name":settings.app_name})

@app.get("/health")
def health():
    return {"status":"ok","app":settings.app_name}



@app.get("/login-check")
def login_check():
    return {
        "build": "FINAL-v31.12-variant-selection-realtime-fix",
        "status": "ready",
        "test_account": "rd1 / rd11234",
        "admin_account": "admin / admin1234"
    }
