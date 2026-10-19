import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from app.services.affection_plan_validator import AffectionPlanValidator

sample_pdf = Path(r"C:\Users\faiza\OneDrive\Desktop\COLLEGE\Senior Design\Drive\FW__Clarification_on_Registration_Type_–_ABRACADABRA_KIDS_AMUSEMENT_ARCADE_L.L.C--1580020_-_[#78862]\Affection Plan.pdf")

result = AffectionPlanValidator.validate_document(sample_pdf)

print("=== AFFECTION PLAN 4-PILLAR VALIDATION RESULT ===")
print("Is Approved:", result["is_approved"])
print(f"Score: {result['passed_checks_count']} / {result['total_required_checks']}")
print("Summary:", result["summary_message_en"])
print("-" * 60)
for k, v in result["checks"].items():
    print(f"[{v['status']}] {v['title_en']}")
    print(f"     Detected Value: {v['detected_value']}")
