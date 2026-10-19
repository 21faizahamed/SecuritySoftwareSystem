import os
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
from pypdf import PdfReader
from PIL import Image

from app.core.config import settings
from app.services.affection_plan_validator import AffectionPlanValidator

logger = logging.getLogger("app.document_processor")

class DocumentProcessor:
    @staticmethod
    def calculate_sha256(file_path: Path) -> str:
        """Calculates the SHA-256 hash of a file for integrity verification."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def process_pdf(file_path: Path) -> Tuple[str, int, str]:
        """
        Extracts text, page count, and determines OCR requirements for PDF files.
        Returns (extracted_text, page_count, status).
        """
        try:
            reader = PdfReader(str(file_path))
            page_count = len(reader.pages)
            extracted_pages = []
            
            for idx, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                if page_text.strip():
                    extracted_pages.append(f"--- Page {idx} ---\n{page_text.strip()}")
            
            full_text = "\n\n".join(extracted_pages)
            
            if full_text.strip():
                status = "PROCESSED"
                # Check if this document is an Affection Plan and run 4-pillar verification
                if any(k in file_path.name.lower() for k in ["affection", "site_plan", "site plan"]) or any(k in full_text for k in ["SITE PLAN", "خريطة الموقع", "Parcel ID", "الاستعمال"]):
                    val_res = AffectionPlanValidator.validate_document(file_path, raw_text=full_text)
                    summary_header = (
                        f"=== OFFICIAL DUBAI MUNICIPALITY AFFECTION PLAN 4-PILLAR VALIDATION ===\n"
                        f"Overall Status: {val_res['overall_status']} ({val_res['passed_checks_count']}/4 Criteria Satisfied)\n"
                        f"• Item 1 [Government Header]: {val_res['checks']['check_1_header']['status']} ({val_res['checks']['check_1_header']['detected_value']})\n"
                        f"• Item 2 [Land Use Field]: {val_res['checks']['check_2_landuse']['status']} ({val_res['checks']['check_2_landuse']['detected_value']})\n"
                        f"• Item 3 [Dubai Municipality Authority]: {val_res['checks']['check_3_municipality']['status']} ({val_res['checks']['check_3_municipality']['detected_value']})\n"
                        f"• Item 4 [Parcel ID & Electronic Stamp]: {val_res['checks']['check_4_parcel_stamp']['status']} (Parcel ID: {val_res['extracted_metadata']['parcel_id']}, Stamp: {val_res['extracted_metadata']['stamp_status']})\n"
                        f"=======================================================================\n\n"
                    )
                    full_text = summary_header + full_text
                logger.info(f"PDF processed successfully: {file_path.name}, {page_count} pages, {len(full_text)} chars extracted")
            else:
                status = "OCR_REQUIRED"
                full_text = "[Scanned Document: Text layer not found. OCR processing available.]"
                logger.info(f"PDF processed: {file_path.name} has no native text layer, marked OCR_REQUIRED")
                
            return full_text, page_count, status
        except Exception as e:
            logger.error(f"Failed to process PDF {file_path}: {e}")
            return f"Error extracting PDF text: {str(e)}", 1, "FAILED"

    @staticmethod
    def process_image(file_path: Path) -> Tuple[str, int, str]:
        """
        Validates and extracts metadata from image evidence.
        Returns (image_metadata_text, page_count, status).
        """
        try:
            with Image.open(str(file_path)) as img:
                width, height = img.size
                format_name = img.format
                mode = img.mode
                
                info = (
                    f"Image Evidence: {format_name} format, {width}x{height} pixels, "
                    f"Color Mode: {mode}, Prepared for AI Computer Vision detection."
                )
                logger.info(f"Image processed: {file_path.name} ({width}x{height}, {format_name})")
                return info, 1, "PROCESSED"
        except Exception as e:
            logger.error(f"Failed to process image {file_path}: {e}")
            return f"Error processing image: {str(e)}", 1, "FAILED"

    @staticmethod
    def process_file(file_path: Path, file_type: str) -> Tuple[str, int, str, str]:
        """
        Main entry point for processing any uploaded document or image evidence.
        Returns (extracted_text, page_count, upload_status, sha256_hash).
        """
        sha256 = DocumentProcessor.calculate_sha256(file_path)
        
        file_type_lower = file_type.lower()
        if "pdf" in file_type_lower or file_path.suffix.lower() == ".pdf":
            text, pages, status = DocumentProcessor.process_pdf(file_path)
        elif any(ext in file_type_lower or file_path.suffix.lower() == ext for ext in [".jpg", ".jpeg", ".png", "image"]):
            text, pages, status = DocumentProcessor.process_image(file_path)
        else:
            text = f"Unsupported file type for automated analysis: {file_type}"
            pages = 1
            status = "PROCESSED"
            
        return text, pages, status, sha256
