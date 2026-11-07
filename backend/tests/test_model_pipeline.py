"""Tests for change detection model registry, S2Looking integration, and inference pipeline."""

import os
import numpy as np
import pytest
from pathlib import Path

from core.inference.model_adapter import ModelRegistry
from core.inference.siamese_adapter import SiameseAdapter
from ml.dataset import ChangeDetectionDataset, get_dataloaders


def test_model_registry_contains_s2looking():
    registry_path = Path("ml/registry/models.json")
    assert registry_path.exists(), "models.json should exist"
    
    reg = ModelRegistry(str(registry_path))
    models = reg.list_models()
    assert "s2looking_cd" in models, "s2looking_cd must be registered"
    
    cfg = reg.get_model_config("s2looking_cd")
    assert cfg["name"] == "Siamese-CD (S2Looking Off-Nadir)"
    assert cfg["evaluation"]["dataset"] == "S2Looking"
    assert cfg["evaluation"]["iou"] is not None


def test_s2looking_checkpoint_exists():
    ckpt_path = Path("ml/model_cache/s2looking_cd/best_s2looking_cd.pth")
    assert ckpt_path.exists(), "Trained S2Looking checkpoint must exist"
    assert ckpt_path.stat().st_size > 10_000_000, "Checkpoint file should be > 10MB"


def test_siamese_adapter_loads_and_infers():
    ckpt_path = "ml/model_cache/s2looking_cd/best_s2looking_cd.pth"
    adapter = SiameseAdapter()
    adapter.load(checkpoint_path=ckpt_path)
    
    assert adapter.is_loaded is True
    info = adapter.model_info()
    assert "S2Looking" in info.model_name
    
    # Run test inference with random 256x256 image pair
    img_a = np.random.randint(0, 255, (3, 256, 256), dtype=np.uint8)
    img_b = np.random.randint(0, 255, (3, 256, 256), dtype=np.uint8)
    
    inputs = adapter.preprocess(img_a, img_b)
    assert "tensor_a" in inputs
    assert "tensor_b" in inputs
    
    result = adapter.infer(inputs)
    assert result.change_mask.shape == (256, 256)
    assert result.is_probability is True
    assert 0.0 <= result.confidence_mean <= 1.0


def test_s2looking_dataset_loader():
    train_dir = Path("ml/data/S2Looking/train")
    if train_dir.exists():
        ds = ChangeDetectionDataset(
            data_dir=train_dir,
            patch_size=256,
            split="train",
            max_samples=2,
        )
        assert len(ds) == 32  # 2 samples * 16 patches
        tensor_a, tensor_b, tensor_l, meta = ds[0]
        assert tensor_a.shape == (3, 256, 256)
        assert tensor_b.shape == (3, 256, 256)
        assert tensor_l.shape == (1, 256, 256)
