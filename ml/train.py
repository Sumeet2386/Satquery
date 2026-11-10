"""
SatQuery AI — Model Training Pipeline for Change Detection
==========================================================

Trains a Siamese Change Detection neural network on LEVIR-CD bi-temporal satellite data.

Features:
  - BCE + Soft Dice Loss for class imbalance mitigation
  - Metric tracking: F1, IoU, Precision, Recall
  - Multi-device support: Apple Silicon (MPS), NVIDIA CUDA, or CPU
  - Best-model checkpointing and training history JSON export

Usage:
    python ml/train.py \
        --data_dir ./ml/data/LEVIR-CD/train \
        --output_dir ./ml/model_cache/siamese_cd \
        --epochs 20 \
        --batch_size 8 \
        --lr 1e-4
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import numpy as np
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.optim import AdamW
    from torch.optim.lr_scheduler import CosineAnnealingLR
    from ml.dataset import get_dataloaders
    from ml.models.siamese_cd import SiameseChangeDetector
    TORCH_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    IMPORT_ERR = str(e)
    # Stubs when running in an environment where PyTorch is not yet installed
    class _DummyModule:
        pass
    nn = type("nn", (), {"Module": _DummyModule})()


# ── Loss Functions ──────────────────────────────────────────────────────────

class SoftDiceLoss(nn.Module):
    """Soft Dice Loss for segmenting unbalanced binary masks."""
    def __init__(self, smooth: float = 1e-5):
        super().__init__()
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        num = 2 * (probs * targets).sum(dim=(2, 3)) + self.smooth
        den = (probs.pow(2) + targets.pow(2)).sum(dim=(2, 3)) + self.smooth
        dice = num / den
        return 1.0 - dice.mean()


class CompositeChangeLoss(nn.Module):
    """Balanced BCE + Dice loss."""
    def __init__(self, bce_weight: float = 0.5, dice_weight: float = 0.5):
        super().__init__()
        self.bce = nn.BCEWithLogitsLoss()
        self.dice = SoftDiceLoss()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        loss_bce = self.bce(logits, targets)
        loss_dice = self.dice(logits, targets)
        return self.bce_weight * loss_bce + self.dice_weight * loss_dice


# ── Metrics Helper ──────────────────────────────────────────────────────────

def calculate_metrics(probs: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5):
    """Compute binary classification metrics for change detection."""
    preds = (probs >= threshold).float()
    tp = (preds * targets).sum().item()
    fp = (preds * (1 - targets)).sum().item()
    fn = ((1 - preds) * targets).sum().item()

    precision = tp / (tp + fp + 1e-7)
    recall = tp / (tp + fn + 1e-7)
    f1 = 2 * (precision * recall) / (precision + recall + 1e-7)
    iou = tp / (tp + fp + fn + 1e-7)

    return {
        "f1": round(f1, 4),
        "iou": round(iou, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
    }


# ── Device Selection ────────────────────────────────────────────────────────

def select_device(preferred: str = "auto") -> torch.device:
    if preferred == "auto":
        if torch.cuda.is_available():
            dev = torch.device("cuda")
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            dev = torch.device("mps")
        else:
            dev = torch.device("cpu")
    else:
        dev = torch.device(preferred)
    return dev


# ── Training Engine ─────────────────────────────────────────────────────────

def train(args):
    if not TORCH_AVAILABLE:
        print(f"Error: PyTorch dependencies missing: {IMPORT_ERR}")
        print("Please install requirements: pip install torch torchvision pillow numpy")
        sys.exit(1)

    device = select_device(args.device)
    print(f"==================================================")
    print(f"  SatQuery AI — Change Detection Model Training   ")
    print(f"==================================================")
    print(f"Device:           {device}")
    print(f"Data directory:   {args.data_dir}")
    print(f"Output directory: {args.output_dir}")
    print(f"Batch size:       {args.batch_size}")
    print(f"Patch size:       {args.patch_size}x{args.patch_size}")
    print(f"Epochs:           {args.epochs}")
    print(f"Learning rate:    {args.lr}")
    print(f"==================================================")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Dataloaders
    print("Initializing dataset and patch generators...")
    train_loader, val_loader = get_dataloaders(
        data_dir=args.data_dir,
        batch_size=args.batch_size,
        patch_size=args.patch_size,
        val_ratio=args.val_ratio,
        num_workers=args.workers,
        max_samples=args.max_samples,
    )
    print(f"Train samples: {len(train_loader.dataset)} patches ({len(train_loader)} batches)")
    print(f"Val samples:   {len(val_loader.dataset)} patches ({len(val_loader)} batches)")

    # 2. Model, Loss, Optimizer
    model = SiameseChangeDetector(in_channels=3, base_channels=args.base_channels).to(device)
    criterion = CompositeChangeLoss()
    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_iou = 0.0
    history = []

    ckpt_filename = args.checkpoint_name or ("best_s2looking_cd.pth" if "s2looking" in str(args.data_dir).lower() else "best_siamese_cd.pth")
    checkpoint_path = output_dir / ckpt_filename
    start_epoch = 1

    if args.resume:
        resume_path = Path(args.resume_from) if args.resume_from else checkpoint_path
        if resume_path.exists():
            ckpt = torch.load(resume_path, map_location=device, weights_only=False)
            model.load_state_dict(ckpt["model_state_dict"])
            if "optimizer_state_dict" in ckpt:
                try:
                    optimizer.load_state_dict(ckpt["optimizer_state_dict"])
                except Exception:
                    pass
            best_iou = float(ckpt.get("best_iou", 0.0))
            start_epoch = int(ckpt.get("epoch", 0)) + 1
            print(f"Resumed from {resume_path} (epoch {start_epoch - 1}, best_iou={best_iou:.4f})")

    # 3. Training Loop
    for epoch in range(start_epoch, start_epoch + args.epochs):
        epoch_start = time.time()
        model.train()
        running_loss = 0.0

        for i, (img_a, img_b, masks, _) in enumerate(train_loader):
            img_a = img_a.to(device)
            img_b = img_b.to(device)
            masks = masks.to(device)

            optimizer.zero_grad()
            logits = model(img_a, img_b)
            loss = criterion(logits, masks)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

            if (i + 1) % args.log_interval == 0 or (i + 1) == len(train_loader):
                avg_l = running_loss / (i + 1)
                sys.stdout.write(f"\rEpoch [{epoch}/{start_epoch + args.epochs - 1}] Step [{i+1}/{len(train_loader)}] Loss: {avg_l:.4f}")
                sys.stdout.flush()

        epoch_loss = running_loss / len(train_loader)
        scheduler.step()

        # 4. Validation Loop
        model.eval()
        val_loss = 0.0
        all_probs, all_targets = [], []

        with torch.no_grad():
            for img_a, img_b, masks, _ in val_loader:
                img_a = img_a.to(device)
                img_b = img_b.to(device)
                masks = masks.to(device)

                logits = model(img_a, img_b)
                loss = criterion(logits, masks)
                val_loss += loss.item()

                probs = torch.sigmoid(logits).cpu()
                all_probs.append(probs)
                all_targets.append(masks.cpu())

        val_loss /= len(val_loader)
        probs_cat = torch.cat(all_probs, dim=0)
        targets_cat = torch.cat(all_targets, dim=0)
        metrics = calculate_metrics(probs_cat, targets_cat)

        epoch_time = time.time() - epoch_start
        total_epochs = start_epoch + args.epochs - 1
        print(f"\nEpoch {epoch:02d}/{total_epochs:02d} Finished in {epoch_time:.1f}s | "
              f"Train Loss: {epoch_loss:.4f} | Val Loss: {val_loss:.4f} | "
              f"Val IoU: {metrics['iou']:.4f} | Val F1: {metrics['f1']:.4f}")

        record = {
            "epoch": epoch,
            "train_loss": round(epoch_loss, 4),
            "val_loss": round(val_loss, 4),
            "metrics": metrics,
            "time_seconds": round(epoch_time, 1),
        }
        history.append(record)

        # 5. Checkpointing (only overwrite best checkpoint when Val IoU strictly improves)
        is_best = metrics["iou"] > best_iou
        if is_best:
            best_iou = metrics["iou"]
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "best_iou": best_iou,
                "metrics": metrics,
                "dataset": "S2Looking" if "s2looking" in str(args.data_dir).lower() else "LEVIR-CD",
                "config": {
                    "in_channels": 3,
                    "base_channels": args.base_channels,
                    "patch_size": args.patch_size,
                },
            }, checkpoint_path)
            print(f"  -> Saved model checkpoint (IoU: {metrics['iou']:.4f}, Best: {best_iou:.4f}) to {checkpoint_path}")

        # Save training metrics JSON
        with open(output_dir / "training_history.json", "w") as f:
            json.dump({
                "config": vars(args),
                "best_iou": best_iou,
                "history": history,
            }, f, indent=2)

    print(f"\n==================================================")
    print(f"Training Complete! Best Validation IoU: {best_iou:.4f}")
    print(f"Artifacts saved to: {output_dir}")
    print(f"==================================================")


def main():
    parser = argparse.ArgumentParser(description="SatQuery AI — Change Detection Model Training")
    parser.add_argument("--data_dir", type=str, default="./ml/data/S2Looking",
                        help="Path to dataset folder (e.g. ./ml/data/S2Looking or ./ml/data/LEVIR-CD/train)")
    parser.add_argument("--output_dir", type=str, default="./ml/model_cache/s2looking_cd",
                        help="Destination directory for model checkpoints and logs")
    parser.add_argument("--checkpoint_name", type=str, default=None,
                        help="Custom checkpoint filename (e.g. best_s2looking_cd.pth)")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size per step")
    parser.add_argument("--patch_size", type=int, default=256, help="Square crop patch dimension")
    parser.add_argument("--base_channels", type=int, default=32, help="Base feature dimension")
    parser.add_argument("--lr", type=float, default=2e-4, help="Initial learning rate")
    parser.add_argument("--val_ratio", type=float, default=0.15, help="Fraction of data reserved for validation")
    parser.add_argument("--workers", type=int, default=0, help="DataLoader subprocess workers (0 for macOS MPS)")
    parser.add_argument("--log_interval", type=int, default=10, help="Step interval for progress logging")
    parser.add_argument("--max_samples", type=int, default=None,
                        help="Optional limit on number of source images for testing/debugging")
    parser.add_argument("--device", type=str, default="auto", choices=["auto", "cpu", "cuda", "mps"],
                        help="Target acceleration device")
    parser.add_argument("--resume", action="store_true", help="Resume weights/best_iou from existing checkpoint")
    parser.add_argument("--resume_from", type=str, default=None, help="Explicit path to checkpoint when resuming")

    args = parser.parse_args()
    train(args)


if __name__ == "__main__":
    main()
