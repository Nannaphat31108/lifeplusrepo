"""Bootstrap department/admin accounts with freshly generated passwords.

Run this once against a database, by hand, when you need the full set of
department accounts (rd1..rd4, admin1..admin4, ... ceo1..ceo4, plus the
legacy single-user aliases rd/admin/sale) instead of just the one ADMIN
account the app creates automatically on first boot.

- Never overwrites an existing user or password.
- Each newly created account gets its own random password, printed ONCE
  below. Capture it into a password manager immediately — this script does
  not store it anywhere.
- Give each password to its owner over a secure channel and have them
  rotate it via POST /api/auth/change-password on first login.

Usage:
    python scripts/seed.py
"""
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import hash_password
from app.models.entities import User
from app.api.auth import department_role_map

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    created = []
    for username, spec in department_role_map().items():
        if db.query(User).filter(User.username == username).first():
            continue
        password = secrets.token_urlsafe(12)
        db.add(User(
            username=username,
            full_name=spec["full_name"],
            password_hash=hash_password(password),
            role=spec["role"],
            is_active=True,
        ))
        created.append((username, password))
    db.commit()
finally:
    db.close()

if not created:
    print("No new accounts created — every username already exists.")
else:
    print(f"Created {len(created)} account(s). These passwords are shown ONCE:\n")
    for username, password in created:
        print(f"  {username} / {password}")
    print("\nDistribute each securely and have the owner change it via /api/auth/change-password.")
