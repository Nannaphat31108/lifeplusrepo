import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.models.entities import User
from app.api.auth import department_account_map

Base.metadata.create_all(bind=engine)
db=SessionLocal()
try:
    for username,spec in department_account_map().items():
        user=db.query(User).filter(User.username==username).first()
        if not user:
            db.add(User(
                username=username,
                full_name=spec["full_name"],
                password_hash=hash_password(spec["password"]),
                role=spec["role"],
                is_active=True,
            ))
        else:
            user.full_name=spec["full_name"]
            user.password_hash=hash_password(spec["password"])
            user.role=spec["role"]
            user.is_active=True
    db.commit()
    print("Created/repaired 4 users per department.")
finally:
    db.close()
