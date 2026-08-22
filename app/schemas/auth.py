from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "RD_OFFICER"

class LoginRequest(BaseModel):
    username: str
    password: str
