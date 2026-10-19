"""
SIRA Phase 1 AI Training Pipeline: Construction Readiness & Scope Classifier
Senior Design Project — Security Certificate & Compliance Inspection System

Usage:
  python ai/train_construction_model.py --epochs 50 --imgsz 224
"""

import os
import argparse
from pathlib import Path

def setup_training_directories():
    base_dir = Path(__file__).resolve().parent / "dataset_construction"
    for split in ["train", "val"]:
        (base_dir / split / "under_construction").mkdir(parents=True, exist_ok=True)
        (base_dir / split / "completed_facility").mkdir(parents=True, exist_ok=True)
    
    print(f"Dataset directory structure ready at: {base_dir}")
    print("Place training photos in:")
    print(f"  - {base_dir / 'train' / 'under_construction'} (Building sites, scaffolding, exposed concrete)")
    print(f"  - {base_dir / 'train' / 'completed_facility'} (Finished operational buildings, shops, malls)")

def train(epochs=50, imgsz=224, batch=16):
    try:
        from ultralytics import YOLO
        import torch

        dataset_path = Path(__file__).resolve().parent / "dataset_construction"
        if not dataset_path.exists():
            setup_training_directories()

        print("Initializing YOLOv8 Classification Backbone...")
        model = YOLO("yolov8n-cls.pt")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Training on device: {device}")

        # Train model
        results = model.train(
            data=str(dataset_path),
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            device=device,
            name="sira_construction_classifier",
            project=str(Path(__file__).resolve().parent / "runs")
        )

        # Save production weights
        out_dir = Path(__file__).resolve().parent / "models"
        out_dir.mkdir(parents=True, exist_ok=True)
        export_path = out_dir / "construction_classifier.pt"
        
        best_weights = Path(results.save_dir) / "weights" / "best.pt"
        if best_weights.exists():
            import shutil
            shutil.copy(best_weights, export_path)
            print(f"Model saved successfully to: {export_path}")

    except ImportError:
        print("Ultralytics / PyTorch not installed. Run: pip install ultralytics torch torchvision")
    except Exception as e:
        print(f"Training error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SIRA Construction Readiness Classifier")
    parser.add_argument("--epochs", type=int, default=30, help="Number of training epochs")
    parser.add_argument("--imgsz", type=int, default=224, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--setup-only", action="store_true", help="Only setup dataset folder structure")
    args = parser.parse_args()

    if args.setup_only:
        setup_training_directories()
    else:
        train(epochs=args.epochs, imgsz=args.imgsz, batch=args.batch)
