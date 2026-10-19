import sys
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

if getattr(sys, 'frozen', False):
    root_dir = Path(sys.executable).resolve().parent
    backend_dir = Path(getattr(sys, '_MEIPASS', root_dir)) / "backend"
else:
    backend_dir = Path(__file__).resolve().parent.parent.parent
    root_dir = backend_dir.parent

load_dotenv(backend_dir / ".env")
load_dotenv(root_dir / ".env")

class Settings:
    # Application Info
    APP_NAME: str = os.getenv("APP_NAME", "Security Certificate & Compliance Inspection System")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    VERSION: str = "0.3.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database Configuration (MySQL / XAMPP)
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "4306"))
    DB_NAME: str = os.getenv("DB_NAME", "security_certificate_system")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # Storage Paths
    UPLOAD_DIR: Path = root_dir / "uploads"
    REPORTS_DIR: Path = root_dir / "reports"

    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # JWT Authentication Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "scis-super-secret-jwt-key-for-local-development-2026")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Initial Admin Seed Configuration
    INITIAL_ADMIN_USERNAME: str = os.getenv("INITIAL_ADMIN_USERNAME", "admin")
    INITIAL_ADMIN_EMAIL: str = os.getenv("INITIAL_ADMIN_EMAIL", "admin@securitysystem.local")
    INITIAL_ADMIN_PASSWORD: str = os.getenv("INITIAL_ADMIN_PASSWORD", "Admin@123456")

    # CORS Origins
    @property
    def CORS_ORIGINS(self) -> List[str]:
        raw = os.getenv("CORS_ORIGINS", "") or os.getenv("ALLOWED_ORIGINS", "")
        if raw:
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "*",
        ]

    # Database Connection String
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        auth = f"{self.DB_USER}:{self.DB_PASSWORD}" if self.DB_PASSWORD else self.DB_USER
        return f"mysql+pymysql://{auth}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

settings = Settings()
