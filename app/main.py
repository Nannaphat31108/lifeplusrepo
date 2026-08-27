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
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS supplier_code TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS purity TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS price_tiers_json TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS spec_data TEXT",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS spec_mime VARCHAR(120)",
        "ALTER TABLE fda_materials ADD COLUMN IF NOT EXISTS spec_filename VARCHAR(255)",
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
                for name in ("origin_country","price_per_kg","halal","supplier_code","purity","price_tiers_json","spec_data","spec_mime","spec_filename"):
                    if name not in cols:
                        conn.execute(text(f"ALTER TABLE fda_materials ADD COLUMN {name} TEXT"))
                print("[FDA SCHEMA] SQLite unified FDA/material columns ensured")
            else:
                print(f"[FDA SCHEMA] No migration needed for {dialect}")
    except Exception as e:
        print(f"[FDA SCHEMA] Warning: {type(e).__name__}: {e}")

ensure_fda_material_schema()


def ensure_customer_address_column():
    """Add customers.address for existing databases created before it existed."""
    from sqlalchemy import text
    from app.db.session import engine

    try:
        with engine.begin() as conn:
            dialect = conn.dialect.name
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT"))
                print("[CUSTOMER SCHEMA] PostgreSQL address column ensured")
            elif dialect == "sqlite":
                cols = {r[1] for r in conn.execute(text("PRAGMA table_info(customers)")).fetchall()}
                if "address" not in cols:
                    conn.execute(text("ALTER TABLE customers ADD COLUMN address TEXT"))
                print("[CUSTOMER SCHEMA] SQLite address column ensured")
            else:
                print(f"[CUSTOMER SCHEMA] No migration needed for {dialect}")
    except Exception as e:
        print(f"[CUSTOMER SCHEMA] Warning: {type(e).__name__}: {e}")

ensure_customer_address_column()


def ensure_packaging_image_columns():
    """Add packaging_items.image_data/image_mime for existing databases
    created before packaging images were supported."""
    from sqlalchemy import text
    from app.db.session import engine

    try:
        with engine.begin() as conn:
            dialect = conn.dialect.name
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE packaging_items ADD COLUMN IF NOT EXISTS image_data TEXT"))
                conn.execute(text("ALTER TABLE packaging_items ADD COLUMN IF NOT EXISTS image_mime VARCHAR(60)"))
                print("[PACKAGING SCHEMA] PostgreSQL image columns ensured")
            elif dialect == "sqlite":
                cols = {r[1] for r in conn.execute(text("PRAGMA table_info(packaging_items)")).fetchall()}
                if "image_data" not in cols:
                    conn.execute(text("ALTER TABLE packaging_items ADD COLUMN image_data TEXT"))
                if "image_mime" not in cols:
                    conn.execute(text("ALTER TABLE packaging_items ADD COLUMN image_mime VARCHAR(60)"))
                print("[PACKAGING SCHEMA] SQLite image columns ensured")
            else:
                print(f"[PACKAGING SCHEMA] No migration needed for {dialect}")
    except Exception as e:
        print(f"[PACKAGING SCHEMA] Warning: {type(e).__name__}: {e}")

ensure_packaging_image_columns()


def ensure_user_department_column():
    """Add users.department for existing databases created before real
    per-employee accounts carried their department directly (previously
    inferred only from a shared username pattern like "rd1".."rd4")."""
    from sqlalchemy import text
    from app.db.session import engine

    try:
        with engine.begin() as conn:
            dialect = conn.dialect.name
            if dialect == "postgresql":
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(30)"))
                print("[USER SCHEMA] PostgreSQL department column ensured")
            elif dialect == "sqlite":
                cols = {r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
                if "department" not in cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN department VARCHAR(30)"))
                print("[USER SCHEMA] SQLite department column ensured")
            else:
                print(f"[USER SCHEMA] No migration needed for {dialect}")
    except Exception as e:
        print(f"[USER SCHEMA] Warning: {type(e).__name__}: {e}")

ensure_user_department_column()


def ensure_packaging_database():
    from app.db.session import SessionLocal
    from app.api.packaging import import_package_catalog

    db = SessionLocal()
    try:
        result = import_package_catalog(db)
        print(f"[PACKAGING STARTUP] {result}")
    except Exception as e:
        db.rollback()
        print(f"[PACKAGING STARTUP] Warning: {type(e).__name__}: {e}")
    finally:
        db.close()

ensure_packaging_database()


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





def ensure_bootstrap_admin():
    """Create exactly one ADMIN account on a brand-new, empty database.

    This never touches an existing account or password — it only fires when
    the `users` table is completely empty (first boot against a fresh DB).
    The generated password is printed once to the process log; there is no
    other way to recover it, by design. Log in with it and immediately call
    POST /api/auth/change-password, or use `scripts/seed.py` to provision
    additional department accounts.
    """
    import secrets
    from app.db.session import SessionLocal
    from app.models.entities import User
    from app.core.security import hash_password

    db = SessionLocal()
    try:
        if db.query(User).first() is not None:
            return
        password = secrets.token_urlsafe(12)
        db.add(User(
            username="admin",
            full_name="Administrator",
            password_hash=hash_password(password),
            role="ADMIN",
            is_active=True,
        ))
        db.commit()
        print("=" * 60)
        print("[BOOTSTRAP] Created initial ADMIN account (first boot only):")
        print(f"[BOOTSTRAP]   username: admin")
        print(f"[BOOTSTRAP]   password: {password}")
        print("[BOOTSTRAP] This is shown once and is NOT stored anywhere else.")
        print("[BOOTSTRAP] Log in, then call POST /api/auth/change-password.")
        print("=" * 60)
    finally:
        db.close()

ensure_bootstrap_admin()





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
    }
