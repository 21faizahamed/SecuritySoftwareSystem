import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.requirement import RequirementCreate, RequirementUpdate, RequirementSearchMatch
from app.services.document_processor import DocumentProcessor
from app.services.audit_service import AuditService
from app.utils.errors import NotFoundError, ConflictError, ValidationException

logger = logging.getLogger("app.requirement_service")

# Official UAE Civil Defense Security & Prevention Standard Requirements Seed Data
DEFAULT_REGULATORY_REQUIREMENTS = [
    {
        "requirement_code": "REQ-SEC-CCTV-01",
        "category": "أنظمة المراقبة التلفزيونية (CCTV)",
        "title": "تركيب كاميرات المراقبة الأمنية على المداخل والمخارج والساحات",
        "description": "يجب تغطية كافة المداخل الرئيسية ومخارج الطوارئ ومواقف السيارات بكاميرات مراقبة رقمية عالية الدقة وتعمل على مدار 24 ساعة مع التسجيل المستمر لمدة لا تقل عن 31 يوماً.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "cctv_camera",
        "min_quantity": 4,
        "max_quantity": None,
        "unit": "كاميرات",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الثاني: الاشتراطات الأمنية للمنشآت - الفصل 4: أنظمة المراقبة التلفزيونية",
        "source_page": 42,
        "original_text": "مادة (14): تلتزم كافة المنشآت الخاضعة للتنظيم بتركيب منظومة مراقبة تلفزيونية متكاملة تغطي كافة نقاط الدخول والخروج ونقاط التجمع، مع وضوح الرؤية الليلية والتخزين الآمن للتسجيلات.",
    },
    {
        "requirement_code": "REQ-SEC-EXIT-01",
        "category": "مخارج الطوارئ ومسارات الهروب",
        "title": "توفير مخارج طوارئ خالية من العوائق ومزودة بأجهزة فتح هلع",
        "description": "يلزم توفير مخرجين للطوارئ على الأقل يفتحان باتجاه الهروب، مع خلو المسارات المؤدية إليهما من أي عوائق أو مواد قابلة للاشتعال.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "emergency_exit",
        "min_quantity": 2,
        "max_quantity": None,
        "unit": "مخارج",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الأول: متطلبات سبل الهروب - الفصل 2: مخارج الطوارئ",
        "source_page": 18,
        "original_text": "مادة (6): يجب أن تزود كافة الأدوار والممرات بمخارج طوارئ كافية طبقاً للحمل الإشغالي، وتفتح الأبواب للخارج وتعمل بمقابض دافعة مانعة للهلع panic hardware.",
    },
    {
        "requirement_code": "REQ-FIRE-EXT-01",
        "category": "أنظمة الإطفاء اليدوية",
        "title": "توزيع طفايات الحريق اليدوية المعتمدة طبقاً لمساحة المنشأة",
        "description": "توزيع طفايات حريق يدوية (بودرة كيميائية جافة / ثاني أكسيد الكربون) بمسافة انتقال لا تتجاوز 15 متراً بين كل طفاية وأخرى، مع الصيانة الدورية السارية.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "fire_extinguisher",
        "min_quantity": 4,
        "max_quantity": None,
        "unit": "طفايات",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الثالث: أنظمة الإطفاء ومكافحة الحريق - الفصل 1: الطفايات اليدوية",
        "source_page": 55,
        "original_text": "مادة (21): تركب مطافئ الحريق اليدوية على الحوائط بارتفاع لا يزيد عن 1.5 متر من مستوى الأرضية، وتكون صالحة للاستخدام ومفحوصة دورياً وفق المواصفات القياسية السعودية (SASO).",
    },
    {
        "requirement_code": "REQ-FIRE-SMK-01",
        "category": "أنظمة الإنذار والكشف المبكر",
        "title": "شبكة كواشف الدخان والحرارة المتصلة بلوحة التحكم المركزية",
        "description": "تركيب شبكة كواشف دخان آلية في جميع المكاتب والغرف والممرات متصلة بنظام إنذار صوتي ومرئي ولوحة تحكم معتمدة من الدفاع المدني.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "smoke_detector",
        "min_quantity": 6,
        "max_quantity": None,
        "unit": "كواشف",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الثالث: أنظمة الإطفاء ومكافحة الحريق - الفصل 2: أنظمة الإنذار الآلي",
        "source_page": 61,
        "original_text": "مادة (25): يلزم تزويد المبنى بنظام إنذار آلي لكشف الدخان والحرارة يغطي كامل المساحات المعرضة للمخاطر مع إمكانية إرسال إشارات إنذار فورية لغرفة المراقبة المركزية.",
    },
    {
        "requirement_code": "REQ-SEC-ACCS-01",
        "category": "أنظمة التحكم بالدخول والموانع الأمنية",
        "title": "بوابات وموانع أمنية إلكترونية لنقاط الدخول المصرح بها",
        "description": "تركيب بوابات تحكم بالدخول الإلكتروني (Access Control) لمنع دخول غير المصرح لهم إلى المناطق الإدارية والمرافق الحساسة.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "access_control_barrier",
        "min_quantity": 1,
        "max_quantity": None,
        "unit": "بوابات",
        "establishment_type": "Commercial",
        "severity": "HIGH",
        "is_mandatory": False,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الثاني: الاشتراطات الأمنية - الفصل 5: التحكم في المداخل",
        "source_page": 89,
        "original_text": "مادة (38): يجب تزويد المنشآت الحيوية والتجارية الكبرى بحواجز وبوابات إلكترونية لتنظيم تدفق الدخول والتحقق من الهويات.",
    },
    {
        "requirement_code": "REQ-FIRE-LGHT-01",
        "category": "إنارة الطوارئ واللوحات الإرشادية",
        "title": "كشافات إنارة الطوارئ واللوحات الإرشادية المضيئة لمسارات الخروج",
        "description": "توفير وحدات إنارة طوارئ تعمل ذاتياً ببطاريات احتياطية لمدة لا تقل عن 90 دقيقة عند انقطاع التيار الكهربائي مع لوحات خروج إرشادية مضيئة.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "emergency_lighting",
        "min_quantity": 2,
        "max_quantity": None,
        "unit": "كشافات",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الأول: تجهيزات السلامة - الفصل 3: إنارة الطوارئ واللوحات الإرشادية",
        "source_page": 24,
        "original_text": "مادة (11): تضاء مسارات الخروج ومخارج الطوارئ بوحدات إنارة طوارئ ذاتية التغذية ولوحات إرشادية واضحة الرؤية نهاراً وليلاً.",
    },
    {
        "requirement_code": "REQ-MED-AID-01",
        "category": "الإسعافات الأولية والسلامة العامة",
        "title": "توفير حقائب ومحطات الإسعافات الأولية المعتمدة",
        "description": "توفير حقيبة إسعافات أولية متكاملة في مكان واضح ومعلم بإشارة إرشادية مع تكليف مسعف معتمد داخل المنشأة.",
        "requirement_type": "MIN_QUANTITY",
        "target_object_type": "first_aid_kit",
        "min_quantity": 1,
        "max_quantity": None,
        "unit": "حقائب",
        "establishment_type": "ALL",
        "severity": "MEDIUM",
        "is_mandatory": False,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "الباب الخامس: متطلبات الصحة والسلامة المهنية - الفصل 1",
        "source_page": 104,
        "original_text": "مادة (45): يلتزم صاحب العمل بتوفير أدوات ومهمات الإسعاف الأولي اللازمة في كل موقع عمل وفق معايير الهلال الأحمر السعودي والدفاع المدني.",
    },
    {
        "requirement_code": "REQ-DOC-MAINT-01",
        "category": "الوثائق والشهادات النظامية",
        "title": "عقد وسجل الصيانة الدورية المعتمد لأنظمة السلامة ومكافحة الحريق",
        "description": "وجود عقد صيانة ساري المفعول مع شركة معتمدة من الدفاع المدني وسجل ورقي وإلكتروني لنتائج الفحص الدوري الربع سنوي.",
        "requirement_type": "DOCUMENTATION",
        "target_object_type": None,
        "min_quantity": 1,
        "max_quantity": None,
        "unit": "عقود",
        "establishment_type": "ALL",
        "severity": "MANDATORY",
        "is_mandatory": True,
        "source_document": "دليل نظم وقائية (2).pdf",
        "source_version": "v2024.1",
        "source_section": "اللائحة التنفيذية لنظام الدفاع المدني - المادة 12",
        "source_page": 8,
        "original_text": "مادة (12): تلتزم المنشآت بإبرام عقود صيانة دورية سارية مع مؤسسات مرخصة وتوثيق كافة تقارير الفحص الفني وتقديمها للمفتش المختص عند الطلب.",
    },
]

