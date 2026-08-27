from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "RD_OFFICER"
    department: str | None = None

class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    department: str | None = None
    is_active: bool | None = None

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class AdminSetPasswordRequest(BaseModel):
    username: str
    new_password: str
