from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "TTS CR Agent"
    debug: bool = False

    # Database
    postgres_user: str = "tts_cr_agent"
    postgres_password: str = "localdevpassword"
    postgres_db: str = "tts_cr_agent"
    postgres_host: str = "db"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Sync URL for Alembic migrations."""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Auth / JWT
    secret_key: str = "change-me-to-a-random-64-char-string-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # CORS
    backend_cors_origins: list[str] = ["http://localhost:3000"]

    # AI Services
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # Pinecone
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "tts-cr-agent"

    # TikTok Shop
    tts_app_key: str = ""
    tts_app_secret: str = ""


settings = Settings()
