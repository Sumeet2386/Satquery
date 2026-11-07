"""
SatQuery AI — Phase 1 Model Evaluation Script
=============================================

Benchmarks candidate change-detection models against the LEVIR-CD dataset.
Run this script to produce the evidence needed to select the MVP model.

Usage:
    python ml/evaluation/benchmark.py \
        --data_dir ./ml/evaluation/data/LEVIR-CD \
        --output_dir ./ml/evaluation/results \
        --models changeformer bit snunet

Prerequisites:
    pip install torch torchvision rasterio geopandas numpy scikit-learn tqdm rich

LEVIR-CD dataset:
    Download from: https://chenhao.in/LEVIR/
    Expected structure:
        data/LEVIR-CD/
            test/
                A/   <- earlier images
                B/   <- later images
                label/ <- binary change masks (255=change, 0=no change)
"""

import argparse
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import numpy as np
    from sklearn.metrics import f1_score, jaccard_score, precision_score, recall_score
    from tqdm import tqdm
    from rich.console import Console
    from rich.table import Table
    DEPS_AVAILABLE = True
except ImportError:
    DEPS_AVAILABLE = False
    print("Install dependencies: pip install scikit-learn tqdm rich numpy")


console = Console() if DEPS_AVAILABLE else None


def load_binary_mask(path: str) -> "np.ndarray":
    """Load a PNG/TIF binary change mask as a flattened binary array (0/1)."""
    try:
        import rasterio
        with rasterio.open(path) as ds:
            mask = ds.read(1)
    except Exception:
        from PIL import Image
        mask = np.array(Image.open(path).convert("L"))

    return (mask > 127).astype(np.uint8).ravel()


def compute_metrics(
    gt_flat: "np.ndarray", pred_flat: "np.ndarray"
) -> Dict[str, float]:
    """Compute binary change detection metrics."""
    return {
        "f1":        round(float(f1_score(gt_flat, pred_flat, zero_division=0)), 4),
        "iou":       round(float(jaccard_score(gt_flat, pred_flat, zero_division=0)), 4),
        "precision": round(float(precision_score(gt_flat, pred_flat, zero_division=0)), 4),
        "recall":    round(float(recall_score(gt_flat, pred_flat, zero_division=0)), 4),
    }


def run_stub_evaluation(
    image_a_paths: List[Path],
    image_b_paths: List[Path],
    label_paths: List[Path],
    model_name: str,
) -> Dict:
    """
    Stub evaluation — uses a threshold of 0.5 on a zero mask.
    Replace with real model inference when model code is installed.
    
    WARNING: This produces trivial metrics and is only for pipeline validation.
    """
    all_gt, all_pred = [], []

    for lbl_path in tqdm(label_paths, desc=f"[STUB] {model_name}"):
        gt = load_binary_mask(str(lbl_path))
        # Stub: predict all zeros (no change)
        pred = np.zeros_like(gt)
        all_gt.append(gt)
        all_pred.append(pred)

    all_gt_flat = np.concatenate(all_gt)
    all_pred_flat = np.concatenate(all_pred)
    metrics = compute_metrics(all_gt_flat, all_pred_flat)
    metrics["note"] = "STUB — replace with real model inference"
    return metrics


def collect_image_paths(data_dir: Path) -> Tuple[List[Path], List[Path], List[Path]]:
    """Collect paired image and label paths from LEVIR-CD directory structure."""
    test_dir = data_dir / "test"
    a_dir = test_dir / "A"
    b_dir = test_dir / "B"
    label_dir = test_dir / "label"

    if not a_dir.exists():
        raise FileNotFoundError(
            f"LEVIR-CD test directory not found at {test_dir}. "
            "Download the dataset from https://chenhao.in/LEVIR/ "
            "and place it at ml/evaluation/data/LEVIR-CD/"
        )

    image_names = sorted(a_dir.glob("*.png"))
    a_paths = [a_dir / p.name for p in image_names]
    b_paths = [b_dir / p.name for p in image_names]
    label_paths = [label_dir / p.name for p in image_names]

    # Filter to only triples where all three files exist
    triples = [
        (a, b, l) for a, b, l in zip(a_paths, b_paths, label_paths)
        if a.exists() and b.exists() and l.exists()
    ]

    if not triples:
        raise FileNotFoundError(
            "No valid image triples found. "
            "Check that A/, B/, and label/ subdirectories all contain matching PNG files."
        )

    a_paths, b_paths, label_paths = zip(*triples)
    return list(a_paths), list(b_paths), list(label_paths)


