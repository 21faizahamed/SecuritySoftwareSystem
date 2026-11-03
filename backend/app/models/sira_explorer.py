from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class SiraSourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_code = Column(String(80), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    issuing_authority = Column(String(255), nullable=False)
    resolution_number = Column(String(100), nullable=False)
    issue_date = Column(String(50), nullable=False)
    hijri_date = Column(String(80), nullable=True)
    file_name = Column(String(255), nullable=False)
    total_pages = Column(Integer, default=140, nullable=False)
    language_note = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    versions = relationship("SiraSourceVersion", back_populates="document", cascade="all, delete-orphan")
    pages = relationship("SiraSourcePage", back_populates="document", cascade="all, delete-orphan")


class SiraSourceVersion(Base):
    __tablename__ = "source_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False)
    version_tag = Column(String(50), nullable=False)
    effective_date = Column(String(50), nullable=False)
    is_current = Column(Boolean, default=True, nullable=False)
    extraction_status = Column(String(50), default="VERIFIED", nullable=False)
    pages_processed = Column(Integer, default=140, nullable=False)
    chapters_identified = Column(Integer, default=43, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    document = relationship("SiraSourceDocument", back_populates="versions")


class SiraSourcePage(Base):
    __tablename__ = "source_pages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_document_id = Column(Integer, ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False)
    pdf_page_number = Column(Integer, nullable=False, index=True)
    printed_page_number = Column(Integer, nullable=True)
    part_title = Column(String(150), nullable=True)
    chapter_title = Column(String(255), nullable=True)
    extracted_text = Column(Text, nullable=False)
    has_tables = Column(Boolean, default=True, nullable=False)
    extraction_status = Column(String(50), default="PROCESSED", nullable=False)

    document = relationship("SiraSourceDocument", back_populates="pages")


class SiraRegulatoryPart(Base):
    __tablename__ = "regulatory_parts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_code = Column(String(30), unique=True, nullable=False, index=True)
    part_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)

    chapters = relationship("SiraRegulatoryChapter", back_populates="part", cascade="all, delete-orphan")


class SiraRegulatoryChapter(Base):
    __tablename__ = "regulatory_chapters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    part_id = Column(Integer, ForeignKey("regulatory_parts.id", ondelete="CASCADE"), nullable=False)
    chapter_code = Column(String(50), unique=True, nullable=False, index=True)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)

    part = relationship("SiraRegulatoryPart", back_populates="chapters")


class SiraDefinition(Base):
    __tablename__ = "sira_definitions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sn = Column(Integer, nullable=False)
    term = Column(String(150), nullable=False, index=True)
    definition_text = Column(Text, nullable=False)
    simplified_explanation = Column(Text, nullable=True)
    category = Column(String(80), default="GENERAL", nullable=False)
    pdf_page = Column(Integer, default=6, nullable=False)
    printed_page = Column(Integer, default=6, nullable=False)


class SiraFieldOfViewType(Base):
    __tablename__ = "field_of_view_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fov_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    min_screen_percentage = Column(String(50), nullable=True)
    min_pixel_density_ppm = Column(String(80), nullable=True)
    horizontal_angle_limit = Column(String(100), nullable=True)
    vertical_angle_limit = Column(String(100), nullable=True)
    wdr_requirement = Column(String(150), nullable=True)
    exact_wording = Column(Text, nullable=False)
    remarks = Column(Text, nullable=True)
    pdf_page = Column(Integer, nullable=False)


class SiraEquipmentType(Base):
    __tablename__ = "equipment_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    equipment_code = Column(String(60), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    system_category = Column(String(80), nullable=False)  # VSS, ACCESS_CONTROL, ALARM, PHYSICAL, STAFFING,COMMUNICATION
    description = Column(Text, nullable=True)


class SiraLocationType(Base):
    __tablename__ = "location_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_code = Column(String(80), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    zone_category = Column(String(80), nullable=False)  # ENTRANCE, CORRIDOR, ELEVATOR, CASH_SAFE, STORAGE, PERIMETER, PARKING, SPECIAL


