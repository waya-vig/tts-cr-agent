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

    # Database - Render provides DATABASE_URL; local uses individual vars
    database_url_external: str = ""  # Render's DATABASE_URL mapped here

    postgres_user: str = "tts_cr_agent"
    postgres_password: str = ""
    postgres_db: str = "tts_cr_agent"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        if self.database_url_external:
            url = self.database_url_external
            # Render gives postgresql://, asyncpg needs postgresql+asyncpg://
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        """Sync URL for Alembic migrations."""
        if self.database_url_external:
            url = self.database_url_external
            # Ensure it starts with postgresql:// (not +asyncpg)
            return url.replace("postgresql+asyncpg://", "postgresql://", 1)
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

    # AWS Bedrock
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-1"
    bedrock_model_id: str = "jp.anthropic.claude-sonnet-4-5-20250929-v1:0"
    use_bedrock: bool = True

    # Pinecone
    pinecone_api_key: str = ""
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "tts-cr-agent"

    # TikTok Shop
    tts_app_key: str = ""
    tts_app_secret: str = ""


settings = Settings()