def benchmark_model(
    model_name: str,
    a_paths: List[Path],
    b_paths: List[Path],
    label_paths: List[Path],
    device: str = "cpu",
) -> Dict:
    """Run full evaluation for one model. Returns metrics + timing."""
    print(f"\n→ Evaluating {model_name} on {len(label_paths)} image pairs...")

    start = time.perf_counter()

    # Try to load real model adapter
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))
        adapter_map = {
            "siamese_cd":   "core.inference.siamese_adapter.SiameseAdapter",
            "changeformer": "core.inference.changeformer_adapter.ChangeFormerAdapter",
            "bit":          "core.inference.bit_adapter.BITAdapter",
            "snunet":       "core.inference.snunet_adapter.SNUNetAdapter",
        }
        if model_name not in adapter_map:
            raise ImportError(f"No adapter registered for {model_name}")

        module_path, class_name = adapter_map[model_name].rsplit(".", 1)
        import importlib
        module = importlib.import_module(module_path)
        AdapterClass = getattr(module, class_name)
        adapter = AdapterClass()
        adapter.load(checkpoint_path="", config={"device": device})

        all_gt, all_pred = [], []
        import rasterio

        for a_path, b_path, lbl_path in tqdm(
            zip(a_paths, b_paths, label_paths), total=len(label_paths), desc=model_name
        ):
            with rasterio.open(str(a_path)) as ds_a:
                arr_a = ds_a.read().astype(np.float32) / 255.0
            with rasterio.open(str(b_path)) as ds_b:
                arr_b = ds_b.read().astype(np.float32) / 255.0

            inputs = adapter.preprocess(arr_a, arr_b)
            result = adapter.infer(inputs)

            # Threshold probability mask
            mask = (result.change_mask >= 0.5).astype(np.uint8).ravel()
            gt = load_binary_mask(str(lbl_path))
            all_gt.append(gt)
            all_pred.append(mask[:len(gt)])  # Align size if padded

        all_gt_flat = np.concatenate(all_gt)
        all_pred_flat = np.concatenate(all_pred)
        metrics = compute_metrics(all_gt_flat, all_pred_flat)

    except (ImportError, ModuleNotFoundError) as e:
        print(f"  ⚠ Real model not available ({e}). Running stub evaluation.")
        metrics = run_stub_evaluation(a_paths, b_paths, label_paths, model_name)

    elapsed = time.perf_counter() - start
    metrics["inference_time_total_s"] = round(elapsed, 2)
    metrics["inference_time_per_pair_s"] = round(elapsed / max(len(label_paths), 1), 3)
    metrics["n_pairs"] = len(label_paths)
    metrics["device"] = device
    return metrics


def print_results_table(results: Dict[str, Dict]) -> None:
    """Pretty-print results as a rich table."""
    table = Table(title="SatQuery AI — Phase 1 Model Benchmark Results", show_header=True)
    table.add_column("Model", style="bold cyan")
    table.add_column("F1 Score", justify="right", style="green")
    table.add_column("IoU", justify="right")
    table.add_column("Precision", justify="right")
    table.add_column("Recall", justify="right")
    table.add_column("Time/pair (s)", justify="right")
    table.add_column("Notes")

    for model_name, metrics in results.items():
        table.add_row(
            model_name,
            str(metrics.get("f1", "—")),
            str(metrics.get("iou", "—")),
            str(metrics.get("precision", "—")),
            str(metrics.get("recall", "—")),
            str(metrics.get("inference_time_per_pair_s", "—")),
            metrics.get("note", ""),
        )

    console.print(table)


def main():
    parser = argparse.ArgumentParser(description="SatQuery AI Phase 1 Model Benchmark")
    parser.add_argument("--data_dir",   default="./ml/evaluation/data/LEVIR-CD", help="Path to LEVIR-CD dataset")
    parser.add_argument("--output_dir", default="./ml/evaluation/results",        help="Where to save results JSON")
    parser.add_argument("--models",     nargs="+", default=["changeformer"],       help="Models to evaluate")
    parser.add_argument("--device",     default="cpu",                             help="cpu | cuda | mps")
    parser.add_argument("--max_pairs",  type=int, default=None,                   help="Limit to first N pairs (for quick tests)")
    args = parser.parse_args()

    if not DEPS_AVAILABLE:
        print("ERROR: Required packages not installed. Run:")
        print("  pip install scikit-learn tqdm rich numpy rasterio")
        return

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print("SatQuery AI — Phase 1 Model Feasibility Benchmark")
    print(f"{'='*60}")
    print(f"Data dir:   {data_dir}")
    print(f"Models:     {', '.join(args.models)}")
    print(f"Device:     {args.device}")

    try:
        a_paths, b_paths, label_paths = collect_image_paths(data_dir)
    except FileNotFoundError as e:
        print(f"\n⚠ {e}")
        print("\nTo test the benchmark pipeline without real data, run with --max_pairs 0")
        return

    if args.max_pairs:
        a_paths = a_paths[:args.max_pairs]
        b_paths = b_paths[:args.max_pairs]
        label_paths = label_paths[:args.max_pairs]

    print(f"Image pairs: {len(label_paths)}\n")

    all_results = {}
    for model_name in args.models:
        all_results[model_name] = benchmark_model(
            model_name, a_paths, b_paths, label_paths, device=args.device
        )

    # Print table
    print_results_table(all_results)

    # Save JSON
    output_file = output_dir / "benchmark_results.json"
    with open(output_file, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n✓ Results saved to {output_file}")

    # Recommendation
    if all_results:
        best_model = max(all_results, key=lambda m: all_results[m].get("f1", 0))
        best_f1 = all_results[best_model].get("f1", 0)
        if best_f1 > 0:
            print(f"\n🏆 Recommended model for MVP: {best_model} (F1={best_f1})")
        else:
            print("\n⚠ All models returned trivial metrics (stub mode). Install model code for real evaluation.")


if __name__ == "__main__":
    main()