class SiraTechnicalStandard(Base):
    __tablename__ = "technical_standards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    standard_code = Column(String(60), unique=True, nullable=False, index=True)
    part_number = Column(Integer, nullable=False, index=True)  # 1 = Technical Specs, 2 = Operational Controls
    chapter_number = Column(Integer, nullable=False)
    chapter_title = Column(String(255), nullable=False)
    section_title = Column(String(255), nullable=False)
    sn = Column(Integer, nullable=False)
    technical_category = Column(String(100), nullable=False, index=True)
    equipment_or_system = Column(String(150), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    exact_wording = Column(Text, nullable=False)
    simplified_explanation = Column(Text, nullable=True)
    numeric_threshold = Column(String(100), nullable=True)
    unit_of_measurement = Column(String(60), nullable=True)
    conditions_and_exceptions = Column(Text, nullable=True)
    approval_requirement = Column(String(255), nullable=True)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    applicability_type = Column(String(50), default="MANDATORY", nullable=False)  # MANDATORY, CONDITIONAL, OPTIONAL, PROHIBITED
    pdf_page = Column(Integer, nullable=False, index=True)
    printed_page = Column(Integer, nullable=False)
    verification_status = Column(String(40), default="VERIFIED", nullable=False)


class SiraEstablishmentCategory(Base):
    __tablename__ = "establishment_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    chapter_number = Column(Integer, unique=True, nullable=False, index=True)
    chapter_title = Column(String(255), nullable=False)
    display_name = Column(String(200), nullable=False, index=True)
    industry_sector = Column(String(100), nullable=False, index=True)
    overview_text = Column(Text, nullable=False)
    covered_activities_note = Column(String(255), nullable=True)
    synonyms_json = Column(Text, nullable=True)  # JSON array of search synonyms
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)
    verification_status = Column(String(40), default="VERIFIED", nullable=False)

    subtypes = relationship("SiraEstablishmentSubtype", back_populates="category", cascade="all, delete-orphan")
    requirements = relationship("SiraSectorRequirement", back_populates="category", cascade="all, delete-orphan")


class SiraEstablishmentSubtype(Base):
    __tablename__ = "establishment_subtypes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("establishment_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    subtype_code = Column(String(100), unique=True, nullable=False, index=True)
    section_order = Column(String(40), nullable=True)  # e.g., "Second", "Third", "Fourth"
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    synonyms_json = Column(Text, nullable=True)
    start_page = Column(Integer, nullable=False)
    end_page = Column(Integer, nullable=False)

    category = relationship("SiraEstablishmentCategory", back_populates="subtypes")
    requirements = relationship("SiraSectorRequirement", back_populates="subtype", cascade="all, delete-orphan")


class SiraSectorRequirement(Base):
    __tablename__ = "sira_sector_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requirement_code = Column(String(80), unique=True, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("establishment_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    subtype_id = Column(Integer, ForeignKey("establishment_subtypes.id", ondelete="CASCADE"), nullable=True, index=True)

    section_group = Column(String(60), nullable=False, index=True)
    # CAMERA_PLACEMENT, ALARM_SYSTEM, ACCESS_CONTROL, OTHER_SECURITY, STAFFING_OPERATIONS, PHYSICAL_SECURITY,RETENTION_STORAGE, VEHICLE_SECURITY, PROHIBITION_CONDITION
    table_title = Column(String(255), nullable=False)
    sn = Column(Integer, nullable=False)

    area_or_location = Column(String(255), nullable=False, index=True)
    required_fov = Column(String(120), nullable=True, index=True)
    system_or_equipment = Column(String(150), nullable=False, index=True)

    exact_wording = Column(Text, nullable=False)
    simplified_explanation = Column(Text, nullable=True)
    remarks_and_conditions = Column(Text, nullable=True)
    approval_or_exception = Column(Text, nullable=True)

    applicability_type = Column(String(50), default="MANDATORY", nullable=False)
    # MANDATORY, CONDITIONAL, OPTIONAL_IF_CONDITION, EXEMPTED_IF_CONDITION, PRIOR_APPROVAL_REQUIRED
    condition_Trigger = Column(Text, nullable=True)

    source_part = Column(String(80), default="Part Three", nullable=False)
    source_chapter = Column(String(255), nullable=False)
    pdf_page = Column(Integer, nullable=False, index=True)
    printed_page = Column(Integer, nullable=False)
    verification_status = Column(String(40), default="VERIFIED", nullable=False)

    category = relationship("SiraEstablishmentCategory", back_populates="requirements")
    subtype = relationship("SiraEstablishmentSubtype", back_populates="requirements")
    conditions = relationship("SiraRequirementCondition", back_populates="requirement", cascade="all, delete-orphan")
    standard_links = relationship("SiraRequirementStandardLink", back_populates="requirement", cascade="all, delete-orphan")


class SiraRequirementCondition(Base):
    __tablename__ = "requirement_conditions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id = Column(Integer, ForeignKey("sira_sector_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_type = Column(String(60), nullable=False)  # OPERATING_HOURS, UNIT_COUNT_THRESHOLD, SAFE_PRESENCE, VALUABLE_THRESHOLD, PARKING_OWNERSHIP, BUILDING_INDEPENDENCE, ALTERNATIVE_CONTROL, SIRA_APPROVAL
    condition_text = Column(Text, nullable=False)
    effect_text = Column(Text, nullable=False)
    requires_prior_approval = Column(Boolean, default=False, nullable=False)
    pdf_page = Column(Integer, nullable=False)

    requirement = relationship("SiraSectorRequirement", back_populates="conditions")


