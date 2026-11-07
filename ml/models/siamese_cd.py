"""SatQuery AI — Siamese Change Detection Network Architecture (Siamese-CD).

Dual-branch Siamese encoder with differential feature fusion, multi-scale decoder,
and LEVIR-CC semantic change classification head for precise labeling of post-event changes.
"""

from __future__ import annotations

from typing import List, Tuple, Optional, Union

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    class _DummyModule:
        pass
    nn = type("nn", (), {"Module": _DummyModule})()


LEVIR_CC_CLASSES = [
    "No Change / Identical Scene",
    "Residential Housing & Houses",
    "Road & Corridor Infrastructure",
    "Building Construction & Additions",
    "Land Clearing & Foundation Grading",
]


class ConvBlock(nn.Module):
    """Convolution + BatchNorm + GELU block."""
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.GELU(),
            nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.GELU(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


class DifferentialFusion(nn.Module):
    """
    Differential and Cross-Temporal Feature Fusion block.
    Computes absolute difference and concatenated contextual features.
    """
    def __init__(self, channels: int):
        super().__init__()
        # Input has: f1, f2, and |f1 - f2| => 3 * channels
        self.fusion = nn.Sequential(
            nn.Conv2d(channels * 3, channels, kernel_size=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.GELU(),
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.GELU(),
        )

    def forward(self, f1: torch.Tensor, f2: torch.Tensor) -> torch.Tensor:
        diff = torch.abs(f1 - f2)
        combined = torch.cat([f1, f2, diff], dim=1)
        return self.fusion(combined)


class DecoderBlock(nn.Module):
    """Upsampling decoder block with skip-connection fusion."""
    def __init__(self, in_ch: int, skip_ch: int, out_ch: int):
        super().__init__()
        self.up = nn.Upsample(scale_factor=2, mode="bilinear", align_corners=True)
        self.conv = ConvBlock(in_ch + skip_ch, out_ch)

    def forward(self, x: torch.Tensor, skip: torch.Tensor) -> torch.Tensor:
        x = self.up(x)
        # Handle small spatial padding mismatches if needed
        if x.shape[2:] != skip.shape[2:]:
            x = F.interpolate(x, size=skip.shape[2:], mode="bilinear", align_corners=True)
        out = torch.cat([x, skip], dim=1)
        return self.conv(out)


class SiameseChangeDetector(nn.Module):
    """
    Siamese Multiscale Change Detection & Semantic Labeling Network.
    
    Architecture:
      1. Dual-stream shared-weight encoder extracting features at 4 resolutions:
         - stage 1: 1/1 (64 channels)
         - stage 2: 1/2 (128 channels)
         - stage 3: 1/4 (256 channels)
         - stage 4: 1/8 (512 channels)
      2. Multi-scale Differential Fusion at each hierarchy level.
      3. U-Net style decoder synthesizing change boundaries with skip connections.
      4. Single-channel logit output for binary change probability mask.
      5. Semantic Change Classification Head trained on LEVIR-CC vocabulary to
         accurately identify and label what specific physical changes occurred in T2.
    """

    def __init__(self, in_channels: int = 3, base_channels: int = 64, num_classes: int = 5):
        super().__init__()
        self.num_classes = num_classes

        # ── Siamese Encoder (Shared Weights) ──────────────────────────────
        self.enc1 = ConvBlock(in_channels, base_channels)
        self.pool1 = nn.MaxPool2d(2)

        self.enc2 = ConvBlock(base_channels, base_channels * 2)
        self.pool2 = nn.MaxPool2d(2)

        self.enc3 = ConvBlock(base_channels * 2, base_channels * 4)
        self.pool3 = nn.MaxPool2d(2)

        self.enc4 = ConvBlock(base_channels * 4, base_channels * 8)

        # ── Differential Fusion at each scale ─────────────────────────────
        self.fuse1 = DifferentialFusion(base_channels)
        self.fuse2 = DifferentialFusion(base_channels * 2)
        self.fuse3 = DifferentialFusion(base_channels * 4)
        self.fuse4 = DifferentialFusion(base_channels * 8)

        # ── Decoder with Skip Connections ─────────────────────────────────
        self.dec3 = DecoderBlock(base_channels * 8, base_channels * 4, base_channels * 4)
        self.dec2 = DecoderBlock(base_channels * 4, base_channels * 2, base_channels * 2)
        self.dec1 = DecoderBlock(base_channels * 2, base_channels, base_channels)

        # ── Pixel Change Mask Head ────────────────────────────────────────
        self.head = nn.Sequential(
            nn.Conv2d(base_channels, base_channels // 2, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(base_channels // 2),
            nn.GELU(),
            nn.Conv2d(base_channels // 2, 1, kernel_size=1),
        )

        # ── LEVIR-CC Semantic Change Classification Head ───────────────────
        self.cls_head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(base_channels * 8, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.25),
            nn.Linear(128, num_classes),
        )

    def forward_encoder(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Pass single image through shared encoder stream."""
        c1 = self.enc1(x)
        p1 = self.pool1(c1)

        c2 = self.enc2(p1)
        p2 = self.pool2(c2)

        c3 = self.enc3(p2)
        p3 = self.pool3(c3)

        c4 = self.enc4(p3)
        return c1, c2, c3, c4

    def forward(
        self,
        img_a: torch.Tensor,
        img_b: torch.Tensor,
        return_class: bool = False
    ) -> Union[torch.Tensor, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Forward pass.
        Args:
            img_a: [B, 3, H, W] - Satellite image at time T1 (Pre-Event)
            img_b: [B, 3, H, W] - Satellite image at time T2 (Post-Event)
            return_class: If True, returns (mask_logits, cls_logits)
        Returns:
            mask_logits: [B, 1, H, W] - Raw logits for change mask
            cls_logits (optional): [B, num_classes] - Semantic change type classification logits
        """
        # 1. Siamese feature extraction
        a1, a2, a3, a4 = self.forward_encoder(img_a)
        b1, b2, b3, b4 = self.forward_encoder(img_b)

        # 2. Differential fusion across scale pyramid
        f4 = self.fuse4(a4, b4)
        f3 = self.fuse3(a3, b3)
        f2 = self.fuse2(a2, b2)
        f1 = self.fuse1(a1, b1)

        # 3. Decode & upsample
        d3 = self.dec3(f4, f3)
        d2 = self.dec2(d3, f2)
        d1 = self.dec1(d2, f1)

        # 4. Pixel-level change logits
        mask_logits = self.head(d1)

        # 5. Semantic change classification (LEVIR-CC)
        if return_class:
            cls_logits = self.cls_head(f4)
            return mask_logits, cls_logits

        return mask_logits