class RequirementService:
    @staticmethod
    def seed_default_regulatory_requirements(db: Session):
        """Seeds standard UAE Civil Defense regulatory requirements if not already present."""
        created_count = 0
        for item_data in DEFAULT_REGULATORY_REQUIREMENTS:
            code = item_data["requirement_code"]
            existing = db.query(Requirement).filter(Requirement.requirement_code == code).first()
            if not existing:
                req = Requirement(**item_data)
                db.add(req)
                created_count += 1
            else:
                # Update fields if needed to preserve latest official reference
                for key, val in item_data.items():
                    setattr(existing, key, val)

        db.commit()
        if created_count > 0:
            logger.info(f"Seeded {created_count} default regulatory requirements from 'دليل نظم وقائية (2).pdf'")

    @staticmethod
    def get_all(
        db: Session,
        category: Optional[str] = None,
        establishment_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> List[Requirement]:
        """Retrieves structured requirements with optional filtering."""
        query = db.query(Requirement)

        if category:
            query = query.filter(Requirement.category == category)
        if establishment_type and establishment_type != "ALL":
            query = query.filter(
                or_(
                    Requirement.establishment_type == "ALL",
                    Requirement.establishment_type.ilike(f"%{establishment_type}%")
                )
            )
        if is_active is not None:
            query = query.filter(Requirement.is_active == is_active)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Requirement.requirement_code.ilike(pattern),
                    Requirement.title.ilike(pattern),
                    Requirement.description.ilike(pattern),
                    Requirement.category.ilike(pattern),
                    Requirement.source_section.ilike(pattern),
                    Requirement.original_text.ilike(pattern),
                )
            )

        return query.order_by(Requirement.id.asc()).all()

    @staticmethod
    def get_by_id(db: Session, requirement_id: int) -> Requirement:
        """Retrieves a single requirement by ID."""
        req = db.query(Requirement).filter(Requirement.id == requirement_id).first()
        if not req:
            raise NotFoundError(f"Requirement with ID {requirement_id} not found")
        return req

    @staticmethod
    def get_by_code(db: Session, code: str) -> Requirement:
        """Retrieves requirement by code."""
        req = db.query(Requirement).filter(Requirement.requirement_code == code.upper().strip()).first()
        if not req:
            raise NotFoundError(f"Requirement with code '{code}' not found")
        return req

    @staticmethod
    def create(db: Session, data: RequirementCreate, user: Optional[User] = None) -> Requirement:
        """Creates a new regulatory requirement record."""
        existing = db.query(Requirement).filter(Requirement.requirement_code == data.requirement_code.strip()).first()
        if existing:
            raise ConflictError(f"Requirement with code '{data.requirement_code}' already exists")

        req = Requirement(**data.model_dump())
        db.add(req)
        db.commit()
        db.refresh(req)

        AuditService.log_event(
            db=db,
            action="REQUIREMENT_CREATE",
            entity_type="REQUIREMENT",
            entity_id=str(req.id),
            user=user,
            details={"code": req.requirement_code, "title": req.title}
        )

        return req

    @staticmethod
    def update(db: Session, requirement_id: int, data: RequirementUpdate, user: Optional[User] = None) -> Requirement:
        """Updates an existing requirement."""
        req = RequirementService.get_by_id(db, requirement_id)
        update_dict = data.model_dump(exclude_unset=True)

        for key, val in update_dict.items():
            setattr(req, key, val)

        db.commit()
        db.refresh(req)

        AuditService.log_event(
            db=db,
            action="REQUIREMENT_UPDATE",
            entity_type="REQUIREMENT",
            entity_id=str(req.id),
            user=user,
            details={"code": req.requirement_code, "updated_fields": list(update_dict.keys())}
        )

        return req

    @staticmethod
    def delete(db: Session, requirement_id: int, user: Optional[User] = None) -> bool:
        """Deletes a requirement record."""
        req = RequirementService.get_by_id(db, requirement_id)
        AuditService.log_event(
            db=db,
            action="REQUIREMENT_DELETE",
            entity_type="REQUIREMENT",
            entity_id=str(requirement_id),
            user=user,
            details={"code": req.requirement_code, "title": req.title}
        )
        db.delete(req)
        db.commit()
        return True

    @staticmethod
    def search_regulatory_clauses(db: Session, query: str) -> List[RequirementSearchMatch]:
        """
        Advanced Arabic & English Regulatory Search: matches regulatory clauses,
        source sections, and original text from 'دليل نظم وقائية'.
        """
        if not query or not query.strip():
            return []

        tokens = [t.strip() for t in query.split() if len(t.strip()) > 1]
        all_reqs = db.query(Requirement).filter(Requirement.is_active == True).all()

        matches: List[RequirementSearchMatch] = []
        for req in all_reqs:
            full_haystack = f"{req.title} {req.description} {req.category} {req.source_section or ''} {req.original_text or ''}".lower()
            score = 0.0
            matched_terms = []

            for t in tokens:
                t_lower = t.lower()
                if t_lower in full_haystack:
                    score += 1.0
                    matched_terms.append(t)

            if score > 0:
                normalized_score = min(1.0, score / max(1, len(tokens)))
                citation = f"المصدر: {req.source_document} ({req.source_section or 'عام'}, ص {req.source_page or 'N/A'})"
                matches.append(
                    RequirementSearchMatch(
                        requirement=req,
                        similarity_score=round(normalized_score, 2),
                        matched_term=", ".join(matched_terms),
                        source_citation=citation,
                    )
                )

        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        return matches

    @staticmethod
    def ingest_regulatory_pdf(
        db: Session,
        pdf_path: Path,
        document_title: str = "دليل نظم وقائية (2).pdf",
        user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Ingestion pipeline for official regulatory PDF documents:
        Extracts text, identifies regulatory articles/clauses, and stores them with source traceability.
        """
        extracted_text, page_count, status = DocumentProcessor.process_pdf(pdf_path)
        
        # Simple regulatory clause segmenter
        article_pattern = re.compile(r'(المادة\s+\(?\d+\)?|مادة\s+\(?\d+\)?|الباب\s+\S+|الفصل\s+\S+)', re.UNICODE)
        
        clauses_found = []
        lines = extracted_text.splitlines()
        current_article = "الاشتراطات العامة"
        current_buffer = []

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if article_pattern.search(line_str):
                if current_buffer:
                    clauses_found.append({
                        "section": current_article,
                        "text": " ".join(current_buffer),
                    })
                    current_buffer = []
                current_article = line_str
            else:
                current_buffer.append(line_str)

        if current_buffer:
            clauses_found.append({
                "section": current_article,
                "text": " ".join(current_buffer),
            })

        AuditService.log_event(
            db=db,
            action="REGULATORY_PDF_INGESTED",
            entity_type="REGULATION",
            entity_id=document_title,
            user=user,
            details={
                "document_title": document_title,
                "page_count": page_count,
                "clauses_detected": len(clauses_found),
                "status": status,
            }
        )

        return {
            "document_title": document_title,
            "page_count": page_count,
            "status": status,
            "total_clauses_extracted": len(clauses_found),
            "sample_clauses": clauses_found[:10],
        }
