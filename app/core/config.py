from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    app_name: str = "R&D ERP AI"
    secret_key: str = "change-this-in-production"
    access_token_minutes: int = 480
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-luna"
    database_url: str = "sqlite:///./rd_erp.db"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        if isinstance(value, str):
            if value.startswith("postgres://"):
                return "postgresql+psycopg://" + value[len("postgres://"):]
            if value.startswith("postgresql://") and not value.startswith("postgresql+psycopg://"):
                return "postgresql+psycopg://" + value[len("postgresql://"):]
        return value

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
