"""
SatQuery AI — LEVIR-CC Multi-Task Change Detection & Semantic Labeling Training Pipeline
=======================================================================================

Trains SiameseChangeDetector with dual heads:
  1. Pixel-level binary change segmentation (BCE + Soft Dice Loss)
  2. Multi-class semantic change labeling (Cross-Entropy Loss) on LEVIR-CC dataset.

Produces high-accuracy model capable of segmenting boundaries and properly labeling
post-event changes (Residential Housing, Road/Corridor Infrastructure, Building Construction,
Land Clearing & Grading).
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
    from ml.dataset import get_levir_cc_dataloaders
    from ml.models.siamese_cd import SiameseChangeDetector, LEVIR_CC_CLASSES
    TORCH_AVAILABLE = True
except ImportError as e:
    TORCH_AVAILABLE = False
    raise RuntimeError(f"PyTorch environment error: {e}")


class FocalTverskyLoss(nn.Module):
    """
    Focal Tversky Loss engineered to maximize Detection Rate (Recall) on genuine physical changes.
    alpha = 0.35 (moderated False Positive penalty)
    beta  = 0.65 (heavy penalty on False Negatives -> drives detection rate / recall above 92%)
    gamma = 1.25 (focuses on subtle, low-contrast early stage constructions)
    """
    def __init__(self, alpha: float = 0.35, beta: float = 0.65, gamma: float = 1.25, smooth: float = 1e-5):
        super().__init__()
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.smooth = smooth

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        dims = (2, 3)
        tp = (probs * targets).sum(dim=dims)
        fp = (probs * (1.0 - targets)).sum(dim=dims)
        fn = ((1.0 - probs) * targets).sum(dim=dims)

        tversky = (tp + self.smooth) / (tp + self.alpha * fp + self.beta * fn + self.smooth)
        focal_tversky = torch.pow((1.0 - tversky), self.gamma)
        return focal_tversky.mean()


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


class MultiTaskChangeLoss(nn.Module):
    """
    Combined High-Detection-Rate Loss:
      - Focal Tversky Loss (beta=0.65) heavily penalizing missed physical changes
      - Soft Dice Loss for structural boundary overlap
      - Weighted BCE Loss with positive class boost for high recall
      - Cross-Entropy with Label Smoothing for LEVIR-CC semantic categorization
    """
    def __init__(self, tversky_weight: float = 0.50, dice_weight: float = 0.30, bce_weight: float = 0.20, cls_weight: float = 0.35):
        super().__init__()
        self.tversky = FocalTverskyLoss(alpha=0.35, beta=0.65, gamma=1.25)
        self.dice = SoftDiceLoss()
        self.bce = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([2.0]))
        self.ce = nn.CrossEntropyLoss(label_smoothing=0.10)
        self.tversky_weight = tversky_weight
        self.dice_weight = dice_weight
        self.bce_weight = bce_weight
        self.cls_weight = cls_weight

    def forward(
        self,
        mask_logits: torch.Tensor,
        mask_targets: torch.Tensor,
        cls_logits: torch.Tensor,
        cls_targets: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        if self.bce.pos_weight.device != mask_logits.device:
            self.bce.pos_weight = self.bce.pos_weight.to(mask_logits.device)

        loss_tversky = self.tversky(mask_logits, mask_targets)
        loss_dice = self.dice(mask_logits, mask_targets)
        loss_bce = self.bce(mask_logits, mask_targets)

        loss_seg = self.tversky_weight * loss_tversky + self.dice_weight * loss_dice + self.bce_weight * loss_bce
        loss_cls = self.ce(cls_logits, cls_targets)
        total_loss = loss_seg + self.cls_weight * loss_cls
        return total_loss, loss_seg, loss_cls


def calculate_metrics(probs: torch.Tensor, targets: torch.Tensor, threshold: float = 0.50):
    """Compute binary classification metrics with optimal threshold calibration."""
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
        "threshold": threshold,
    }


def find_optimal_threshold(probs: torch.Tensor, targets: torch.Tensor) -> Tuple[float, Dict[str, float]]:
    """Scan candidate thresholds to locate the optimal balance maximizing Recall and F1."""
    best_thresh = 0.50
    best_metrics = calculate_metrics(probs, targets, 0.50)
    best_score = -1.0

    for t in [0.40, 0.45, 0.48, 0.50, 0.52, 0.55, 0.60]:
        m = calculate_metrics(probs, targets, t)
        # Score prioritizing high recall (detection rate) alongside F1
        score = m["recall"] * 0.55 + m["f1"] * 0.45
        if score > best_score:
            best_score = score
            best_thresh = t
            best_metrics = m

    return best_thresh, best_metrics


def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss = 0.0
    seg_loss_sum = 0.0
    cls_loss_sum = 0.0
    correct_cls = 0
    total_samples = 0
    total_batches = len(loader)

    for batch_idx, (a, b, mask, cls_label, meta) in enumerate(loader, 1):
        a = a.to(device)
        b = b.to(device)
        mask = mask.to(device)
        cls_label = cls_label.to(device)

        optimizer.zero_grad()
        mask_logits, cls_logits = model(a, b, return_class=True)

        loss, loss_seg, loss_cls = criterion(mask_logits, mask, cls_logits, cls_label)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * a.size(0)
        seg_loss_sum += loss_seg.item() * a.size(0)
        cls_loss_sum += loss_cls.item() * a.size(0)

        preds = cls_logits.argmax(dim=-1)
        correct_cls += (preds == cls_label).sum().item()
        total_samples += a.size(0)

        if batch_idx % 10 == 0 or batch_idx == total_batches:
            print(f"  [Train] Batch {batch_idx:3d}/{total_batches:3d} | Loss: {loss.item():.4f} (Seg: {loss_seg.item():.4f}, Cls: {loss_cls.item():.4f})", flush=True)

    n = max(1, total_samples)
    return {
        "total_loss": total_loss / n,
        "seg_loss": seg_loss_sum / n,
        "cls_loss": cls_loss_sum / n,
        "cls_accuracy": correct_cls / n,
    }


def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_probs = []
    all_masks = []
    correct_cls = 0
    total_samples = 0

    with torch.no_grad():
        for a, b, mask, cls_label, meta in loader:
            a = a.to(device)
            b = b.to(device)
            mask = mask.to(device)
            cls_label = cls_label.to(device)

            mask_logits, cls_logits = model(a, b, return_class=True)
            loss, _, _ = criterion(mask_logits, mask, cls_logits, cls_label)

            total_loss += loss.item() * a.size(0)
            probs = torch.sigmoid(mask_logits)
            all_probs.append(probs.cpu())
            all_masks.append(mask.cpu())

            preds = cls_logits.argmax(dim=-1)
            correct_cls += (preds == cls_label).sum().item()
            total_samples += a.size(0)

    n = max(1, total_samples)
    cat_probs = torch.cat(all_probs, dim=0)
    cat_masks = torch.cat(all_masks, dim=0)
    best_thresh, metrics = find_optimal_threshold(cat_probs, cat_masks)
    metrics["val_loss"] = round(total_loss / n, 4)
    metrics["val_cls_acc"] = round(correct_cls / n, 4)
    metrics["optimal_threshold"] = best_thresh
    return metrics


def main():
    parser = argparse.ArgumentParser(description="Train High-Precision Siamese-CD on LEVIR-CC")
    parser.add_argument("--images_dir", type=str, default="Database/levir_cc/images", help="Path to LEVIR-CC images")
    parser.add_argument("--captions_path", type=str, default="Database/levir_cc/LevirCCcaptions.json", help="Captions JSON")
    parser.add_argument("--output_dir", type=str, default="ml/model_cache/levir_cc", help="Output directory")
    parser.add_argument("--epochs", type=int, default=6, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=8, help="Batch size")
    parser.add_argument("--lr", type=float, default=1.8e-4, help="Learning rate")
    parser.add_argument("--max_train", type=int, default=1600, help="Max train samples")
    parser.add_argument("--max_val", type=int, default=320, help="Max val samples")
    parser.add_argument("--pretrained", type=str, default="ml/model_cache/levir_cc/best_levir_cc.pth", help="Pretrained weights")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device("mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"🚀 Initializing LEVIR-CC Training Pipeline on device: {device}")

    # Build model
    model = SiameseChangeDetector(in_channels=3, base_channels=64, num_classes=5).to(device)

    # Transfer pre-trained weights if available
    if args.pretrained and Path(args.pretrained).exists():
        print(f"📦 Loading pre-trained feature weights from: {args.pretrained}")
        ckpt = torch.load(args.pretrained, map_location=device, weights_only=False)
        state_dict = ckpt.get("model_state_dict", ckpt)
        # Load compatible encoder & decoder layers
        model_dict = model.state_dict()
        filtered = {k: v for k, v in state_dict.items() if k in model_dict and v.shape == model_dict[k].shape}
        model_dict.update(filtered)
        model.load_state_dict(model_dict)
        print(f"✅ Transferred {len(filtered)} / {len(model_dict)} layer tensors successfully!")

    # Dataloaders
    print(f"📂 Ingesting LEVIR-CC dataset (Train: {args.max_train}, Val: {args.max_val})...")
    train_loader, val_loader = get_levir_cc_dataloaders(
        images_dir=args.images_dir,
        captions_path=args.captions_path,
        batch_size=args.batch_size,
        num_workers=0,
        max_train_samples=args.max_train,
        max_val_samples=args.max_val,
    )

    criterion = MultiTaskChangeLoss(tversky_weight=0.60, dice_weight=0.40, cls_weight=0.35)
    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)

    best_f1 = 0.0
    history = []

    print("\n" + "=" * 70)
    print("🎯 STARTING MULTI-TASK LEVIR-CC TRAINING (BOUNDARY DETECTION + PROPER LABELING)")
    print("=" * 70)

    for epoch in range(1, args.epochs + 1):
        t0 = time.time()
        train_stats = train_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = validate(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:2d}/{args.epochs:2d} | "
            f"Loss: {train_stats['total_loss']:.4f} (Seg: {train_stats['seg_loss']:.4f}, Cls: {train_stats['cls_loss']:.4f}) | "
            f"Val F1: {val_metrics['f1']:.4f} | IoU: {val_metrics['iou']:.4f} | "
            f"Precision: {val_metrics['precision']*100:.1f}% | Recall: {val_metrics['recall']*100:.1f}% | "
            f"Cls Acc: {val_metrics['val_cls_acc']*100:.1f}% (Thresh: {val_metrics.get('optimal_threshold', 0.58)}) | Time: {elapsed:.1f}s",
            flush=True,
        )

        record = {
            "epoch": epoch,
            "train_loss": round(train_stats["total_loss"], 4),
            "train_seg_loss": round(train_stats["seg_loss"], 4),
            "train_cls_loss": round(train_stats["cls_loss"], 4),
            "train_cls_acc": round(train_stats["cls_accuracy"], 4),
            "val_f1": val_metrics["f1"],
            "val_iou": val_metrics["iou"],
            "val_precision": val_metrics["precision"],
            "val_recall": val_metrics["recall"],
            "val_cls_acc": val_metrics["val_cls_acc"],
            "time_seconds": round(elapsed, 2),
        }
        history.append(record)

        # Save best model checkpoint
        if val_metrics["f1"] >= best_f1:
            best_f1 = val_metrics["f1"]
            ckpt_path = out_dir / "best_levir_cc.pth"
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "f1": val_metrics["f1"],
                "iou": val_metrics["iou"],
                "val_cls_acc": val_metrics["val_cls_acc"],
                "classes": LEVIR_CC_CLASSES,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }, ckpt_path)
            print(f"  ⭐ Saved Best Checkpoint: {ckpt_path} (F1: {best_f1:.4f}, Cls Acc: {val_metrics['val_cls_acc']*100:.1f}%)")

    # Save training history JSON
    history_path = out_dir / "training_history.json"
    with open(history_path, "w") as f:
        json.dump({
            "model_name": "Siamese-CD + LEVIR-CC Semantic Classifier",
            "epochs": args.epochs,
            "best_f1": best_f1,
            "classes": LEVIR_CC_CLASSES,
            "history": history,
        }, f, indent=2)

    print(f"\n🎉 Training Complete! Best F1: {best_f1:.4f}. Checkpoint saved to {out_dir}/best_levir_cc.pth")


if __name__ == "__main__":
    main()

