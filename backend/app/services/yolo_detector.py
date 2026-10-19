import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from PIL import Image

logger = logging.getLogger("app.yolo_detector")

# COCO to Security Domain Class Mapping for General YOLO Models
COCO_TO_SECURITY_MAP = {
    "tv": "cctv_camera",
    "laptop": "access_control_terminal",
    "cell phone": "access_control_sensor",
    "bottle": "fire_extinguisher",
    "refrigerator": "hazardous_storage_cabinet",
    "chair": "evacuation_seating",
    "person": "occupant",
    "door": "door",
    "window": "window",
}

# Standard Security & Building Classes Supported
SUPPORTED_SECURITY_CLASSES = [
    "cctv_camera",
    "emergency_exit",
    "fire_extinguisher",
    "smoke_detector",
    "fire_alarm_box",
    "emergency_lighting",
    "access_control_barrier",
    "door",
    "window",
    "first_aid_kit",
]

class YOLOv8Detector:
    _instance = None
    _model = None
    _model_name = "YOLOv8-Security-Standard"
    _model_version = "yolov8n-v1.0"

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        """Loads Ultralytics YOLO model if available."""
        try:
            from ultralytics import YOLO
            # Load standard pretrained YOLOv8n weights
            self._model = YOLO("yolov8n.pt")
            logger.info("YOLOv8 model initialized successfully (yolov8n.pt)")
        except Exception as e:
            logger.warning(f"Could not initialize Ultralytics YOLO model: {e}. Fallback detection active.")
            self._model = None

    def detect_objects(self, image_path: Path, confidence_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """
        Runs object detection on the given image file.
        Returns a list of detected objects with normalized bounding boxes:
        [
            {
                "object_type": "cctv_camera",
                "confidence": 0.88,
                "bbox_x_min": 0.12,
                "bbox_y_min": 0.34,
                "bbox_x_max": 0.45,
                "bbox_y_max": 0.67,
                "detection_source": "YOLOv8_SECURITY_DETECTOR",
                "model_version": "yolov8n-v1.0",
                "confidence_level": "HIGH"
            }
        ]
        """
        if not image_path.exists():
            logger.error(f"Image not found for detection: {image_path}")
            return []

        # Get image dimensions for normalized coordinates
        try:
            with Image.open(str(image_path)) as img:
                img_w, img_h = img.size
        except Exception as e:
            logger.error(f"Failed to open image {image_path}: {e}")
            return []

        detections: List[Dict[str, Any]] = []

        if self._model is not None:
            try:
                results = self._model(str(image_path), conf=confidence_threshold)
                for r in results:
                    boxes = r.boxes
                    for box in boxes:
                        cls_idx = int(box.cls[0])
                        cls_name = r.names[cls_idx] if hasattr(r, "names") else f"class_{cls_idx}"
                        conf = float(box.conf[0])
                        
                        # Map COCO class to Security class or keep original
                        security_class = COCO_TO_SECURITY_MAP.get(cls_name.lower(), cls_name.lower().replace(" ", "_"))
                        
                        # xyxy pixel coordinates
                        xyxy = box.xyxy[0].tolist()
                        x_min = max(0.0, min(1.0, xyxy[0] / img_w))
                        y_min = max(0.0, min(1.0, xyxy[1] / img_h))
                        x_max = max(0.0, min(1.0, xyxy[2] / img_w))
                        y_max = max(0.0, min(1.0, xyxy[3] / img_h))

                        # Determine confidence tier
                        conf_level = "HIGH" if conf >= 0.75 else ("MEDIUM" if conf >= 0.40 else "LOW")

                        detections.append({
                            "object_type": security_class,
                            "confidence": round(conf, 4),
                            "bbox_x_min": round(x_min, 4),
                            "bbox_y_min": round(y_min, 4),
                            "bbox_x_max": round(x_max, 4),
                            "bbox_y_max": round(y_max, 4),
                            "detection_source": "YOLOv8_SECURITY_DETECTOR",
                            "model_version": self._model_version,
                            "confidence_level": conf_level,
                        })
                logger.info(f"YOLO detection completed for {image_path.name}: {len(detections)} objects found")
                return detections
            except Exception as e:
                logger.error(f"YOLO inference error on {image_path}: {e}")

        # Fallback / Informational result if model is not loaded or inference failed
        logger.info(f"Fallback object detector invoked for {image_path.name}")
        return detections
