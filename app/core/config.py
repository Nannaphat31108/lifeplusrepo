from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    app_name: str = "R&D ERP AI"
    secret_key: str = "change-this-in-production"
    access_token_minutes: int = 480
    openai_api_key: str | None = None
    openai_model: str = "gpt-5.6-luna"
    database_url: str = "sqlite:///./rd_erp.db"
    # LINE Messaging API credentials for the "ส่งงานไปแผนกอื่น" (work
    # handoff) notification -- see README for how to obtain these. LINE
    # Notify (the older, token-only service) was discontinued by LINE on
    # 2025-03-31, so this uses a LINE Official Account's Messaging API
    # instead. Both unset by default; notifications are skipped (not an
    # error) until an admin configures them.
    line_channel_access_token: str | None = None
    # Optional: a specific group/room/user ID (from a webhook event) to
    # push to. Left unset, the message broadcasts to every follower of the
    # Official Account instead -- the simpler v1 default ("make one OA,
    # have everyone who cares about handoffs add it as a friend").
    line_target_id: str | None = None

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
