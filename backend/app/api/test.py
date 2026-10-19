import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core.database import get_db
from app.dependencies.auth import get_optional_current_user
from app.models.user import User
from app.models.establishment import Establishment
from app.models.inspection import Inspection
from app.models.document import Document
from app.models.system_setting import SystemSetting
from app.schemas.establishment import EstablishmentCreate, EstablishmentResponse
from app.schemas.inspection import InspectionCreate, InspectionResponse
from app.schemas.document import DocumentCreate, DocumentResponse
from app.schemas.system_setting import SystemSettingCreate, SystemSettingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/test", tags=["Development & Database Verification"])

# --- Establishments Test Endpoints ---

@router.post("/establishments", response_model=EstablishmentResponse, status_code=status.HTTP_201_CREATED)
def create_test_establishment(data: EstablishmentCreate, db: Session = Depends(get_db)):
    """Creates an establishment record in MySQL (verifying UTF-8 Arabic / English persistence)."""
    try:
        establishment = Establishment(
            name=data.name,
            establishment_type=data.establishment_type,
            address=data.address,
            owner_name=data.owner_name,
            contact_information=data.contact_information,
        )
        db.add(establishment)
        db.commit()
        db.refresh(establishment)
        return establishment
    except OperationalError as e:
        db.rollback()
        logger.error(f"MySQL OperationalError in create_test_establishment: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database server is unavailable"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in create_test_establishment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create establishment record"
        )

@router.get("/establishments", response_model=List[EstablishmentResponse])
def list_test_establishments(db: Session = Depends(get_db)):
    """Retrieves all establishment records from MySQL."""
    try:
        return db.query(Establishment).order_by(Establishment.id.desc()).all()
    except OperationalError as e:
        logger.error(f"MySQL OperationalError in list_test_establishments: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database server is unavailable"
        )

# --- Inspections Test Endpoints (Relationship: Establishment -> Inspection) ---

@router.post("/inspections", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create_test_inspection(data: InspectionCreate, db: Session = Depends(get_db)):
    """Creates an inspection linked to an establishment (verifying foreign key constraints)."""
    try:
        # Verify establishment exists
        establishment = db.query(Establishment).filter(Establishment.id == data.establishment_id).first()
        if not establishment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Establishment with ID {data.establishment_id} not found"
            )

        inspection = Inspection(
            inspection_number=data.inspection_number,
            establishment_id=data.establishment_id,
            inspection_date=data.inspection_date,
            status=data.status,
            notes=data.notes,
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)
        return inspection
    except IntegrityError as e:
        db.rollback()
        logger.warning(f"Integrity error in create_test_inspection: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inspection with number '{data.inspection_number}' already exists or invalid reference"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error in create_test_inspection: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create inspection record"
        )

@router.get("/inspections", response_model=List[InspectionResponse])
def list_test_inspections(db: Session = Depends(get_db)):
    """Retrieves inspection records."""
    try:
        return db.query(Inspection).order_by(Inspection.id.desc()).all()
    except OperationalError as e:
        logger.error(f"MySQL OperationalError: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database server is unavailable"
        )

# --- Documents Test Endpoints (Relationship: Inspection -> Document) ---

@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_test_document(data: DocumentCreate, db: Session = Depends(get_db)):
    """Creates a document metadata record linked to an inspection."""
    try:
        inspection = db.query(Inspection).filter(Inspection.id == data.inspection_id).first()
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID {data.inspection_id} not found"
            )

        doc = Document(
            inspection_id=data.inspection_id,
            original_filename=data.original_filename,
            stored_filename=data.stored_filename,
            file_path=data.file_path,
            file_type=data.file_type,
            file_size=data.file_size,
            upload_status=data.upload_status,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid foreign key or document constraint violation"
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating test document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create document record"
        )

@router.get("/documents", response_model=List[DocumentResponse])
def list_test_documents(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieves document records with role filtering."""
    from app.services.document_service import DocumentService
    return DocumentService.get_all(db, user=current_user)

# --- System Settings Test Endpoints ---

@router.post("/settings", response_model=SystemSettingResponse, status_code=status.HTTP_201_CREATED)
def create_test_setting(data: SystemSettingCreate, db: Session = Depends(get_db)):
    """Creates or updates a system configuration setting."""
    try:
        setting = db.query(SystemSetting).filter(SystemSetting.setting_key == data.setting_key).first()
        if setting:
            setting.setting_value = data.setting_value
        else:
            setting = SystemSetting(setting_key=data.setting_key, setting_value=data.setting_value)
            db.add(setting)
        db.commit()
        db.refresh(setting)
        return setting
    except Exception as e:
        db.rollback()
        logger.error(f"Error setting config: {e}")
        raise HTTPException(status_code=500, detail="Failed to persist setting")

@router.get("/settings", response_model=List[SystemSettingResponse])
def list_test_settings(db: Session = Depends(get_db)):
    """Retrieves all system settings."""
    return db.query(SystemSetting).all()
