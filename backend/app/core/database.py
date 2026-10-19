import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

# Declarative Base
Base = declarative_base()

def create_db_if_not_exists(uri_without_db: str, db_name: str):
    """Ensure database exists on MySQL server before connecting."""
    try:
        temp_engine = create_engine(uri_without_db, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
        temp_engine.dispose()
    except Exception as e:
        logger.debug(f"Notice during auto-create DB: {e}")

def create_resilient_engine():
    """
    Attempts to connect to MySQL on configured port (e.g. 4306),
    then standard XAMPP port (3306), and falls back to SQLite if MySQL is unavailable.
    """
    candidate_ports = [settings.DB_PORT]
    if 3306 not in candidate_ports:
        candidate_ports.append(3306)
    if 4306 not in candidate_ports:
        candidate_ports.append(4306)

    auth = f"{settings.DB_USER}:{settings.DB_PASSWORD}" if settings.DB_PASSWORD else settings.DB_USER

    # 1. Try MySQL ports
    for port in candidate_ports:
        try:
            server_uri = f"mysql+pymysql://{auth}@{settings.DB_HOST}:{port}/"
            create_db_if_not_exists(server_uri, settings.DB_NAME)
            
            db_uri = f"mysql+pymysql://{auth}@{settings.DB_HOST}:{port}/{settings.DB_NAME}?charset=utf8mb4"
            eng = create_engine(
                db_uri,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=5,
                max_overflow=10,
                echo=False,
            )
            with eng.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(f"Connected to MySQL on port {port} (Database: '{settings.DB_NAME}')")
            return eng, "mysql", port
        except Exception as ex:
            logger.debug(f"MySQL connection attempt on port {port} failed: {ex}")

    # 2. Fallback to SQLite
    db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database")
    os.makedirs(db_dir, exist_ok=True)
    sqlite_path = os.path.join(db_dir, "scis_local.db").replace("\\", "/")
    sqlite_uri = f"sqlite:///{sqlite_path}"
    logger.warning(f"MySQL server not detected on ports {candidate_ports}. Falling back to embedded SQLite: {sqlite_uri}")
    
    eng = create_engine(
        sqlite_uri,
        connect_args={"check_same_thread": False},
        echo=False
    )
    return eng, "sqlite", 0

# Initialize engine & session
engine, DB_ENGINE_TYPE, ACTIVE_PORT = create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI database dependency providing a transactional database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """Executes a live query to verify database status, version, and type."""
    try:
        with engine.connect() as connection:
            if DB_ENGINE_TYPE == "mysql":
                result = connection.execute(text("SELECT VERSION() AS version, DATABASE() AS db_name;")).mappings().first()
                tables_result = connection.execute(text("SHOW TABLES;")).fetchall()
                table_names = [row[0] for row in tables_result]
                return {
                    "database": result["db_name"] if result else settings.DB_NAME,
                    "status": "connected",
                    "type": "MySQL (XAMPP)",
                    "version": result["version"] if result else "unknown",
                    "host": settings.DB_HOST,
                    "port": ACTIVE_PORT,
                    "tables": table_names,
                }
            else:
                tables_result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()
                table_names = [row[0] for row in tables_result]
                return {
                    "database": "scis_local.db",
                    "status": "connected",
                    "type": "SQLite (Embedded Fallback)",
                    "version": "SQLite 3",
                    "host": "localhost",
                    "port": 0,
                    "tables": table_names,
                }
    except Exception as e:
        logger.error(f"Database connection error: {e}", exc_info=True)
        return {
            "database": settings.DB_NAME,
            "status": "disconnected",
            "host": settings.DB_HOST,
            "port": settings.DB_PORT,
            "error": str(e),
        }
