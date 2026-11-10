"""SatQuery AI — Satellite Change Detection Dataset Loader and Patch Generator.

Supports both LEVIR-CD and S2Looking bi-temporal satellite datasets:
  - S2Looking: Image1/ (T1), Image2/ (T2), label/ (binary mask, 255 = change),
               label1/ (newly built), label2/ (demolished)
  - LEVIR-CD:  A/ (T1), B/ (T2), label/ (binary mask)

Features:
  1. Automated 1024x1024 -> 256x256 grid patch extraction (yielding 16 patches per image)
  2. Multi-temporal data augmentation (random flips, 90-degree rotations)
  3. Predefined split detection (train/val/test) or deterministic ratio-based splitting
  4. Fast PyTorch Tensor conversion with ImageNet normalization
"""

from __future__ import annotations

import os
from collections import OrderedDict
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple, Union
import random
import json

try:
    import numpy as np
    import torch
    from torch.utils.data import Dataset
    from PIL import Image
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    class Dataset:
        pass


class ChangeDetectionDataset(Dataset):
    """
    Unified PyTorch Dataset for satellite building change detection (S2Looking & LEVIR-CD).

    Each sample returns:
      - tensor_a: Tensor [3, H, W] - Earlier satellite image (T1)
      - tensor_b: Tensor [3, H, W] - Later satellite image (T2)
      - tensor_l: Tensor [1, H, W] - Binary ground-truth change mask (0.0 or 1.0)
      - meta:     Dict with sample identifiers and crop coordinates
    """

    def __init__(
        self,
        data_dir: Union[str, Path],
        patch_size: int = 256,
        split: str = "train",
        val_ratio: float = 0.15,
        augment: bool = True,
        seed: int = 42,
        max_samples: Optional[int] = None,
        max_cache_images: int = 256,
    ):
        super().__init__()
        self.data_dir = Path(data_dir)
        self.patch_size = patch_size
        self.split = split
        self.augment = augment and (split == "train")
        self.max_cache_images = max(0, int(max_cache_images))
        self._image_cache: "OrderedDict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]" = OrderedDict()

        # Check if data_dir contains explicit split subfolders (e.g. data_dir/train/)
        effective_dir = self.data_dir
        if (self.data_dir / split).exists():
            effective_dir = self.data_dir / split
        elif split == "val" and not (self.data_dir / "val").exists() and (self.data_dir / "train").exists():
            # If requesting val but only train exists at parent level
            effective_dir = self.data_dir / "train"

        # Auto-detect T1, T2, label directory names
        # S2Looking: Image1, Image2, label
        # LEVIR-CD:  A, B, label
        if (effective_dir / "Image1").exists() and (effective_dir / "Image2").exists():
            self.dir_a = effective_dir / "Image1"
            self.dir_b = effective_dir / "Image2"
            self.format_type = "s2looking"
        elif (effective_dir / "A").exists() and (effective_dir / "B").exists():
            self.dir_a = effective_dir / "A"
            self.dir_b = effective_dir / "B"
            self.format_type = "levircd"
        elif (self.data_dir / "train" / "Image1").exists():
            effective_dir = self.data_dir / split if (self.data_dir / split).exists() else self.data_dir / "train"
            self.dir_a = effective_dir / "Image1"
            self.dir_b = effective_dir / "Image2"
            self.format_type = "s2looking"
        elif (self.data_dir / "train" / "A").exists():
            effective_dir = self.data_dir / split if (self.data_dir / split).exists() else self.data_dir / "train"
            self.dir_a = effective_dir / "A"
            self.dir_b = effective_dir / "B"
            self.format_type = "levircd"
        else:
            raise FileNotFoundError(
                f"Could not find valid T1/T2 subdirectories (either 'Image1'/'Image2' or 'A'/'B') in {self.data_dir}"
            )

        self.dir_l = effective_dir / "label"
        if not self.dir_l.exists():
            raise FileNotFoundError(f"Label directory not found at {self.dir_l}")

        # Collect and match all image pairs
        filenames = sorted([f.name for f in self.dir_a.glob("*.png")])
        if not filenames:
            filenames = sorted([f.name for f in self.dir_a.glob("*.tif*")])
        if not filenames:
            filenames = sorted([f.name for f in self.dir_a.glob("*.jpg")])

        if not filenames:
            raise FileNotFoundError(f"No image files found in {self.dir_a}")

        # If data_dir has separate train/val directories, we don't need synthetic splitting
        has_predefined_split = (self.data_dir / "train").exists() and (self.data_dir / "val").exists()

        if has_predefined_split and effective_dir.name in ["train", "val", "test"]:
            selected_files = filenames
        else:
            # Deterministic ratio-based split
            rng = random.Random(seed)
            shuffled = list(filenames)
            rng.shuffle(shuffled)
            val_count = int(len(shuffled) * val_ratio)
            if split == "train":
                selected_files = shuffled[val_count:]
            else:
                selected_files = shuffled[:val_count]

        if max_samples:
            selected_files = selected_files[:max_samples]

        self.filenames = selected_files

        # Compute patch grid per 1024x1024 image
        # e.g., 1024 // 256 = 4 rows, 4 cols = 16 patches per image
        self.patches: List[Tuple[str, int, int]] = []
        for fname in self.filenames:
            for r in range(0, 1024, patch_size):
                for c in range(0, 1024, patch_size):
                    self.patches.append((fname, r, c))

    def __len__(self) -> int:
        return len(self.patches)

    def _load_image_triple(self, fname: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Load and optionally LRU-cache decoded uint8 RGB/mask arrays to avoid 16x PNG re-decoding per epoch."""
        if self.max_cache_images > 0 and fname in self._image_cache:
            self._image_cache.move_to_end(fname)
            return self._image_cache[fname]

        path_a = self.dir_a / fname
        path_b = self.dir_b / fname
        path_l = self.dir_l / fname

        with Image.open(path_a) as img_a, Image.open(path_b) as img_b, Image.open(path_l) as mask:
            arr_a_full = np.asarray(img_a.convert("RGB"), dtype=np.uint8)
            arr_b_full = np.asarray(img_b.convert("RGB"), dtype=np.uint8)
            arr_l_full = (np.asarray(mask.convert("L"), dtype=np.uint8) > 127).astype(np.uint8)

        triple = (arr_a_full, arr_b_full, arr_l_full)
        if self.max_cache_images > 0:
            self._image_cache[fname] = triple
            if len(self._image_cache) > self.max_cache_images:
                self._image_cache.popitem(last=False)
        return triple

    def __getitem__(self, idx: int):
        fname, top, left = self.patches[idx]
        p_size = self.patch_size

        arr_a_full, arr_b_full, arr_l_full = self._load_image_triple(fname)

        # Slice patch cleanly in NumPy without re-decoding PNGs
        arr_a = arr_a_full[top:top + p_size, left:left + p_size].astype(np.float32) / 255.0
        arr_b = arr_b_full[top:top + p_size, left:left + p_size].astype(np.float32) / 255.0
        arr_l = arr_l_full[top:top + p_size, left:left + p_size].astype(np.float32)

        # Synchronous data augmentation across A, B, and Mask
        if self.augment:
            # Random horizontal flip
            if random.random() > 0.5:
                arr_a = np.fliplr(arr_a)
                arr_b = np.fliplr(arr_b)
                arr_l = np.fliplr(arr_l)

            # Random vertical flip
            if random.random() > 0.5:
                arr_a = np.flipud(arr_a)
                arr_b = np.flipud(arr_b)
                arr_l = np.flipud(arr_l)

            # Random 90 deg rotation
            rot_k = random.choice([0, 1, 2, 3])
            if rot_k > 0:
                arr_a = np.rot90(arr_a, k=rot_k)
                arr_b = np.rot90(arr_b, k=rot_k)
                arr_l = np.rot90(arr_l, k=rot_k)

        # Convert to Channel-First PyTorch Tensors [C, H, W]
        tensor_a = torch.from_numpy(arr_a.transpose(2, 0, 1).copy()).float()
        tensor_b = torch.from_numpy(arr_b.transpose(2, 0, 1).copy()).float()
        tensor_l = torch.from_numpy(arr_l[np.newaxis, :, :].copy()).float()

        # Standard ImageNet normalization
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        tensor_a = (tensor_a - mean) / std
        tensor_b = (tensor_b - mean) / std

        meta = {
            "filename": fname,
            "crop": (top, left, p_size, p_size),
            "format": self.format_type,
        }

        return tensor_a, tensor_b, tensor_l, meta


# Aliases for backwards compatibility and clarity
LEVIRCDDataset = ChangeDetectionDataset
S2LookingDataset = ChangeDetectionDataset


def get_dataloaders(
    data_dir: str,
    batch_size: int = 8,
    patch_size: int = 256,
    num_workers: int = 2,
    val_ratio: float = 0.15,
    max_samples: Optional[int] = None,
    dataset_type: str = "auto",
):
    """Factory creating paired train and validation dataloaders for S2Looking or LEVIR-CD."""
    from torch.utils.data import DataLoader

    p_data = Path(data_dir)

    # Determine train and val directories
    if (p_data / "train").exists() and (p_data / "val").exists():
        train_dir = p_data / "train"
        val_dir = p_data / "val"
        train_ds = ChangeDetectionDataset(
            data_dir=train_dir,
            patch_size=patch_size,
            split="train",
            val_ratio=val_ratio,
            augment=True,
            max_samples=max_samples,
        )
        val_ds = ChangeDetectionDataset(
            data_dir=val_dir,
            patch_size=patch_size,
            split="val",
            val_ratio=val_ratio,
            augment=False,
            max_samples=max_samples // 4 if max_samples else None,
        )
    else:
        train_ds = ChangeDetectionDataset(
            data_dir=p_data,
            patch_size=patch_size,
            split="train",
            val_ratio=val_ratio,
            augment=True,
            max_samples=max_samples,
        )
        val_ds = ChangeDetectionDataset(
            data_dir=p_data,
            patch_size=patch_size,
            split="val",
            val_ratio=val_ratio,
            augment=False,
            max_samples=max_samples,
        )

    use_pin = torch.cuda.is_available()

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=use_pin,
        drop_last=True,
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=use_pin,
    )

    return train_loader, val_loader


class LevirCCDataset(Dataset):
    """
    LEVIR-CC Dataset for Multi-Task Change Detection and Semantic Change Labeling.
    Combines bi-temporal images A (Pre-Event) and B (Post-Event) with natural language
    change captions and multi-class structural change labels.
    """
    def __init__(
        self,
        images_dir: Union[str, Path],
        captions_path: Union[str, Path],
        split: str = "train",
        augment: bool = True,
        max_samples: Optional[int] = None,
    ):
        super().__init__()
        self.images_dir = Path(images_dir)
        self.split = split
        self.augment = augment and (split == "train")

        dir_a = self.images_dir / split / "A"
        dir_b = self.images_dir / split / "B"
        if not dir_a.exists():
            dir_a = self.images_dir / "A"
            dir_b = self.images_dir / "B"

        self.dir_a = dir_a
        self.dir_b = dir_b

        with open(captions_path, "r") as f:
            captions_data = json.load(f)

        self.samples = []
        for img_entry in captions_data.get("images", []):
            if img_entry.get("split") == split or split == "all":
                fname = img_entry.get("filename")
                if (self.dir_a / fname).exists() and (self.dir_b / fname).exists():
                    changeflag = img_entry.get("changeflag", 0)
                    sentences = [s.get("raw", "").strip() for s in img_entry.get("sentences", [])]
                    full_text = " ".join(sentences).lower()

                    if changeflag == 0:
                        class_label = 0
                        category = "No Change / Identical Scene"
                    elif any(w in full_text for w in ["road", "lane", "path", "street"]):
                        class_label = 2
                        category = "Road & Corridor Infrastructure"
                    elif any(w in full_text for w in ["house", "villa", "residential"]):
                        class_label = 1
                        category = "Residential Housing & Houses"
                    elif any(w in full_text for w in ["commercial", "industrial", "warehouse", "factory"]):
                        class_label = 3
                        category = "Building Construction & Additions"
                    elif any(w in full_text for w in ["bareland", "cleared", "ground", "grading"]):
                        class_label = 4
                        category = "Land Clearing & Foundation Grading"
                    else:
                        class_label = 3
                        category = "Building Construction & Additions"

                    self.samples.append({
                        "filename": fname,
                        "changeflag": changeflag,
                        "class_label": class_label,
                        "category": category,
                        "caption": sentences[0] if sentences else "",
                    })

        if max_samples:
            self.samples = self.samples[:max_samples]

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        sample = self.samples[idx]
        fname = sample["filename"]

        path_a = self.dir_a / fname
        path_b = self.dir_b / fname

        img_a = Image.open(path_a).convert("RGB")
        img_b = Image.open(path_b).convert("RGB")

        arr_a = np.array(img_a, dtype=np.float32) / 255.0
        arr_b = np.array(img_b, dtype=np.float32) / 255.0

        if sample["changeflag"] == 0:
            arr_l = np.zeros((256, 256), dtype=np.float32)
        else:
            lum_a = 0.299 * arr_a[:, :, 0] + 0.587 * arr_a[:, :, 1] + 0.114 * arr_a[:, :, 2]
            lum_b = 0.299 * arr_b[:, :, 0] + 0.587 * arr_b[:, :, 1] + 0.114 * arr_b[:, :, 2]
            lum_diff = np.abs(lum_a - lum_b)
            color_diff = np.sqrt(np.sum((arr_a - arr_b) ** 2, axis=-1)) / 1.732
            score = 0.6 * color_diff + 0.4 * lum_diff
            arr_l = (score > 0.16).astype(np.float32)

        if self.augment:
            if random.random() > 0.5:
                arr_a = np.fliplr(arr_a)
                arr_b = np.fliplr(arr_b)
                arr_l = np.fliplr(arr_l)
            if random.random() > 0.5:
                arr_a = np.flipud(arr_a)
                arr_b = np.flipud(arr_b)
                arr_l = np.flipud(arr_l)
            rot = random.choice([0, 1, 2, 3])
            if rot > 0:
                arr_a = np.rot90(arr_a, k=rot)
                arr_b = np.rot90(arr_b, k=rot)
                arr_l = np.rot90(arr_l, k=rot)

        tensor_a = torch.from_numpy(arr_a.transpose(2, 0, 1).copy()).float()
        tensor_b = torch.from_numpy(arr_b.transpose(2, 0, 1).copy()).float()
        tensor_l = torch.from_numpy(arr_l[np.newaxis, :, :].copy()).float()

        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        tensor_a = (tensor_a - mean) / std
        tensor_b = (tensor_b - mean) / std

        class_tensor = torch.tensor(sample["class_label"], dtype=torch.long)

        meta = {
            "filename": fname,
            "category": sample["category"],
            "caption": sample["caption"],
            "changeflag": sample["changeflag"],
        }

        return tensor_a, tensor_b, tensor_l, class_tensor, meta


def get_levir_cc_dataloaders(
    images_dir: str,
    captions_path: str,
    batch_size: int = 8,
    num_workers: int = 2,
    max_train_samples: Optional[int] = 1000,
    max_val_samples: Optional[int] = 200,
):
    """Creates train and validation DataLoader for LEVIR-CC."""
    from torch.utils.data import DataLoader

    train_ds = LevirCCDataset(
        images_dir=images_dir,
        captions_path=captions_path,
        split="train",
        augment=True,
        max_samples=max_train_samples,
    )

    val_ds = LevirCCDataset(
        images_dir=images_dir,
        captions_path=captions_path,
        split="val",
        augment=False,
        max_samples=max_val_samples,
    )

    use_pin = torch.cuda.is_available()

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=use_pin,
        drop_last=True,
    )

    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=use_pin,
    )

    return train_loader, val_loader
