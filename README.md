# SatQuery AI

> Agentic multimodal satellite-image analysis platform — Phase 1 MVP

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)](https://fastapi.tiangolo.com)
[![Licence](https://img.shields.io/badge/licence-proprietary-red)]()

---

## What is SatQuery AI?

SatQuery AI is an **evidence-backed satellite image analysis platform**. Users upload two satellite images, ask a question in natural language, and receive:

- A georeferenced **change map**
- A written **explanation** citing actual model output
- **Confidence scores** and known limitations
- A downloadable **report** with full provenance

**Current scope:** Two-image change detection using ChangeFormer, BIT, or SNUNet — all pre-trained on LEVIR-CD.

---

## Project Structure

```
satquery-ai/
├── frontend/           Next.js 14 web application
├── backend/            FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/     REST endpoints (auth, uploads, analyses, results)
│   │   ├── core/       Config, database, security, logging
│   │   ├── models/     SQLAlchemy ORM models
│   │   └── services/   Data access layer
│   ├── core/           Business logic (validation, preprocessing, inference)
│   ├── services/       Orchestration layer
│   └── tests/          Pytest test suite
├── ml/
│   ├── registry/       Model catalogue (models.json)
│   ├── evaluation/     Phase 1 benchmarking scripts
│   └── model_cache/    Downloaded model weights (gitignored)
├── infra/              Docker Compose configuration
└── storage/            Uploaded files (gitignored)
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18
- Python 3.11
- PostgreSQL 15 + PostGIS (or Docker)

### 1. Clone and install

```bash
git clone <repo-url>
cd satquery-ai
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### 3. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and edit environment file
cp .env.example .env

# Run database migrations (requires PostgreSQL)
# alembic upgrade head

# Start the API server
uvicorn main:app --reload
# → http://localhost:8000
# → API docs: http://localhost:8000/api/docs
```

### 4. Or use Docker Compose (full stack)

```bash
cd infra
docker compose up
# → Frontend: http://localhost:3000
# → Backend:  http://localhost:8000
# → MinIO:    http://localhost:9001 (minioadmin / minioadmin)
```

---

## Phase 1: Model Evaluation

Before using real models, run the benchmark to select the best one:

```bash
# Download LEVIR-CD dataset to ml/evaluation/data/LEVIR-CD/
# https://chenhao.in/LEVIR/

python ml/evaluation/benchmark.py \
    --data_dir ./ml/evaluation/data/LEVIR-CD \
    --models changeformer bit snunet \
    --device cpu
```

This outputs F1, IoU, precision, recall, and inference time per model.

---

## Model Training & S2Looking Support

SatQuery AI supports training and fine-tuning on bi-temporal satellite datasets including **S2Looking** (side-looking building change detection) and **LEVIR-CD**:

```bash
# Train Siamese-CD on S2Looking dataset (Apple Silicon MPS / CUDA / CPU)
python ml/train.py \
    --data_dir ./ml/data/S2Looking \
    --output_dir ./ml/model_cache/s2looking_cd \
    --epochs 5 \
    --batch_size 16 \
    --lr 3e-4 \
    --device auto
```

Trained checkpoints are automatically saved to `ml/model_cache/s2looking_cd/best_s2looking_cd.pth` and registered in `ml/registry/models.json`.

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest

# With coverage report
pytest --cov=app --cov-report=html
```

---

## API Reference

When running locally, interactive API docs are at:
- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

### Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/auth/register` | Create account |
| `POST` | `/api/v1/auth/login` | Get JWT tokens |
| `POST` | `/api/v1/uploads` | Upload satellite image |
| `POST` | `/api/v1/analyses` | Start change-detection job |
| `GET`  | `/api/v1/analyses/{id}` | Poll job status + results |
| `GET`  | `/api/v1/results/{id}/map` | GeoJSON change layer |
| `GET`  | `/api/v1/results/{id}/report` | Download report |
| `GET`  | `/api/health` | Health check |

---

## Engineering Principles

1. **Real inference always** — no mocked results in demos or evaluations
2. **Geospatial correctness first** — CRS, alignment, and bounds validated before inference
3. **Evidence before explanation** — LLM only explains what the model found
4. **Components replaceable** — model, storage, and inference provider are swappable
5. **Reuse before training** — pretrained models evaluated first; fine-tuning only when justified

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python 3.11, FastAPI, SQLAlchemy |
| ML | PyTorch, HuggingFace, ChangeFormer/BIT/SNUNet |
| Raster | Rasterio, GDAL, NumPy |
| Geospatial | GeoPandas, Shapely, pyproj |
| Database | PostgreSQL 15 + PostGIS |
| Storage | S3-compatible (MinIO local / AWS S3 cloud) |
| Auth | JWT (python-jose) + bcrypt |
| Tests | Pytest + HTTPX + SQLite in-memory |

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Model feasibility + selection | 🔄 Active |
| 2 | Geospatial data foundation | ⏳ Planned |
| 3 | Real AI inference pipeline | ⏳ Planned |
| 4 | User-facing MVP | ⏳ Planned |
| 5 | Verification + pilot readiness | ⏳ Planned |
| 6 | Customer validation + expansion | ⏳ Planned |

---

## Licence

Proprietary — SatQuery AI. All rights reserved.

Model licences:
- ChangeFormer: [MIT](https://github.com/wgcban/ChangeFormer/blob/main/LICENSE)
- BIT: [Apache-2.0](https://github.com/justchenhao/BIT_CD/blob/master/LICENSE)
- SNUNet: [MIT](https://github.com/RSCD-Lab/Siam-NestedUNet/blob/master/LICENSE)
