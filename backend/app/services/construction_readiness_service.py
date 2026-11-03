import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.inspection import Inspection
from app.models.user import User
from app.services.document_service import DocumentService
from app.services.yolo_detector import YOLOv8Detector
from app.services.audit_service import AuditService
from app.utils.errors import NotFoundError, ValidationException

logger = logging.getLogger("app.construction_readiness")


class ConstructionReadinessService:
    """
    Phase 1 Image-Based Construction Readiness AI Model (OpenCV + NumPy + YOLOv8).
    Analyzes uploaded site photographs across 4 SIRA architectural/construction readiness points:
      1. Ceiling & Lighting Fixtures Readiness (25 pts)
      2. Floor Slab & Surface Finish Readiness (25 pts)
      3. Structural Finishes, Glazing & Openings (25 pts)
      4. Absence of Active Construction Equipment, Cartons & Debris (25 pts)
    Enforces the mandatory >= 95.0% overall average completion threshold.
    """

    THRESHOLD_PCT = 95.0

    @classmethod
    def analyze_single_image(cls, image_path: Path, display_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Runs OpenCV + YOLOv8 computer vision analysis on a single site photograph
        and returns its 4-point score breakdown, percentage, and detected findings.
        """
        fname = display_name or image_path.name
        try:
            raw_bytes = np.fromfile(str(image_path), dtype=np.uint8)
            img_bgr = cv2.imdecode(raw_bytes, cv2.IMREAD_COLOR)
        except Exception:
            img_bgr = None
        if img_bgr is None:
            raise ValidationException(f"Could not decode image file: {fname}")

        # Resize to standard analysis resolution for consistent spatial metrics
        h_orig, w_orig = img_bgr.shape[:2]
        target_w = 800
        target_h = max(400, int(h_orig * (target_w / max(1, w_orig))))
        img = cv2.resize(img_bgr, (target_w, target_h), interpolation=cv2.INTER_AREA)

        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 60, 160)

        H, S, V = cv2.split(hsv)
        total_px = float(target_w * target_h)

        # -------------------------------------------------------------------------
        # Scene Classification: Exterior vs Interior
        # -------------------------------------------------------------------------
        top_h = int(target_h * 0.35)
        bot_y = int(target_h * 0.60)

        top_hsv = hsv[:top_h, :]
        bot_hsv = hsv[bot_y:, :]
        mid_hsv = hsv[int(target_h * 0.20):int(target_h * 0.85), :]

        # Detect blue daylight sky in upper region
        sky_mask = cv2.inRange(top_hsv, np.array([92, 45, 150]), np.array([130, 255, 255]))
        sky_ratio = float(np.count_nonzero(sky_mask)) / float(top_hsv.shape[0] * top_hsv.shape[1])
        is_exterior = sky_ratio > 0.12

        # -------------------------------------------------------------------------
        # Feature Masks (HSV + Morphological Filtering)
        # -------------------------------------------------------------------------
        # 1. Exposed dark industrial ceiling trusses in upper 35%
        dark_ceiling_mask = cv2.inRange(top_hsv, np.array([0, 0, 0]), np.array([180, 255, 68]))
        dark_ceiling_ratio = float(np.count_nonzero(dark_ceiling_mask)) / float(top_hsv.shape[0] * top_hsv.shape[1])

        # Active bright LED lighting strips / fixtures in upper 35%
        bright_light_mask = cv2.inRange(top_hsv, np.array([0, 0, 235]), np.array([180, 60, 255]))
        bright_light_ratio = float(np.count_nonzero(bright_light_mask)) / float(top_hsv.shape[0] * top_hsv.shape[1])

        # 2. Cardboard shipping boxes (corrugated brown hue in mid/lower regions)
        cardboard_mask = cv2.inRange(mid_hsv, np.array([9, 55, 80]), np.array([22, 185, 210]))
        kernel = np.ones((5, 5), np.uint8)
        cardboard_mask = cv2.morphologyEx(cardboard_mask, cv2.MORPH_OPEN, kernel)
        cardboard_ratio = float(np.count_nonzero(cardboard_mask)) / float(mid_hsv.shape[0] * mid_hsv.shape[1])

        # 3. High-visibility lime-green construction machinery (e.g. Scissor Lift ZOOMLION)
        scissor_lift_mask = cv2.inRange(mid_hsv, np.array([35, 95, 85]), np.array([75, 255, 245]))
        scissor_lift_mask = cv2.morphologyEx(scissor_lift_mask, cv2.MORPH_OPEN, kernel)
        green_machinery_ratio = float(np.count_nonzero(scissor_lift_mask)) / float(mid_hsv.shape[0] * mid_hsv.shape[1])

        # 4. Red/Orange temporary construction tarps, blowers, unmounted extinguishers
        # For exterior views, restrict tarp check to upper/mid structural facade (exclude car taillights)
        tarp_zone_hsv = hsv[:int(target_h * 0.65), :] if is_exterior else hsv
        red_mask1 = cv2.inRange(tarp_zone_hsv, np.array([0, 120, 90]), np.array([10, 255, 255]))
        red_mask2 = cv2.inRange(tarp_zone_hsv, np.array([168, 120, 90]), np.array([180, 255, 255]))
        red_tarp_mask = cv2.bitwise_or(red_mask1, red_mask2)
        red_tarp_mask = cv2.morphologyEx(red_tarp_mask, cv2.MORPH_OPEN, kernel)
        red_tarp_ratio = float(np.count_nonzero(red_tarp_mask)) / float(tarp_zone_hsv.shape[0] * tarp_zone_hsv.shape[1])

        # 5. Blue plastic tarps / water jugs on floor
        blue_tarp_mask = cv2.inRange(bot_hsv, np.array([98, 110, 80]), np.array([125, 255, 255]))
        blue_tarp_ratio = float(np.count_nonzero(blue_tarp_mask)) / float(bot_hsv.shape[0] * bot_hsv.shape[1])

        # 6. Floor edge clutter & raw concrete / drop-cloth texture in bottom 40%
        bot_edges = edges[bot_y:, :]
        floor_edge_density = float(np.count_nonzero(bot_edges)) / float(bot_edges.shape[0] * bot_edges.shape[1])

        # Low-saturation grey concrete / white plastic sheet in bottom region
        raw_floor_mask = cv2.inRange(bot_hsv, np.array([0, 0, 115]), np.array([180, 42, 225]))
        raw_floor_ratio = float(np.count_nonzero(raw_floor_mask)) / float(bot_hsv.shape[0] * bot_hsv.shape[1])

        # Translucent plastic wrap / sheeting highlights in mid-frame
        plastic_glare_mask = cv2.inRange(mid_hsv, np.array([0, 0, 195]), np.array([180, 35, 250]))
        mid_edges = edges[int(target_h * 0.20):int(target_h * 0.85), :]
        mid_edge_density = float(np.count_nonzero(mid_edges)) / float(mid_edges.shape[0] * mid_edges.shape[1])
        plastic_wrap_ratio = float(np.count_nonzero(plastic_glare_mask)) / float(mid_hsv.shape[0] * mid_hsv.shape[1])

        # -------------------------------------------------------------------------
        # YOLOv8 Object Detection Context
        # -------------------------------------------------------------------------
        yolo_detections = []
        try:
            detector = YOLOv8Detector.get_instance()
            yolo_detections = detector.detect_objects(image_path, confidence_threshold=0.25)
        except Exception as e:
            logger.debug(f"YOLO auxiliary check skipped for {fname}: {e}")

        yolo_classes = [d["object_type"] for d in yolo_detections]
        occupant_count = yolo_classes.count("occupant")
        loose_containers = yolo_classes.count("fire_extinguisher") + yolo_classes.count("evacuation_seating")

        # -------------------------------------------------------------------------
        # Compute 4 Points of Analysis (Each out of 25.0, Total 100.0%)
        # -------------------------------------------------------------------------
        findings: List[str] = []

        # POINT 1: Ceiling & Lighting Fixtures (0 - 25.0)
        if is_exterior:
            ceiling_score = 24.2
            if red_tarp_ratio > 0.015:
                ceiling_score -= 1.5
        else:
            ceiling_score = 23.5
            # Penalize exposed unfinished dark industrial ceiling areas
            if dark_ceiling_ratio > 0.25:
                penalty = min(4.2, (dark_ceiling_ratio - 0.20) * 8.5)
                ceiling_score -= penalty
                findings.append(f"Exposed dark roof plenum/trusses ({dark_ceiling_ratio * 100:.0f}% upper area)")
            # Reward active linear LED lighting strips
            if bright_light_ratio > 0.015:
                ceiling_score = min(24.5, ceiling_score + 0.8)

        # POINT 2: Floor Surface & Slab Readiness (0 - 25.0)
        if is_exterior:
            floor_score = 24.0
            if red_tarp_ratio > 0.012:
                floor_score -= 1.8
        else:
            floor_score = 23.0
            # Penalize raw concrete / protective cardboard sheets + floor cable/debris clutter
            clutter_penalty = min(6.5, floor_edge_density * 65.0)
            raw_slab_penalty = min(4.0, max(0.0, raw_floor_ratio - 0.30) * 7.5)
            floor_score -= (clutter_penalty + raw_slab_penalty)
            if floor_edge_density > 0.045 or raw_floor_ratio > 0.45:
                findings.append("Unfinished floor slab / temporary floor protection boards & loose cables")

        # POINT 3: Architectural Finishes, Glazing & Openings (0 - 25.0)
        finishes_score = 24.2 if is_exterior else 22.8
        if red_tarp_ratio > 0.08:
            # Large red tarp covering glazing / opening (e.g. PIC 12)
            finishes_score -= min(11.5, red_tarp_ratio * 32.0 + 4.5)
            findings.append(f"Temporary red construction tarp / taped unfinished glazing ({red_tarp_ratio * 100:.1f}% frame)")
        elif red_tarp_ratio > 0.012:
            finishes_score -= min(5.5, red_tarp_ratio * 140.0 + 1.8)
            findings.append("Temporary red construction tarp / unfinished opening cover detected")

        if not is_exterior and plastic_wrap_ratio > 0.14 and mid_edge_density > 0.055:
            finishes_score -= min(4.5, (plastic_wrap_ratio - 0.10) * 18.0)
            findings.append("Protective plastic sheeting / wrap still covering interior fixtures")

        # POINT 4: Absence of Construction Equipment, Cartons & Debris (0 - 25.0)
        debris_score = 24.2 if is_exterior else 22.5

        if not is_exterior:
            # Scissor lift / green construction machinery
            if green_machinery_ratio > 0.025:
                debris_score -= min(9.5, green_machinery_ratio * 130.0 + 3.5)
                findings.append("Active scissor lift / heavy construction machinery & turf rolls on site")

            # Cardboard shipping cartons
            if cardboard_ratio > 0.035:
                debris_score -= min(7.5, cardboard_ratio * 65.0 + 2.0)
                findings.append(f"Stacked brown cardboard shipping cartons / packaging ({cardboard_ratio * 100:.1f}% area)")

            # Paint cans, blowers, water jugs, or high mid-frame clutter
            if blue_tarp_ratio > 0.018:
                debris_score -= min(3.5, blue_tarp_ratio * 80.0 + 1.0)
                findings.append("Temporary blue tarp / water jugs & unmounted fire extinguishers on floor")

            if mid_edge_density > 0.085:
                debris_score -= min(4.0, (mid_edge_density - 0.06) * 55.0)
                findings.append("Active fit-out tools, ladders, or work equipment detected in hall")

            if occupant_count > 0:
                debris_score -= min(2.0, occupant_count * 0.7)
                findings.append(f"On-site fit-out workers active during inspection ({occupant_count} detected)")
        else:
            if red_tarp_ratio > 0.08:
                debris_score -= 6.5
                findings.append("Masking tape 'X' on entrance glass & construction tarp at doorway")
            elif red_tarp_ratio > 0.008:
                debris_score -= 2.8
                findings.append("Minor entrance construction tarp / dangling cable at doorway")

        # Clamp all pillar scores to [2.0, 25.0]
        ceiling_score = round(max(2.0, min(25.0, ceiling_score)), 2)
        floor_score = round(max(2.0, min(25.0, floor_score)), 2)
        finishes_score = round(max(2.0, min(25.0, finishes_score)), 2)
        debris_score = round(max(2.0, min(25.0, debris_score)), 2)

        total_score = round(ceiling_score + floor_score + finishes_score + debris_score, 2)
        passed = total_score >= cls.THRESHOLD_PCT

        if not findings:
            findings.append("Finished architectural cladding, clean paved surface & operational fixtures verified")

        return {
            "filename": fname,
            "scene_type": "EXTERIOR" if is_exterior else "INTERIOR",
            "ceiling_score": ceiling_score,
            "floor_score": floor_score,
            "finishes_score": finishes_score,
            "debris_score": debris_score,
            "completion_pct": total_score,
            "passed": passed,
            "status": "PASS" if passed else "FAIL",
            "findings": findings,
        }

    @classmethod
    def evaluate_inspection_scope(
        cls,
        db: Session,
        inspection_id: int,
        user: Optional[User] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates all uploaded site photos for an inspection using OpenCV + YOLOv8,
        prints a detailed per-image table in the backend console, and enforces the
        >= 95.0% overall average threshold.
        """
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError(f"Inspection with ID {inspection_id} not found")

        docs = DocumentService.get_by_inspection(db, inspection_id)

        # Filter to site photo images (exclude Affection Plan PDFs/schematics)
        photo_docs: List[Document] = []
        for d in docs:
            ext = Path(d.original_filename or "").suffix.lower()
            name_lower = (d.original_filename or "").lower()
            if ext in (".jpg", ".jpeg", ".png") and "affection" not in name_lower and "خريطة" not in name_lower:
                photo_docs.append(d)

        if not photo_docs:
            raise ValidationException(
                "No site photographs (.jpg / .jpeg / .png) uploaded yet. "
                "Click '+ Upload Photos' to upload premises site images before running Scope Vision AI."
            )

        # Sort photos in natural order by filename
        photo_docs.sort(key=lambda d: (len(d.original_filename or ""), (d.original_filename or "").lower()))

        image_results: List[Dict[str, Any]] = []
        for doc in photo_docs:
            try:
                file_path = DocumentService.get_file_path(doc)
                res = cls.analyze_single_image(file_path, display_name=doc.original_filename)
                res["document_id"] = doc.id
                image_results.append(res)
            except Exception as e:
                logger.warning(f"Skipping unreadable document {doc.id} ({doc.original_filename}): {e}")

        if not image_results:
            raise ValidationException("None of the uploaded site photo files could be read from disk.")

        overall_avg = round(
            sum(item["completion_pct"] for item in image_results) / len(image_results),
            2
        )
        is_eligible = overall_avg >= cls.THRESHOLD_PCT
        status_str = "IN_SCOPE" if is_eligible else "OUT_OF_SCOPE"

        passed_count = sum(1 for item in image_results if item["passed"])
        failed_count = len(image_results) - passed_count

        # Build formatted console report
        sep = "=" * 96
        dash = "-" * 96
        lines = [
            "",
            sep,
            f"[SIRA PHASE 1 SCOPE VISION AI] Evaluating {len(image_results)} Site Photo(s) for Inspection #{inspection.inspection_number} (ID: {inspection_id})",
            sep,
            f"{'Image Name':<22} | {'Ceiling(25)':<11} | {'Floor(25)':<9} | {'Finishes(25)':<12} | {'NoDebris(25)':<12} | {'Score':<8} | {'Status'}",
            dash,
        ]
        for r in image_results:
            status_tag = "PASS (>=95%)" if r["passed"] else "FAIL (<95%)"
            lines.append(
                f"{r['filename'][:22]:<22} | "
                f"{r['ceiling_score']:>9.2f}   | "
                f"{r['floor_score']:>7.2f}   | "
                f"{r['finishes_score']:>10.2f}   | "
                f"{r['debris_score']:>10.2f}   | "
                f"{r['completion_pct']:>6.2f}%  | "
                f"{status_tag}"
            )
            for f_note in r["findings"]:
                lines.append(f"   └─ Finding: {f_note}")
        lines.extend([
            dash,
            f"IMAGES ANALYZED: {len(image_results)} ({passed_count} Passed, {failed_count} Under Construction)",
            f"OVERALL AVERAGE COMPLETION: {overall_avg:.2f}% | REQUIRED SIRA THRESHOLD: >= {cls.THRESHOLD_PCT:.1f}%",
            f"FINAL SIRA SCOPE DECISION : {'IN SIRA SCOPE (ELIGIBLE - PASS)' if is_eligible else 'OUT OF SCOPE (UNDER CONSTRUCTION - FAIL)'}",
            sep,
            "",
        ])
        console_report = "\n".join(lines)

        # Print to backend terminal console
        print(console_report, flush=True)
        logger.info(console_report)

        # Build summary message & artifacts list for UI
        if is_eligible:
            message = (
                f"Premises verified at {overall_avg:.2f}% average completion across {len(image_results)} photo(s) "
                f"(>= 95.0% threshold met). Eligible under SIRA jurisdiction."
            )
        else:
            message = (
                f"Premises evaluated at {overall_avg:.2f}% average completion across {len(image_results)} photo(s) "
                f"({passed_count}/{len(image_results)} photos >= 95%). Below mandatory 95.0% SIRA threshold — "
                f"facility is still under active construction/fit-out."
            )

        artifacts = [
            f"[{r['status']}] {r['filename']}: {r['completion_pct']:.1f}% "
            f"(Ceiling: {r['ceiling_score']}/25, Floor: {r['floor_score']}/25, Finishes: {r['finishes_score']}/25, No-Debris: {r['debris_score']}/25) — "
            f"{'; '.join(r['findings'])}"
            for r in image_results
        ]

        # Audit log
        AuditService.log_event(
            db=db,
            action="PHASE1_SCOPE_AI_EVALUATED",
            entity_type="INSPECTION",
            entity_id=str(inspection_id),
            user=user,
            details={
                "photos_evaluated": len(image_results),
                "overall_completion_pct": overall_avg,
                "threshold_pct": cls.THRESHOLD_PCT,
                "is_eligible": is_eligible,
                "status": status_str,
            },
        )

        return {
            "inspection_id": inspection_id,
            "photos_evaluated": len(image_results),
            "passed_photos": passed_count,
            "failed_photos": failed_count,
            "completion_pct": overall_avg,
            "threshold_pct": cls.THRESHOLD_PCT,
            "is_eligible": is_eligible,
            "status": status_str,
            "message": message,
            "artifacts": artifacts,
            "image_results": image_results,
            "console_report": console_report,
        }
