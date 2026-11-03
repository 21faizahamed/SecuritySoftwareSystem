import os
import shutil
import logging
from pathlib import Path
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

def _reset_corrupted_mysql_db(server_uri: str, db_name: str):
    """
    Repairs XAMPP MySQL/MariaDB database when InnoDB tables become detached
    (e.g., Error 1932 'Table doesn't exist in engine' after XAMPP recovery).
    """
    temp_engine = create_engine(server_uri, isolation_level="AUTOCOMMIT")
    datadir = None
    try:
        with temp_engine.connect() as conn:
            row = conn.execute(text("SELECT @@datadir;")).fetchone()
            if row and row[0]:
                datadir = Path(str(row[0]))
            try:
                conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`;"))
            except Exception as drop_err:
                logger.warning(f"Initial DROP DATABASE `{db_name}` failed ({drop_err}); cleaning orphaned files...")
                if datadir and (datadir / db_name).exists():
                    shutil.rmtree(datadir / db_name, ignore_errors=True)
                conn.execute(text(f"DROP DATABASE IF EXISTS `{db_name}`;"))

            if datadir and (datadir / db_name).exists():
                shutil.rmtree(datadir / db_name, ignore_errors=True)

            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
            logger.info(f"Recreated clean MySQL database `{db_name}`.")
    finally:
        temp_engine.dispose()

def _verify_and_repair_schema(eng, server_uri: str = None, db_name: str = None):
    """
    Verifies core tables exist and are readable in the storage engine.
    Automatically repairs and seeds if tables are missing or corrupted (Error 1932 / 1146).
    Returns the working engine (which may point to a clean database if the original was locked).
    """
    import app.models  # noqa: F401 - ensure all models are registered on Base.metadata

    try:
        Base.metadata.create_all(bind=eng)
        with eng.connect() as conn:
            for tbl in ("roles", "permissions", "users", "establishments", "inspections", "requirements"):
                conn.execute(text(f"SELECT 1 FROM `{tbl}` LIMIT 1"))
        return eng
    except Exception as table_err:
        if server_uri and db_name:
            logger.warning(f"Detected corrupted or uninitialized MySQL table state ({table_err}). Repairing `{db_name}`...")
            eng.dispose()
            try:
                _reset_corrupted_mysql_db(server_uri, db_name)
                Base.metadata.create_all(bind=eng)
                with eng.connect() as conn:
                    conn.execute(text("SELECT 1 FROM `users` LIMIT 1"))
                return eng
            except Exception as repair_err:
                fallback_db_name = f"{db_name}_active"
                logger.warning(f"In-place repair of `{db_name}` blocked by OS lock ({repair_err}). Switching to `{fallback_db_name}`...")
                create_db_if_not_exists(server_uri, fallback_db_name)
                alt_uri = f"{server_uri.rstrip('/')}/{fallback_db_name}?charset=utf8mb4"
                alt_eng = create_engine(
                    alt_uri,
                    pool_pre_ping=True,
                    pool_recycle=3600,
                    pool_size=5,
                    max_overflow=10,
                    echo=False,
                )
                Base.metadata.create_all(bind=alt_eng)
                with alt_eng.connect() as conn:
                    conn.execute(text("SELECT 1 FROM `users` LIMIT 1"))
                return alt_eng
        else:
            raise

def create_resilient_engine():
    """
    Attempts to connect to MySQL on configured port (e.g. 4306),
    then standard XAMPP port (3306), and falls back to SQLite if MySQL is unavailable.
    """
    candidate_ports = [settings.DB_PORT]
    for fallback in (3307, 3306, 4306):
        if fallback not in candidate_ports:
            candidate_ports.append(fallback)

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

def _seed_defaults():
    """Ensures default roles, admin/demo users, SIRA requirements, and baseline establishment/inspection exist."""
    try:
        from app.services.role_service import RoleService
        from app.services.requirement_service import RequirementService
        from app.services.sira_explorer_service import SiraExplorerService
        from app.models.establishment import Establishment
        from app.models.inspection import Inspection
        with SessionLocal() as db:
            RoleService.seed_default_roles_and_permissions(db)
            RoleService.seed_initial_admin(db)
            RequirementService.seed_default_regulatory_requirements(db)
            SiraExplorerService.seed_sira_manual_database(db)
            if db.query(Establishment).count() == 0:
                est = Establishment(
                    name="Rochester Institute of Technology",
                    establishment_type="Educational / Campus",
                    address="Dubai Silicon Oasis",
                    status="ACTIVE",
                )
                db.add(est)
                db.flush()
                insp = Inspection(
                    inspection_number="SC-2026-000001",
                    establishment_id=est.id,
                    inspection_type="INITIAL",
                    status="PENDING",
                )
                db.add(insp)
                db.commit()
    except Exception as e:
        logger.warning(f"Seed check warning: {e}")

def ensure_database_ready():
    """
    Self-healing check executed before database operations.
    If MySQL restarted, switched ports (3306 <-> 4306), or had corrupted InnoDB tables (#1932),
    reconnects, repairs schema, and seeds initial users automatically.
    """
    global engine, DB_ENGINE_TYPE, ACTIVE_PORT
    # If currently in SQLite fallback, check if MySQL is available so we reconnect to primary MySQL DB
    if DB_ENGINE_TYPE == "sqlite":
        new_eng, new_type, new_port = create_resilient_engine()
        if new_type == "mysql":
            try:
                engine.dispose()
            except Exception:
                pass
            engine, DB_ENGINE_TYPE, ACTIVE_PORT = new_eng, new_type, new_port
            SessionLocal.configure(bind=engine)
        else:
            try:
                new_eng.dispose()
            except Exception:
                pass

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM users LIMIT 1"))
            user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            est_count = conn.execute(text("SELECT COUNT(*) FROM establishments")).scalar()
        if not user_count or not est_count:
            _seed_defaults()
    except Exception as e:
        logger.warning(f"Database connection/table check triggered self-heal ({e})...")
        try:
            engine.dispose()
        except Exception:
            pass
        engine, DB_ENGINE_TYPE, ACTIVE_PORT = create_resilient_engine()
        if DB_ENGINE_TYPE == "mysql":
            try:
                auth = f"{settings.DB_USER}:{settings.DB_PASSWORD}" if settings.DB_PASSWORD else settings.DB_USER
                server_uri = f"mysql+pymysql://{auth}@{settings.DB_HOST}:{ACTIVE_PORT}/"
                engine = _verify_and_repair_schema(engine, server_uri=server_uri, db_name=settings.DB_NAME)
            except Exception as mysql_err:
                logger.error(f"MySQL schema repair failed ({mysql_err}); switching to embedded SQLite fallback.")
                db_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "database")
                os.makedirs(db_dir, exist_ok=True)
                sqlite_path = os.path.join(db_dir, "scis_local.db").replace("\\", "/")
                engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False}, echo=False)
                DB_ENGINE_TYPE, ACTIVE_PORT = "sqlite", 0
                import app.models  # noqa: F401
                Base.metadata.create_all(bind=engine)
        else:
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=engine)
        SessionLocal.configure(bind=engine)
        _seed_defaults()

def get_db():
    """FastAPI database dependency providing a transactional database session."""
    ensure_database_ready()
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
