from sqlalchemy.orm import Session
from app.models.entities import AuditLog

def audit(db: Session, user_id, action, entity_type, entity_id=None, old_data=None, new_data=None):
    db.add(AuditLog(
        user_id=user_id, action=action, entity_type=entity_type,
        entity_id=entity_id, old_data=old_data, new_data=new_data
    ))