class SiraApprovalException(Base):
    __tablename__ = "approvals_and_exceptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(60), unique=True, nullable=False)
    scope = Column(String(120), nullable=False)
    rule_category = Column(String(80), nullable=False)  # PRIOR_WRITTEN_APPROVAL, EXEMPTION_RULE, MAXIMUM_REQUIREMENT_RULE, AUTHORITY_ADDITIONAL_MEASURES
    title = Column(String(255), nullable=False)
    exact_wording = Column(Text, nullable=False)
    source_reference = Column(String(200), nullable=False)
    pdf_page = Column(Integer, nullable=False)


class SiraRequirementStandardLink(Base):
    __tablename__ = "requirement_standard_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    requirement_id = Column(Integer, ForeignKey("sira_sector_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    standard_code = Column(String(60), nullable=False, index=True)
    link_reason = Column(String(255), nullable=False)

    requirement = relationship("SiraSectorRequirement", back_populates="standard_links")


class SiraSourceCitation(Base):
    __tablename__ = "source_citations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False, index=True)  # REQUIREMENT, STANDARD, DEFINITION, CHAPTER
    entity_code = Column(String(80), nullable=False, index=True)
    part_name = Column(String(100), nullable=False)
    chapter_name = Column(String(255), nullable=False)
    section_name = Column(String(255), nullable=True)
    table_name = Column(String(255), nullable=True)
    row_sn = Column(String(30), nullable=True)
    pdf_page = Column(Integer, nullable=False)
    printed_page = Column(Integer, nullable=False)
    excerpt = Column(Text, nullable=True)


class SiraExtractionReviewRecord(Base):
    __tablename__ = "extraction_review_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_code = Column(String(80), unique=True, nullable=False)
    target_reference = Column(String(200), nullable=False)
    pdf_page = Column(Integer, nullable=False)
    issue_type = Column(String(80), nullable=False)  # EXTERNAL_ANNEX_REFERENCE, TRANSLATION_TERMINOLOGY, CONDITIONAL_INTERPRETATION, OCR_VERIFIED
    original_extracted_text = Column(Text, nullable=False)
    review_note = Column(Text, nullable=False)
    status = Column(String(50), default="NEEDS_VERIFICATION", nullable=False)
    reviewed_by = Column(String(100), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class SiraComplianceProject(Base):
    __tablename__ = "compliance_projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_code = Column(String(60), unique=True, nullable=False, index=True)
    project_name = Column(String(255), nullable=False)
    client_or_entity_name = Column(String(255), nullable=True)
    trade_license_no = Column(String(100), nullable=True)
    category_slug = Column(String(100), nullable=False, index=True)
    subtype_code = Column(String(100), nullable=True, index=True)
    facility_operating_hours = Column(String(50), default="24/7", nullable=False)
    has_on_site_safe = Column(Boolean, default=True, nullable=False)
    residential_units_count = Column(Integer, nullable=True)
    has_private_parking = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="IN_PROGRESS", nullable=False)
    lead_assessor = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship("SiraProjectRequirement", back_populates="project", cascade="all, delete-orphan")
    history = relationship("SiraChangeHistory", back_populates="project", cascade="all, delete-orphan")


class SiraProjectRequirement(Base):
    __tablename__ = "project_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("compliance_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_code = Column(String(80), nullable=False, index=True)
    requirement_source_type = Column(String(40), default="SECTOR", nullable=False)  # SECTOR or TECHNICAL_STANDARD
    section_group = Column(String(60), nullable=False)
    area_or_title = Column(String(255), nullable=False)
    required_fov_or_threshold = Column(String(150), nullable=True)
    exact_wording = Column(Text, nullable=False)
    remarks_and_conditions = Column(Text, nullable=True)
    applicability_type = Column(String(50), default="MANDATORY", nullable=False)
    source_citation_text = Column(String(255), nullable=False)
    pdf_page = Column(Integer, nullable=False)

    # Assessment fields
    compliance_status = Column(String(40), default="NOT_ASSESSED", nullable=False)
    # NOT_ASSESSED, COMPLIANT, NON_COMPLIANT, NOT_APPLICABLE, PENDING_VERIFICATION
    not_applicable_explanation = Column(Text, nullable=True)
    assessor_notes = Column(Text, nullable=True)
    evidence_reference = Column(String(255), nullable=True)
    responsible_person = Column(String(150), nullable=True)
    reviewer_name = Column(String(150), nullable=True)
    review_date = Column(String(50), nullable=True)
    follow_up_action = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    project = relationship("SiraComplianceProject", back_populates="items")
    evidences = relationship("SiraComplianceEvidence", back_populates="project_requirement", cascade="all, delete-orphan")


class SiraComplianceEvidence(Base):
    __tablename__ = "compliance_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_requirement_id = Column(Integer, ForeignKey("project_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    document_title = Column(String(255), nullable=False)
    file_or_url_ref = Column(String(255), nullable=False)
    uploaded_by = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    project_requirement = relationship("SiraProjectRequirement", back_populates="evidences")


class SiraChangeHistory(Base):
    __tablename__ = "change_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("compliance_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_code = Column(String(80), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(String(150), nullable=False)
    change_summary = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    project = relationship("SiraComplianceProject", back_populates="history")
